"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/services/messageService";

type Handler = (msg: Message) => void;

/**
 * Connects to the /messages socket.io namespace on the institute service.
 * Authenticates via JWT token in the handshake auth object.
 *
 * onNewMessage  — fires when someone sends you a message
 * onMessageSent — fires when your own sent message is confirmed (multi-tab sync)
 */
export function useMessageSocket(
  token: string | null,
  onNewMessage: Handler,
  onMessageSent?: Handler,
) {
  const onNewRef = useRef(onNewMessage);
  const onSentRef = useRef(onMessageSent);

  // Keep refs up-to-date without causing reconnects
  useEffect(() => { onNewRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onSentRef.current = onMessageSent; }, [onMessageSent]);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;

    // Direct connection to institute service (bypasses the HTTP proxy gateway)
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001").replace(":5001", ":5003");

    const socket: Socket = io(`${wsUrl}/messages`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on("new_message", (msg: Message) => onNewRef.current(msg));
    socket.on("message_sent", (msg: Message) => onSentRef.current?.(msg));
    socket.on("connect_error", (err) =>
      console.warn("[MessageSocket] connect error:", err.message)
    );

    return () => { socket.disconnect(); };
  }, [token]);
}
