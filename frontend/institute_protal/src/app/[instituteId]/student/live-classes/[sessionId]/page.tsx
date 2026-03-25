"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveSession, ChatMessage, LiveParticipant } from "@/context/LiveSessionContext";

interface RemoteVideo { socketId: string; stream: MediaStream; userId: string; email?: string; }

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const MicOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm-1 1.93A7 7 0 0 1 5 9H3a9 9 0 0 0 8 8.94V21h2v-3.06A9 9 0 0 0 21 9h-2a7 7 0 0 1-6 6.93z"/>
  </svg>
);
const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73l-9-9-7.73-7.73z"/>
  </svg>
);
const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
  </svg>
);
const LeaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.65 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.65-1.85.998.998 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);
const HandRaisedIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05C14.5.96 13.38 0 12 0c-1.38 0-2.5 1.12-2.5 2.5v.05C9.34 2.52 9.17 2.5 9 2.5 7.62 2.5 6.5 3.62 6.5 5v8.5c-.63-.45-1.36-.75-2.16-.75C2.51 12.75 1 14.26 1 16.09c0 1.04.37 1.99.99 2.73l3.19 3.78C6.57 24 8.34 24 9 24h8.5c1.81 0 3.4-1.28 3.78-3.06l1.44-7.22c.05-.28.08-.57.08-.86V9c0-1.38-1.12-2.5-2.5-2.5z"/>
  </svg>
);
const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19 13H5v-2h14v2z"/>
  </svg>
);

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-sm text-white/70 font-medium tabular-nums">{time}</span>;
}

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9c27b0", "#00bcd4"];

function avatarColor(str: string) {
  return AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];
}

// ── Round control button ──────────────────────────────────────────────────────
function RoundBtn({
  onClick, label, active = true, red = false, highlight = false, children, badge,
}: {
  onClick: () => void; label: string; active?: boolean; red?: boolean; highlight?: boolean;
  children: React.ReactNode; badge?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        title={label}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30 ${
          red
            ? "bg-red-600 hover:bg-red-700 text-white"
            : active
            ? highlight
              ? "bg-[#1a73e8] hover:bg-[#1557b0] text-white"
              : "bg-[#3c4043] hover:bg-[#4a5157] text-white"
            : "bg-red-600/90 hover:bg-red-700 text-white"
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1a73e8] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      <span className="text-[10px] text-white/60 whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Side panel ────────────────────────────────────────────────────────────────
function SidePanel({
  tab, onTabChange, participants, raisedHands, messages, input, onInput, onSend, unread,
}: {
  tab: "chat" | "people"; onTabChange: (t: "chat" | "people") => void;
  participants: LiveParticipant[]; raisedHands: Set<string>;
  messages: ChatMessage[]; input: string;
  onInput: (v: string) => void; onSend: (e: React.FormEvent) => void;
  unread: number;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="flex flex-col w-80 h-full bg-[#2d2f31] rounded-xl overflow-hidden border border-white/10">
      <div className="flex border-b border-white/10 shrink-0">
        {(["chat", "people"] as const).map((t) => (
          <button key={t} onClick={() => onTabChange(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-white border-b-2 border-[#8ab4f8]" : "text-white/50 hover:text-white/80"
            }`}>
            {t === "chat" ? `Chat${unread > 0 ? ` (${unread})` : ""}` : `People (${participants.length})`}
          </button>
        ))}
      </div>

      {tab === "people" ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {participants.length === 0 ? (
            <p className="text-white/40 text-xs text-center mt-10">No one else here yet</p>
          ) : (
            participants.map((p) => (
              <div key={p.socketId ?? p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: avatarColor(p.email ?? "?") }}>
                  {(p.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.email}</p>
                  <p className="text-white/40 text-[10px] capitalize">{p.role}</p>
                </div>
                {raisedHands.has(p.id) && <span className="text-sm">✋</span>}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-white/40 text-xs text-center mt-10">No messages yet</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "teacher" ? "" : "flex-row-reverse"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: avatarColor(m.email ?? "?") }}>
                    {(m.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${m.role === "teacher" ? "items-start" : "items-end"}`}>
                    <span className="text-[10px] text-white/40">
                      {m.role === "teacher" ? `👨‍🏫 ${m.email?.split("@")[0]}` : "You"}
                    </span>
                    <div className={`px-3 py-1.5 rounded-2xl text-xs text-white leading-relaxed ${
                      m.role === "teacher"
                        ? "bg-[#3c4043] rounded-tl-sm"
                        : "bg-[#1a73e8] rounded-tr-sm"
                    }`}>
                      {m.message}
                    </div>
                    <span className="text-[10px] text-white/30">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={onSend} className="p-3 border-t border-white/10 flex gap-2 items-center shrink-0">
            <input
              className="flex-1 bg-[#3c4043] text-white text-sm px-3 py-2 rounded-full placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => onInput(e.target.value)}
            />
            <button type="submit"
              className="w-9 h-9 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center transition-colors shrink-0">
              <SendIcon />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ── Teacher video tile (main view) ────────────────────────────────────────────
function TeacherTile({ stream, name }: { stream: MediaStream | null; name?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);

  if (!stream) {
    return (
      <div className="w-full h-full rounded-2xl bg-[#3c4043] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white/60 animate-spin" />
        <p className="text-white/50 text-sm">Waiting for teacher to share stream…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#3c4043]">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
        <span className="text-white text-xs font-medium drop-shadow">
          {name ?? "Teacher"}
        </span>
        <span className="text-[10px] bg-[#1a73e8] text-white px-1.5 py-0.5 rounded-full">Host</span>
      </div>
    </div>
  );
}

// ── Self-view thumbnail ───────────────────────────────────────────────────────
function SelfThumb({
  stream, muted, avatarUrl, email,
}: {
  stream: MediaStream | null; muted: boolean; avatarUrl?: string; email?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);

  const initial = (email?.[0] ?? "Y").toUpperCase();
  const bg = avatarColor(email ?? "Y");

  return (
    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-[#3c4043] shadow-2xl border border-white/10">
      {/* Video always rendered so srcObject isn't lost */}
      <video ref={ref} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      {/* Avatar overlay when no video stream */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={email ?? "You"}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: bg }}>
              {initial}
            </div>
          )}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-black/60 to-transparent" />
      <span className="absolute bottom-1 left-2 text-[10px] text-white/80">You</span>
      {muted && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <MicOffIcon />
        </div>
      )}
    </div>
  );
}

// ── Main Student Page ─────────────────────────────────────────────────────────
export default function StudentClassroomPage() {
  const { instituteId, sessionId } = useParams<{ instituteId: string; sessionId: string }>();
  const router = useRouter();
  const ctx = useLiveSession();

  // Join (or re-attach to) the session in the persistent context
  useEffect(() => {
    ctx.joinSession({
      sessionId,
      instituteId,
      isTeacher: false,
      title: "Live Class",
    });
    return () => { if (ctx.session) ctx.minimize(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, instituteId]);

  // Fetch session info for title + teacherName
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
    const token = document.cookie.match(/(^| )access_token=([^;]+)/)?.[2];
    fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.title) ctx.setSessionTitle(d.title);
      })
      .catch(() => {});
  }, [instituteId, sessionId]); // eslint-disable-line

  const {
    session, isMinimized, sessionEnded, localStream,
    isMicMuted, selfEmail, selfAvatar,
    participants, remoteVideos, raisedHands, handRaised,
    chatMessages, chatInput, sidePanel, activePanelTab, unreadChat,
    minimize, leaveSession, toggleMic, toggleHandRaised,
    sendChat, setChatInput, togglePanel, setActivePanelTab, clearUnread,
  } = ctx;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendChat(msg);
    setChatInput("");
  };

  const teacherStream = remoteVideos[0]?.stream ?? null;

  // ── Session ended screen ───────────────────────────────────────────────────
  if (sessionEnded) {
    return (
      <div className="fixed inset-0 z-999999 bg-[#202124] flex flex-col items-center justify-center gap-6 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-[#3c4043] flex items-center justify-center text-4xl">🏁</div>
        <div>
          <h2 className="text-white text-2xl font-semibold">Class Has Ended</h2>
          <p className="text-white/50 text-sm mt-2">
            {session?.teacherName
              ? `${session.teacherName} has ended this session.`
              : "The teacher has ended this live session."}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${instituteId}/student/live-classes`)}
          className="px-6 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-medium transition-colors"
        >
          Back to Live Classes
        </button>
      </div>
    );
  }

  // When minimized the layout's LivePipWidget handles display
  if (isMinimized) return null;

  return (
    <div className="fixed inset-0 z-999999 bg-[#202124] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 bg-linear-to-b from-black/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-full animate-pulse">
            ● LIVE
          </span>
          <div>
            <h1 className="text-white text-sm font-medium max-w-xs truncate">
              {session?.title ?? "Live Class"}
            </h1>
            {session?.teacherName && (
              <p className="text-white/50 text-xs">{session.teacherName}</p>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="text-white/50 text-xs">{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
          <Clock />
          <button
            onClick={minimize}
            title="Minimise"
            className="w-7 h-7 rounded-full bg-[#3c4043] hover:bg-[#4a5157] text-white flex items-center justify-center transition-colors"
          >
            <MinimizeIcon />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden pt-14 pb-24">
        {/* Teacher video (main) */}
        <div className="flex-1 p-2 relative">
          <TeacherTile stream={teacherStream} name={session?.teacherName} />

          {/* Self-view thumbnail — bottom right */}
          <div className="absolute bottom-4 right-4">
            <SelfThumb stream={localStream} muted={isMicMuted} avatarUrl={selfAvatar} email={selfEmail} />
          </div>

          {/* Hand-raised banner */}
          {handRaised && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-400 text-gray-900 text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-bounce">
              ✋ Your hand is raised
            </div>
          )}
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-80 p-2 shrink-0">
            <SidePanel
              tab={activePanelTab}
              onTabChange={(t) => { setActivePanelTab(t); if (t === "chat") clearUnread(); }}
              participants={participants}
              raisedHands={raisedHands}
              messages={chatMessages}
              input={chatInput}
              onInput={setChatInput}
              onSend={handleSendChat}
              unread={unreadChat}
            />
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 pb-6 bg-linear-to-t from-black/50 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-end gap-3 px-6 py-3 rounded-2xl bg-[#202124]/80 backdrop-blur-md border border-white/10 shadow-2xl">
          <RoundBtn onClick={toggleMic} label={isMicMuted ? "Unmute" : "Mute"} active={!isMicMuted}>
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </RoundBtn>
          <RoundBtn
            onClick={toggleHandRaised}
            label={handRaised ? "Lower hand" : "Raise hand"}
            highlight={handRaised}
          >
            <HandRaisedIcon />
          </RoundBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <RoundBtn onClick={() => togglePanel("people")} label="People" highlight={sidePanel === "people"}>
            <PeopleIcon />
          </RoundBtn>
          <RoundBtn onClick={() => togglePanel("chat")} label="Chat" highlight={sidePanel === "chat"} badge={unreadChat || undefined}>
            <ChatIcon />
          </RoundBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          {/* Leave call */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={leaveSession}
              className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all focus:outline-none"
            >
              <LeaveIcon />
            </button>
            <span className="text-[10px] text-white/60">Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
