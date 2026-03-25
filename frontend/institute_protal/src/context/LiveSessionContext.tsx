"use client";
import React, {
  createContext, useContext, useState, useRef, useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveParticipant {
  id: string;
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

export interface RemoteVideo {
  socketId: string;
  stream: MediaStream;
  userId: string;
  email?: string;
}

export interface SessionMeta {
  sessionId: string;
  instituteId: string;
  isTeacher: boolean;
  title: string;
  teacherName?: string;
}

// ── Context type ──────────────────────────────────────────────────────────────

interface LiveSessionContextValue {
  session: SessionMeta | null;
  isMinimized: boolean;
  isEnding: boolean;
  sessionEnded: boolean;

  localStream: MediaStream | null;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  originalStreamRef: React.MutableRefObject<MediaStream | null>;
  peerConnectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  mediaReady: boolean;
  mediaError: string;
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  selfEmail: string;
  selfAvatar: string | undefined;

  participants: LiveParticipant[];
  remoteVideos: RemoteVideo[];
  raisedHands: Set<string>;
  handRaised: boolean;

  chatMessages: ChatMessage[];
  chatInput: string;
  unreadChat: number;
  sidePanel: "chat" | "people" | null;
  activePanelTab: "chat" | "people";

  joinSession: (meta: SessionMeta) => Promise<void>;
  setSessionTitle: (t: string) => void;
  minimize: () => void;
  expand: () => void;
  leaveSession: () => Promise<void>;
  endSession: () => Promise<void>;
  emitSessionEnded: () => void;
  toggleMic: () => void;
  toggleCam: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  sendChat: (msg: string) => void;
  raiseHand: (raised: boolean) => void;
  toggleHandRaised: () => void;
  setChatInput: (v: string) => void;
  togglePanel: (p: "chat" | "people") => void;
  setActivePanelTab: (t: "chat" | "people") => void;
  clearUnread: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )access_token=([^;]+)/);
  return match ? match[2] : null;
}

function getWsUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WS_URL ||
    (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001").replace(":5001", ":5003")
  );
}

function apiHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

// ── Context ───────────────────────────────────────────────────────────────────

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function useLiveSession(): LiveSessionContextValue {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error("useLiveSession must be used within LiveSessionProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function LiveSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // ── Refs (stable across renders, accessible in async callbacks) ────────────
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  /** Candidates that arrived before setRemoteDescription completed */
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<SessionMeta | null>(null);
  const isCamOffRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const isScreenSharingRef = useRef(false);

  // ── State ──────────────────────────────────────────────────────────────────
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selfEmail, setSelfEmail] = useState("You");
  const [selfAvatar, setSelfAvatar] = useState<string | undefined>(undefined);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideo[]>([]);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [handRaised, setHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChat, setUnreadChat] = useState(0);
  const [sidePanel, setSidePanel] = useState<"chat" | "people" | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<"chat" | "people">("chat");

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  // ── Peer connection factory ────────────────────────────────────────────────

  const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          targetSocketId,
          candidate: e.candidate.toJSON(),
          sessionId: sessionRef.current?.sessionId,
        });
      }
    };

    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      setRemoteVideos((prev) => [
        ...prev.filter((v) => v.socketId !== targetSocketId),
        { socketId: targetSocketId, stream: remoteStream, userId: targetUserId },
      ]);
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        peerConnectionsRef.current.delete(targetSocketId);
        setRemoteVideos((prev) => prev.filter((v) => v.socketId !== targetSocketId));
      }
    };

    peerConnectionsRef.current.set(targetSocketId, pc);
    return pc;
  }, []);

  const closePeer = useCallback((socketId: string) => {
    const pc = peerConnectionsRef.current.get(socketId);
    if (pc) { pc.close(); peerConnectionsRef.current.delete(socketId); }
    pendingCandidatesRef.current.delete(socketId);
  }, []);

  /** Apply any ICE candidates that were queued before remote description was ready */
  const drainPendingCandidates = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(socketId) ?? [];
    pendingCandidatesRef.current.delete(socketId);
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
  }, []);

  // ── Full teardown ──────────────────────────────────────────────────────────

  const disconnectAll = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave-room", { sessionId: sessionRef.current?.sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    originalStreamRef.current = null;
    setLocalStream(null);
    setSession(null);
    sessionRef.current = null;
    setIsMinimized(false);
    setIsEnding(false);
    setSessionEnded(false);
    setMediaReady(false);
    setMediaError("");
    setIsMicMuted(false); isMicMutedRef.current = false;
    setIsCamOff(false); isCamOffRef.current = false;
    setIsScreenSharing(false); isScreenSharingRef.current = false;
    setParticipants([]);
    setRemoteVideos([]);
    setRaisedHands(new Set());
    setHandRaised(false);
    setChatMessages([]);
    setChatInput("");
    setUnreadChat(0);
    setSidePanel(null);
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────

  const connectSocket = useCallback((meta: SessionMeta, token: string) => {
    const socket = io(`${getWsUrl()}/live`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { sessionId: meta.sessionId });
    });

    socket.on("connect_error", (err) =>
      console.warn("[LiveSocket] connect error:", err.message),
    );

    socket.on("room-state", (data: { participants: LiveParticipant[] }) => {
      setParticipants(data.participants);
    });

    socket.on(
      "peer-joined",
      async (data: { peerId: string; email: string; role: string; socketId: string }) => {
        setParticipants((prev) =>
          prev.find((x) => x.socketId === data.socketId)
            ? prev
            : [...prev, { id: data.peerId, email: data.email, role: data.role, socketId: data.socketId }],
        );
        if (meta.isTeacher) {
          const pc = createPeerConnection(data.socketId, data.peerId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", {
              targetSocketId: data.socketId,
              offer: pc.localDescription,
              sessionId: meta.sessionId,
            });
          } catch (err) { console.error("[LiveSocket] offer error:", err); }
        }
      },
    );

    socket.on("peer-left", (data: { peerId: string; socketId: string }) => {
      closePeer(data.socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      setRemoteVideos((prev) => prev.filter((v) => v.socketId !== data.socketId));
    });

    socket.on(
      "offer",
      async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string; fromUserId: string }) => {
        if (meta.isTeacher) return;
        const pc = createPeerConnection(data.fromSocketId, data.fromUserId);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", {
            targetSocketId: data.fromSocketId,
            answer: pc.localDescription,
            sessionId: meta.sessionId,
          });
          // Drain any candidates that arrived before the remote description was ready
          await drainPendingCandidates(data.fromSocketId, pc);
        } catch (err) { console.error("[LiveSocket] answer error:", err); }
      },
    );

    socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; fromSocketId: string }) => {
      const pc = peerConnectionsRef.current.get(data.fromSocketId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        // Drain any candidates that arrived before the answer was processed
        await drainPendingCandidates(data.fromSocketId, pc);
      } catch (err) { console.error("[LiveSocket] setRemoteDescription error:", err); }
    });

    socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
      const pc = peerConnectionsRef.current.get(data.fromSocketId);
      if (!pc) return;
      // If remote description not set yet, queue the candidate
      if (!pc.remoteDescription) {
        const queue = pendingCandidatesRef.current.get(data.fromSocketId) ?? [];
        queue.push(data.candidate);
        pendingCandidatesRef.current.set(data.fromSocketId, queue);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) { console.error("[LiveSocket] ICE error:", err); }
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      setSidePanel((p) => { if (p !== "chat") setUnreadChat((n) => n + 1); return p; });
    });

    socket.on("hand-raised", (data: { userId: string; email: string; raised: boolean }) => {
      setRaisedHands((prev) => {
        const n = new Set(prev);
        data.raised ? n.add(data.userId) : n.delete(data.userId);
        return n;
      });
    });

    socket.on("session-started", () => { /* no-op */ });

    socket.on("session-ended", () => {
      if (!meta.isTeacher) {
        // Teacher ended the session — show ended state then redirect
        setSessionEnded(true);
        setTimeout(() => {
          disconnectAll();
          router.push(`/${meta.instituteId}/student/live-classes`);
        }, 4000);
      }
    });
  }, [createPeerConnection, closePeer, drainPendingCandidates, disconnectAll, router]);

  // ── Join session ──────────────────────────────────────────────────────────

  const joinSession = useCallback(async (meta: SessionMeta) => {
    // Already active on same session — just expand
    if (sessionRef.current?.sessionId === meta.sessionId && socketRef.current?.connected) {
      setSession((s) => ({ ...s!, title: meta.title, teacherName: meta.teacherName }));
      setIsMinimized(false);
      setSessionEnded(false);
      return;
    }

    // Clean up any previous session
    if (socketRef.current) {
      socketRef.current.emit("leave-room", { sessionId: sessionRef.current?.sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    }

    setSession(meta);
    sessionRef.current = meta;
    setIsMinimized(false);
    setIsEnding(false);
    setSessionEnded(false);
    setMediaReady(false);
    setMediaError("");
    setParticipants([]);
    setRemoteVideos([]);
    setChatMessages([]);
    setRaisedHands(new Set());
    setHandRaised(false);
    setUnreadChat(0);
    setSidePanel(null);

    // Read profile cookie
    try {
      const raw = document.cookie.match(/(^| )user=([^;]+)/)?.[2];
      if (raw) {
        const u = JSON.parse(decodeURIComponent(raw));
        if (u.profilePicture) setSelfAvatar(u.profilePicture);
        if (u.email) setSelfEmail(u.email);
      }
    } catch { /* ignore */ }

    // Acquire media
    try {
      const constraints = meta.isTeacher
        ? { video: true, audio: true }
        : { video: false, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!meta.isTeacher) {
        // Stop audio tracks immediately so browser releases the mic indicator on join
        stream.getAudioTracks().forEach((t) => { t.stop(); stream.removeTrack(t); });
        setIsMicMuted(true);
        isMicMutedRef.current = true;
      }
      updateLocalStream(stream);
      originalStreamRef.current = stream;
      setMediaReady(true);
    } catch (err: any) {
      setMediaError(err.message ?? "Camera/mic access denied");
      return;
    }

    // Connect socket
    const token = getToken();
    if (!token) { setMediaError("Not authenticated"); return; }
    connectSocket(meta, token);
  }, [connectSocket, updateLocalStream]);

  // ── Session actions ────────────────────────────────────────────────────────

  const setSessionTitle = useCallback((t: string) => {
    setSession((s) => (s ? { ...s, title: t } : s));
  }, []);

  const minimize = useCallback(() => setIsMinimized(true), []);
  const expand = useCallback(() => { setIsMinimized(false); setSessionEnded(false); }, []);

  const leaveSession = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    try {
      await fetch(`${API}/api/institutes/institutes/${s.instituteId}/live-classes/${s.sessionId}/leave`, {
        method: "POST", headers: apiHeaders(),
      });
    } catch { /* ignore */ }
    const dest = `/${s.instituteId}/student/live-classes`;
    disconnectAll();
    router.push(dest);
  }, [disconnectAll, router]);

  const endSession = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    setIsEnding(true);
    socketRef.current?.emit("session-ended", { sessionId: s.sessionId });
    try {
      await fetch(`${API}/api/institutes/institutes/${s.instituteId}/live-classes/${s.sessionId}/end`, {
        method: "POST", headers: apiHeaders(),
      });
    } catch { /* ignore */ }
    const dest = `/${s.instituteId}/teacher/live-classes`;
    disconnectAll();
    router.push(dest);
  }, [disconnectAll, router]);

  const emitSessionEnded = useCallback(() => {
    socketRef.current?.emit("session-ended", { sessionId: sessionRef.current?.sessionId });
  }, []);

  // ── Media actions ──────────────────────────────────────────────────────────

  const toggleMic = useCallback(async () => {
    if (!isMicMutedRef.current) {
      // Turning OFF — stop track so browser releases the mic indicator
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
      peerConnectionsRef.current.forEach((pc) => {
        pc.getSenders()
          .filter((s) => s.track?.kind === "audio")
          .forEach((s) => s.replaceTrack(null).catch(() => {}));
      });
      isMicMutedRef.current = true;
      setIsMicMuted(true);
    } else {
      // Turning ON — get a fresh mic stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = newStream.getAudioTracks()[0];
        localStreamRef.current?.addTrack(newTrack);
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track === null || s.track?.kind === "audio");
          if (sender) sender.replaceTrack(newTrack).catch(() => {});
          else if (localStreamRef.current) pc.addTrack(newTrack, localStreamRef.current);
        });
        isMicMutedRef.current = false;
        setIsMicMuted(false);
      } catch (err) {
        console.error("[toggleMic] failed to re-enable mic:", err);
      }
    }
  }, []);

  const toggleCam = useCallback(async () => {
    if (!isCamOffRef.current) {
      // Turn OFF — stop track so browser releases camera LED
      localStreamRef.current?.getVideoTracks().forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
      peerConnectionsRef.current.forEach((pc) => {
        pc.getSenders().filter((s) => s.track?.kind === "video")
          .forEach((s) => s.replaceTrack(null).catch(() => {}));
      });
      isCamOffRef.current = true;
      setIsCamOff(true);
    } else {
      // Turn ON — get fresh camera
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        localStreamRef.current?.addTrack(newTrack);
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track === null || s.track?.kind === "video");
          if (sender) sender.replaceTrack(newTrack).catch(() => {});
          else if (localStreamRef.current) pc.addTrack(newTrack, localStreamRef.current);
        });
        // Trigger video element re-attach by bumping localStream state
        if (localStreamRef.current) setLocalStream({ ...localStreamRef.current } as unknown as MediaStream);
        isCamOffRef.current = false;
        setIsCamOff(false);
      } catch (err) { console.error("[toggleCam] failed:", err); }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      if (originalStreamRef.current) {
        updateLocalStream(originalStreamRef.current);
      }
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        updateLocalStream(s);
        isScreenSharingRef.current = true;
        setIsScreenSharing(true);
        s.getVideoTracks()[0].onended = () => {
          isScreenSharingRef.current = false;
          setIsScreenSharing(false);
          if (originalStreamRef.current) updateLocalStream(originalStreamRef.current);
        };
      } catch { /* cancelled */ }
    }
  }, [updateLocalStream]);

  // ── Chat / hand ────────────────────────────────────────────────────────────

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit("chat-message", { sessionId: sessionRef.current?.sessionId, message });
  }, []);

  const raiseHand = useCallback((raised: boolean) => {
    socketRef.current?.emit("raise-hand", { sessionId: sessionRef.current?.sessionId, raised });
  }, []);

  const toggleHandRaised = useCallback(() => {
    setHandRaised((prev) => {
      const next = !prev;
      socketRef.current?.emit("raise-hand", { sessionId: sessionRef.current?.sessionId, raised: next });
      return next;
    });
  }, []);

  // ── Panel helpers ──────────────────────────────────────────────────────────

  const togglePanel = useCallback((p: "chat" | "people") => {
    setSidePanel((prev) => {
      if (prev === p) return null;
      setActivePanelTab(p);
      if (p === "chat") setUnreadChat(0);
      return p;
    });
  }, []);

  const clearUnread = useCallback(() => setUnreadChat(0), []);

  // ── Value ─────────────────────────────────────────────────────────────────

  const value: LiveSessionContextValue = {
    session, isMinimized, isEnding, sessionEnded,
    localStream, localStreamRef, originalStreamRef, peerConnectionsRef,
    mediaReady, mediaError, isMicMuted, isCamOff, isScreenSharing,
    selfEmail, selfAvatar,
    participants, remoteVideos, raisedHands, handRaised,
    chatMessages, chatInput, unreadChat, sidePanel, activePanelTab,
    joinSession, setSessionTitle, minimize, expand,
    leaveSession, endSession, emitSessionEnded,
    toggleMic, toggleCam, toggleScreenShare,
    sendChat, raiseHand, toggleHandRaised,
    setChatInput, togglePanel, setActivePanelTab, clearUnread,
  };

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
    </LiveSessionContext.Provider>
  );
}
