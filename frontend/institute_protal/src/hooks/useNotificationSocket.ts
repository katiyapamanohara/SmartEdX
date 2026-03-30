"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Notification } from "@/services/notificationService";

type Handler = (notification: Notification) => void;

/**
 * Connects to the /notifications socket.io namespace on the institute service.
 * Authenticates via JWT token in the handshake auth object.
 *
 * onNewNotification — fires when a new notification arrives in real-time.
 */
export function useNotificationSocket(
  token: string | null,
  onNewNotification: Handler,
) {
  const handlerRef = useRef(onNewNotification);
  useEffect(() => { handlerRef.current = onNewNotification; }, [onNewNotification]);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001").replace(":5001", ":5003");

    const socket: Socket = io(`${wsUrl}/notifications`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on("new_notification", (notif: Notification) => handlerRef.current(notif));
    socket.on("connect_error", (err) =>
      console.warn("[NotificationSocket] connect error:", err.message)
    );

    return () => { socket.disconnect(); };
  }, [token]);
}
