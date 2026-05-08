"""WebSocket handler — browser-based bidirectional audio/text streaming."""

import asyncio
import base64
import json
import logging
from typing import Any, Optional

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
    runner: Optional[Any] = None,
    proactivity: bool = False,
    affective_dialog: bool = False,
    language: Optional[str] = None,
    greet: bool = True,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK.

    Args:
        runner: Pre-built ADK Runner.  When ``None`` (default) the institute
                runner is resolved via ``get_runner_for_institute``.  Pass an
                explicit runner to use a course-scoped or custom agent.
    """
    await websocket.accept()

    # Resolve runner — callers may inject a course-specific runner
    if runner is None:
        runner, _ = get_runner_for_institute(institute_id, session_service)

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
        is_sip=False,
        language=language,
    )
    live_request_queue = await mgr.initialize()
    t_first_response = latency.start_timer()
    first_response_recorded = False

    # Kick off the model's greeting immediately — without this, native-audio
    # models wait silently for user speech before saying anything.
    # Suppressed for assessment sessions which send their own init prompt.
    if greet:
        if mgr.has_prior_memory:
            # Returning user — skip intro, pick up where we left off
            greeting_trigger = types.Content(
                parts=[types.Part(text=(
                    "[SESSION RESUMED] The user is back. Greet them briefly by acknowledging you remember "
                    "your conversation, then ask how you can help. One sentence only."
                ))],
                role="user",
            )
        else:
            greeting_trigger = types.Content(
                parts=[types.Part(text=(
                    "[SESSION START] Live voice call. Be natural, warm, and brief.\n"
                    "Greet in ONE short sentence. Then stop and wait for the user to speak."
                ))],
                role="user",
            )
        live_request_queue.send_content(greeting_trigger)

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
                        f"\nYou must cover these {len(questions)} questions in order:\n{q_lines}\n\n"
                        f"=== CONVERSATION STYLE (follow strictly) ===\n"
                        f"- Be warm, natural, and encouraging — like a supportive teacher, not a robot reading a script.\n"
                        f"- Keep YOUR speaking turns SHORT: 1-2 sentences when asking questions or acknowledging answers.\n"
                        f"- After asking a question, STOP SPEAKING and wait silently for the student's answer.\n"
                        f"  Do NOT repeat or rephrase the question unless the student explicitly asks.\n"
                        f"- If the student INTERRUPTS you while you are speaking, stop immediately and listen.\n"
                        f"  Acknowledge what they said naturally, then continue toward the next unanswered question.\n"
                        f"- If the student goes OFF-TOPIC or asks something unrelated, reply briefly (1 sentence) and\n"
                        f"  redirect: 'Good question! Let's keep going — [rephrase the current question concisely].'\n"
                        f"- If the student says they don't know or is clearly stuck, give ONE gentle hint\n"
                        f"  (e.g. 'Think about how X relates to Y…') WITHOUT revealing the expected answer.\n"
                        f"- If the student gives a partial answer, accept it and move on — do NOT coach them to expand.\n"
                        f"- Never reveal expected answers or scores during the interview.\n"
                        f"- Track which questions have been answered (even briefly) and always progress forward.\n"
                        f"  If a student already answered Q2 while answering Q1, skip Q2 and go straight to Q3.\n\n"
                        f"=== FLOW ===\n"
                        f"1. Welcome the student warmly in 1-2 sentences and tell them how many questions there are.\n"
                        f"2. Ask Question 1. Wait. Acknowledge briefly. Ask Question 2. Continue until all {len(questions)} are done.\n"
                        f"3. Once ALL {len(questions)} questions have been answered (however briefly), IMMEDIATELY call\n"
                        f"   evaluate_voice_assessment with the exact JSON below — no extra commentary before the tool call:\n"
                        f'   {{"questions": <full question objects>, "student_answers": [{{"question_id": "...", "answer": "..."}}]}}\n'
                        f"4. After evaluate_voice_assessment returns, announce the score and grade conversationally\n"
                        f"   (e.g. 'Great effort! You scored X out of Y — that's a [grade].'), then read the overall feedback.\n"
                        f"5. After announcing the result, say a brief goodbye and call end_call.\n\n"
                        f"=== EARLY EXIT ===\n"
                        f"If the student says they want to leave, stop, end early, or skip the rest:\n"
                        f"- Do NOT argue or try to continue.\n"
                        f"- Immediately call evaluate_voice_assessment with ALL questions and whatever answers were collected.\n"
                        f"  For any question the student did not answer, use an empty string as the answer.\n"
                        f"- After the result, say a brief goodbye and call end_call.\n\n"
                        f"Full question data for the evaluation tool:\n"
                        f"{json.dumps(questions)}\n\n"
                        f"Begin now — welcome the student."
                    )
                    init_content = types.Content(parts=[types.Part(text=init_prompt)], role="user")
                    live_request_queue.send_content(init_content)
                    logger.info(f"WS {session_id}: assessment_init sent ({len(questions)} questions, title='{title}')")

                elif json_message.get("type") == "end_assessment":
                    # Student chose to end the assessment early from the UI —
                    # prompt the agent to evaluate whatever partial answers it has.
                    end_prompt = (
                        "EARLY SESSION END: The student has chosen to stop the assessment now.\n"
                        "Do NOT speak before acting. IMMEDIATELY call evaluate_voice_assessment with:\n"
                        "  - questions: the full question objects from this session\n"
                        "  - student_answers: every answer collected so far. "
                        "For any question the student did not answer, include it with an empty string answer.\n"
                        "After the tool returns, announce the score and grade in one sentence, "
                        "say a brief goodbye, then call end_call."
                    )
                    end_content = types.Content(parts=[types.Part(text=end_prompt)], role="user")
                    live_request_queue.send_content(end_content)
                    logger.info(f"WS {session_id}: end_assessment early-exit signal sent")

                elif json_message.get("type") == "image":
                    # Screen frame sent by client — feed directly into Gemini Live as realtime vision
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)
                    logger.debug(f"WS {session_id}: screen frame received ({len(image_data)} bytes, {mime_type})")

                elif json_message.get("type") == "screen_share_start":
                    # Student started screen sharing — inject context note for the AI
                    ctx = types.Content(
                        parts=[types.Part(text="[The student has started sharing their screen. You can now see their screen in the video frames being sent. Use this visual context to better assist them.]")],
                        role="user",
                    )
                    live_request_queue.send_content(ctx)
                    logger.info(f"WS {session_id}: screen share started")

                elif json_message.get("type") == "screen_share_stop":
                    ctx = types.Content(
                        parts=[types.Part(text="[The student has stopped sharing their screen.]")],
                        role="user",
                    )
                    live_request_queue.send_content(ctx)
                    logger.info(f"WS {session_id}: screen share stopped")

    async def downstream_task() -> None:
        """Receives events from run_live() and sends to WebSocket."""

        nonlocal first_response_recorded
        suppress_model_audio = False

        reminder_task = None
        reminder_timeout_sec = 20

        async def send_reminder_after_timeout():
            try:
                await asyncio.sleep(reminder_timeout_sec)
                reminder_msg = json.dumps({
                    "content": {"parts": [{"text": "Are you there? Please answer the question when you're ready."}]},
                    "author": "system",
                    "type": "reminder"
                })
                await websocket.send_text(reminder_msg)
                logger.info(f"WS {session_id}: reminder sent to student after timeout")
            except asyncio.CancelledError:
                pass

        def cancel_reminder():
            nonlocal reminder_task
            if reminder_task and not reminder_task.done():
                reminder_task.cancel()
            reminder_task = None

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

                # Build dict once — avoids model_dump_json() + json.loads() round-trip.
                # event_json is produced once at the send point.
                evt = event.model_dump(exclude_none=True, by_alias=True)

                if AUDIO_CLIP_TOOL_MAP:
                    try:
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
                            content = evt.get("content")
                            if content:
                                content["parts"] = [p for p in content.get("parts", []) if "inlineData" not in p]
                    except Exception:
                        pass

                _parts = (evt.get("content") or {}).get("parts") or []
                has_audio = any("inlineData" in p for p in _parts)
                has_text = (
                    any("text" in p for p in _parts)
                    or "inputTranscription" in evt
                    or "outputTranscription" in evt
                    or "turnComplete" in evt
                    or "interrupted" in evt
                )
                has_usage = "usageMetadata" in evt

                # ── Log model reasoning (thought parts) ──────────────────
                try:
                    parts = (evt.get("content") or {}).get("parts") or []
                    for p in parts:
                        if p.get("thought"):
                            thought_text = (p.get("text") or "")[:400]
                            logger.info(f"[Reasoning] {thought_text!r}")
                        fc = p.get("functionCall")
                        if fc:
                            logger.info(f"[ToolCall] {fc.get('name')} args={fc.get('args')}")
                        fr = p.get("functionResponse")
                        if fr:
                            resp_preview = str(fr.get("response", ""))[:300]
                            logger.info(f"[ToolResponse] {fr.get('name')} → {resp_preview}")
                    if has_usage:
                        usage = evt.get("usageMetadata", {})
                        logger.info(
                            f"[Tokens] prompt={usage.get('promptTokenCount')} "
                            f"thoughts={usage.get('thoughtsTokenCount')} "
                            f"candidates={usage.get('candidatesTokenCount')} "
                            f"total={usage.get('totalTokenCount')}"
                        )
                except Exception:
                    pass

                # --- Reminder logic (reuses already-parsed evt) ---
                try:
                    author = evt.get("author")
                    parts = (evt.get("content") or {}).get("parts") or []
                    if author in ("agent", "bot") and any(p.get("text") for p in parts):
                        cancel_reminder()
                        reminder_task = asyncio.create_task(send_reminder_after_timeout())
                    elif author == "user":
                        cancel_reminder()
                except Exception:
                    pass
                # --- End reminder logic ---

                if has_audio:
                    logger.debug(f"WS {session_id}: sending audio event")
                elif has_text:
                    logger.info(f"WS {session_id}: sending text event")
                elif has_usage:
                    logger.info(f"WS {session_id}: sending usageMetadata event")
                else:
                    logger.debug(f"WS {session_id}: sending other event keys={list(evt.keys())}")

                # Serialize once here — dict was built (and possibly modified) above.
                event_json = json.dumps(evt)
                await websocket.send_text(event_json)

                if not has_audio or has_text:
                    mgr.transcript_handler.process_event(evt)
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

    all_tasks = [
        asyncio.create_task(upstream_task()),
        asyncio.create_task(downstream_task()),
    ]
    if audio_clip_queue is not None:
        all_tasks.append(asyncio.create_task(audio_clip_injection_task()))

    try:
        # Stop all tasks as soon as any one finishes (e.g. Gemini connection drops)
        done, pending = await asyncio.wait(all_tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        for t in done:
            if not t.cancelled():
                exc = t.exception()
                if exc is not None and not isinstance(exc, WebSocketDisconnect):
                    raise exc
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
    finally:
        for t in all_tasks:
            if not t.done():
                t.cancel()
        await asyncio.gather(*all_tasks, return_exceptions=True)
        if audio_clip_queue is not None:
            unregister_session_audio_queue(session_id)
        await mgr.finalize()
