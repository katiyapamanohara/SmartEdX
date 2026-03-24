"use client";
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface LiveParticipant {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  socketId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  email: string;
  role: string;
  message: string;
  timestamp: string;
}

export interface UseLiveSocketOptions {
  token: string | null;
  sessionId: string;
  isTeacher: boolean;
  localStreamRef: React.RefObject<MediaStream | null>;
  onParticipantJoined?: (participant: LiveParticipant) => void;
  onParticipantLeft?: (peerId: string, socketId: string) => void;
  onRemoteStream?: (socketId: string, stream: MediaStream, userId: string) => void;
  onRemoteStreamRemoved?: (socketId: string) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onHandRaised?: (userId: string, email: string, raised: boolean) => void;
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
  onRoomState?: (participants: LiveParticipant[]) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useLiveSocket(options: UseLiveSocketOptions) {
  const {
    token,
    sessionId,
    isTeacher,
    localStreamRef,
    onParticipantJoined,
    onParticipantLeft,
    onRemoteStream,
    onRemoteStreamRemoved,
    onChatMessage,
    onHandRaised,
    onSessionStarted,
    onSessionEnded,
    onRoomState,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  /** Maps socketId → RTCPeerConnection */
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Keep callbacks fresh without reconnecting
  const cbRef = useRef(options);
  useEffect(() => { cbRef.current = options; }, [options]);

  const getWsUrl = () => {
    const base = process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001").replace(":5001", ":5003");
    return base;
  };

  const createPeerConnection = useCallback(
    (targetSocketId: string, targetUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to this peer connection
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            targetSocketId,
            candidate: event.candidate.toJSON(),
            sessionId,
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        cbRef.current.onRemoteStream?.(targetSocketId, remoteStream, targetUserId);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          peerConnectionsRef.current.delete(targetSocketId);
          cbRef.current.onRemoteStreamRemoved?.(targetSocketId);
        }
      };

      peerConnectionsRef.current.set(targetSocketId, pc);
      return pc;
    },
    [sessionId, localStreamRef],
  );

  const closePeer = useCallback((socketId: string) => {
    const pc = peerConnectionsRef.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(socketId);
    }
  }, []);

  // ─── Socket events ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || typeof window === "undefined" || !sessionId) return;

    const wsUrl = getWsUrl();
    const socket: Socket = io(`${wsUrl}/live`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { sessionId });
    });

    socket.on("connect_error", (err) =>
      console.warn("[LiveSocket] connect error:", err.message),
    );

    // ── Room state (initial snapshot) ─────────────────────────────────────
    socket.on("room-state", (data: { participants: LiveParticipant[] }) => {
      cbRef.current.onRoomState?.(data.participants);
    });

    // ── A new peer joined → teacher sends them an offer ──────────────────
    socket.on(
      "peer-joined",
      async (data: { peerId: string; email: string; role: string; socketId: string }) => {
        cbRef.current.onParticipantJoined?.({
          id: data.peerId,
          email: data.email,
          role: data.role,
          socketId: data.socketId,
        });

        if (isTeacher) {
          // Teacher initiates WebRTC to the new student
          const pc = createPeerConnection(data.socketId, data.peerId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", {
              targetSocketId: data.socketId,
              offer: pc.localDescription,
              sessionId,
            });
          } catch (err) {
            console.error("[LiveSocket] offer error:", err);
          }
        }
      },
    );

    // ── Peer left ─────────────────────────────────────────────────────────
    socket.on("peer-left", (data: { peerId: string; socketId: string }) => {
      closePeer(data.socketId);
      cbRef.current.onParticipantLeft?.(data.peerId, data.socketId);
    });

    // ── Receive offer (student side) ──────────────────────────────────────
    socket.on(
      "offer",
      async (data: {
        offer: RTCSessionDescriptionInit;
        fromSocketId: string;
        fromUserId: string;
        sessionId: string;
      }) => {
        if (isTeacher) return; // teacher doesn't receive offers
        const pc = createPeerConnection(data.fromSocketId, data.fromUserId);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", {
            targetSocketId: data.fromSocketId,
            answer: pc.localDescription,
            sessionId,
          });
        } catch (err) {
          console.error("[LiveSocket] answer error:", err);
        }
      },
    );

    // ── Receive answer (teacher side) ─────────────────────────────────────
    socket.on(
      "answer",
      async (data: { answer: RTCSessionDescriptionInit; fromSocketId: string }) => {
        const pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error("[LiveSocket] setRemoteDescription error:", err);
        }
      },
    );

    // ── ICE candidates ────────────────────────────────────────────────────
    socket.on(
      "ice-candidate",
      async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
        const pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("[LiveSocket] ICE candidate error:", err);
        }
      },
    );

    // ── Chat ──────────────────────────────────────────────────────────────
    socket.on("chat-message", (msg: ChatMessage) => {
      cbRef.current.onChatMessage?.(msg);
    });

    // ── Hand raise ────────────────────────────────────────────────────────
    socket.on("hand-raised", (data: { userId: string; email: string; raised: boolean }) => {
      cbRef.current.onHandRaised?.(data.userId, data.email, data.raised);
    });

    // ── Session control ───────────────────────────────────────────────────
    socket.on("session-started", () => cbRef.current.onSessionStarted?.());
    socket.on("session-ended", () => cbRef.current.onSessionEnded?.());

    return () => {
      socket.emit("leave-room", { sessionId });
      socket.disconnect();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sessionId]);

  // ─── Exposed actions ────────────────────────────────────────────────────────

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit("chat-message", { sessionId, message });
  }, [sessionId]);

  const raiseHand = useCallback((raised: boolean) => {
    socketRef.current?.emit("raise-hand", { sessionId, raised });
  }, [sessionId]);

  const emitSessionStarted = useCallback(() => {
    socketRef.current?.emit("session-started", { sessionId });
  }, [sessionId]);

  const emitSessionEnded = useCallback(() => {
    socketRef.current?.emit("session-ended", { sessionId });
  }, [sessionId]);

  return {
    sendChat,
    raiseHand,
    emitSessionStarted,
    emitSessionEnded,
    socket: socketRef,
    peerConnections: peerConnectionsRef,
  };
}
