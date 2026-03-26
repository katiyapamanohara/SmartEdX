"""WebSocket handler — browser-based bidirectional audio/text streaming."""

import asyncio
import base64
import json
import logging
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.adk.run_config_factory import build_run_config
from app.adk.session_manager import ADKSessionManager
from app.agent.audio_clips import (
    make_websocket_audio_event,
    register_session_audio_queue,
    unregister_session_audio_queue,
)
from app.agent import get_runner_for_institute
from app.config import APP_NAME, AUDIO_CLIP_TOOL_MAP
from app.latency import latency
from app.observability.langfuse_client import observe_decorator, update_trace

logger = logging.getLogger(__name__)


@observe_decorator(name="Voice Agent Execution", as_type="generation")
async def websocket_endpoint(
    websocket: WebSocket,
    institute_id: str,
    user_id: str,
    session_id: str,
    session_service: InMemorySessionService,
    transcript_store: dict,
    *,
    proactivity: bool = False,
    affective_dialog: bool = False,
    language: Optional[str] = None,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK."""
    await websocket.accept()

    # Resolve runner and greeting for this institute (cached after first call)
    runner, greeting_message = get_runner_for_institute(institute_id, session_service)

    model_name = runner.agent.model
    run_config = build_run_config(model_name, proactivity=proactivity, affective_dialog=affective_dialog)

    # Langfuse trace
    update_trace(
        tags=["voice-agent", "websocket", model_name, f"institute:{institute_id}"],
        metadata={
            "proactivity": proactivity,
            "affective_dialog": affective_dialog,
            "response_modalities": run_config.response_modalities,
            "model": model_name,
            "institute_id": institute_id,
            "user_id": user_id,
            "session_id": session_id,
        },
    )

    # Shared session lifecycle
    mgr = ADKSessionManager(
        runner=runner,
        session_service=session_service,
        transcript_store=transcript_store,
        user_id=user_id,
        session_id=session_id,
        institute_id=institute_id,
        greeting_message=greeting_message,
        is_sip=False,
        language=language,
    )
    live_request_queue = await mgr.initialize()
    t_first_response = latency.start_timer()
    first_response_recorded = False

    # Register audio clip queue for this session (no-op overhead if map is empty)
    audio_clip_queue = register_session_audio_queue(session_id) if AUDIO_CLIP_TOOL_MAP else None

    # ── Concurrent upstream / downstream tasks ──────────────────────

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        while True:
            try:
                message = await websocket.receive()
            except RuntimeError:
                break

            if "bytes" in message:
                audio_blob = types.Blob(mime_type="audio/pcm;rate=16000", data=message["bytes"])
                live_request_queue.send_realtime(audio_blob)

            elif "text" in message:
                json_message = json.loads(message["text"])

                if json_message.get("type") == "text":
                    user_text = json_message["text"]
                    content = types.Content(parts=[types.Part(text=user_text)])
                    live_request_queue.send_content(content)
                    mgr.transcript_handler.record_message("user", user_text)
                    mgr.transcript_handler.resume_agent_output()

                elif json_message.get("type") == "assessment_init":
                    # Student is starting a voice assessment — inject questions into session
                    data = json_message.get("data", {})
                    questions = data.get("questions", [])
                    title = data.get("title", "Voice Assessment")
                    instructions = data.get("instructions", "")

                    # Store questions in ADK session state for the evaluation tool
                    session = await session_service.get_session(
                        app_name=APP_NAME, user_id=user_id, session_id=session_id
                    )
                    if session:
                        import google.adk.events as adk_events
                        state_event = adk_events.Event(
                            author=user_id,
                            actions=adk_events.EventActions(state_delta={"assessment_questions": questions}),
                        )
                        await session_service.append_event(session, state_event)

                    # Build numbered question list for the agent
                    q_lines = "\n".join(
                        f"{i+1}. [{q['id']}] {q['question']} (max {q.get('marks', 10)} marks)"
                        for i, q in enumerate(questions)
                    )
                    init_prompt = (
                        f"VOICE ASSESSMENT SESSION\n"
                        f"Title: {title}\n"
                        f"{('Instructions: ' + instructions + chr(10)) if instructions else ''}"
                        f"\nYou must ask the student these {len(questions)} questions ONE BY ONE:\n{q_lines}\n\n"
                        f"Rules:\n"
                        f"1. Welcome the student and briefly explain the assessment.\n"
                        f"2. Ask Question 1, then wait for the student to answer.\n"
                        f"3. Acknowledge the answer briefly (e.g. 'Thank you') then ask the next question.\n"
                        f"4. Do NOT give hints, corrections, or reveal the expected answers during the interview.\n"
                        f"5. After collecting ALL {len(questions)} answers, call evaluate_voice_assessment with:\n"
                        f'   {{"questions": [{{the full question objects as listed above, including expected_answer and marks}}], '
                        f'"student_answers": [{{"question_id": "q1", "answer": "their answer"}}, ...]}}\n'
                        f"6. Once evaluate_voice_assessment returns, announce the student's total score, grade, and overall feedback.\n\n"
                        f"The full question data (including expected_answer and marks) for the evaluation tool:\n"
                        f"{json.dumps(questions)}\n\n"
                        f"Begin now by welcoming the student."
                    )
                    init_content = types.Content(parts=[types.Part(text=init_prompt)], role="user")
                    live_request_queue.send_content(init_content)
                    logger.info(f"WS {session_id}: assessment_init sent ({len(questions)} questions, title='{title}')")

                elif json_message.get("type") == "image":
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

    async def downstream_task() -> None:
        """Receives events from run_live() and sends to WebSocket."""
        nonlocal first_response_recorded
        # When an audio clip tool call is in flight, suppress model audio so the
        # model cannot speak filler ("let me check") over or after the clip.
        suppress_model_audio = False
        try:
            async for event in runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                if not first_response_recorded:
                    latency.stop_timer("first_response", t_first_response, session_id)
                    first_response_recorded = True

                event_json = event.model_dump_json(exclude_none=True, by_alias=True)

                if AUDIO_CLIP_TOOL_MAP:
                    try:
                        evt = json.loads(event_json)
                        parts = (evt.get("content") or {}).get("parts") or []
                        # Start suppressing when the model calls an audio clip tool
                        if any((p.get("functionCall") or {}).get("name") in AUDIO_CLIP_TOOL_MAP for p in parts):
                            suppress_model_audio = True
                            logger.debug(f"WS {session_id}: audio clip tool call detected — suppressing model audio")
                        # Stop suppressing at end of model turn
                        if suppress_model_audio and evt.get("usageMetadata"):
                            suppress_model_audio = False
                            logger.debug(f"WS {session_id}: turn complete — model audio suppression lifted")
                        # Strip inlineData (model speech) while suppression is active
                        if suppress_model_audio:
                            filtered = [p for p in parts if "inlineData" not in p]
                            if len(filtered) != len(parts):
                                if evt.get("content"):
                                    evt["content"]["parts"] = filtered
                                event_json = json.dumps(evt)
                    except Exception:
                        pass

                has_audio = '"inlineData"' in event_json
                has_text = '"text"' in event_json
                has_usage = '"usageMetadata"' in event_json
                if has_audio:
                    logger.info(f"WS {session_id}: sending audio event ({len(event_json)} bytes)")
                elif has_text:
                    logger.info(f"WS {session_id}: sending text event")
                elif has_usage:
                    logger.info(f"WS {session_id}: sending usageMetadata event")
                else:
                    logger.debug(f"WS {session_id}: sending other event keys={list(json.loads(event_json).keys())}")

                await websocket.send_text(event_json)

                if not has_audio or has_text:
                    mgr.transcript_handler.process_event(event_json)
        except Exception as e:
            logger.warning(f"WS {session_id}: Gemini live connection ended: {e}")
            try:
                await websocket.send_json({"type": "disconnect", "reason": str(e)})
            except Exception:
                logger.debug(f"WS {session_id}: could not send disconnect signal (socket already closed)")

    async def audio_clip_injection_task() -> None:
        """Drains the audio clip queue and sends each clip to the WebSocket."""
        assert audio_clip_queue is not None
        while True:
            try:
                pcm_bytes = await asyncio.wait_for(audio_clip_queue.get(), timeout=0.5)
                event_json = make_websocket_audio_event(pcm_bytes)
                await websocket.send_text(event_json)
                logger.debug(f"WS {session_id}: injected audio clip ({len(pcm_bytes)} bytes)")
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.debug(f"WS {session_id}: audio injection task ended: {e}")
                break

    tasks = [upstream_task(), downstream_task()]
    if audio_clip_queue is not None:
        tasks.append(audio_clip_injection_task())

    try:
        await asyncio.gather(*tasks)
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
    finally:
        if audio_clip_queue is not None:
            unregister_session_audio_queue(session_id)
        await mgr.finalize()
