"use client";
import { useEffect, useRef } from "react";
import { Message } from "@/services/messageService";

type MessageHandler = (message: Message) => void;

/**
 * Opens a Server-Sent Events connection to /messages/stream.
 * No external packages required — uses the native browser EventSource API.
 *
 * onNewMessage  — called when someone sends you a message
 * onMessageSent — called when your own message is confirmed delivered (multi-tab sync)
 */
export function useMessageStream(
  instituteId: string | null,
  token: string | null,
  onNewMessage: MessageHandler,
  onMessageSent?: MessageHandler
) {
  const onNewRef = useRef(onNewMessage);
  const onSentRef = useRef(onMessageSent);

  useEffect(() => { onNewRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onSentRef.current = onMessageSent; }, [onMessageSent]);

  useEffect(() => {
    if (!instituteId || !token || typeof window === "undefined") return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    // SSE goes through the API gateway (same as all other requests)
    const url = `${apiUrl}/api/institutes/institutes/${instituteId}/messages/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Message & { type?: string };
        if (data.type === "new_message") {
          onNewRef.current(data);
        } else if (data.type === "message_sent") {
          onSentRef.current?.(data);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error — no manual handling needed
    };

    return () => {
      es.close();
    };
  }, [instituteId, token]);
}
