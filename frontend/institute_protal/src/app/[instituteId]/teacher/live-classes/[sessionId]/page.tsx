"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveSession, ChatMessage, LiveParticipant } from "@/context/LiveSessionContext";

interface RemoteVideo { socketId: string; stream: MediaStream; userId: string; email?: string; }

// ── SVG Icons ────────────────────────────────────────────────────────────────
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
const CamOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
  </svg>
);
const CamOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M21 6.5l-4 4V7a1 1 0 0 0-1-1H9.82L21 17.18V6.5zM3.27 2 2 3.27 4.73 6H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
  </svg>
);
const ScreenShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6zm9 4.5v-3l4 4-4 4v-3H7v-2h6z"/>
  </svg>
);
const StopShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M21.22 18.02 3.98 .78 2.77 2 5 4.23V4c0-1.1-.9-2-2-2H1c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H-3v2h24v-2h-3.78l3-3-1-1zM1 14V4h1.77l9 9H1zm19-8v8.77l1.98 1.98c.01-.08.02-.16.02-.25V6c0-1.1-.9-2-2-2H6.23l2 2H20z"/>
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
const EndCallIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.65 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.65-1.85.998.998 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
  </svg>
);
const HandIcon = ({ raised }: { raised?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d={raised
      ? "M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-. 17 0-.34.02-.5.05C14.5.96 13.38 0 12 0 10.62 0 9.5 1.12 9.5 2.5v.05C9.34 2.52 9.17 2.5 9 2.5 7.62 2.5 6.5 3.62 6.5 5v8.5c-.63-.45-1.36-.75-2.16-.75C2.51 12.75 1 14.26 1 16.09c0 1.04.37 1.99.99 2.73l3.19 3.78C6.57 24 8.34 24 9 24h8.5c1.81 0 3.4-1.28 3.78-3.06l1.44-7.22c.05-.28.08-.57.08-.86V9c0-1.38-1.12-2-2.5-2z"
      : "M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05C14.5.96 13.38 0 12 0c-1.38 0-2.5 1.12-2.5 2.5v.05C9.34 2.52 9.17 2.5 9 2.5 7.62 2.5 6.5 3.62 6.5 5v8.5c-.63-.45-1.36-.75-2.16-.75C2.51 12.75 1 14.26 1 16.09c0 1.04.37 1.99.99 2.73l3.19 3.78C6.57 24 8.34 24 9 24h8.5c1.81 0 3.4-1.28 3.78-3.06l1.44-7.22c.05-.28.08-.57.08-.86V9c0-1.38-1.12-2.5-2.5-2.5z"
    }/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);
const WhiteboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M3 3h18v2H3V3zm0 4h18v10H3V7zm2 2v6h14V9H5zm-2 8h18v2H3v-2z"/>
  </svg>
);
const CaptionIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3 7h-2v-.5h-2v3h2V13h2v1c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v1zm-7 0H8v-.5H6v3h2V13h2v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v1z"/>
  </svg>
);
const RecordIcon = ({ recording }: { recording?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    {recording
      ? <rect x="6" y="6" width="12" height="12" rx="2"/>
      : <circle cx="12" cy="12" r="5"/>}
  </svg>
);

// ── Recording name modal ──────────────────────────────────────────────────────
function RecordingNameModal({
  defaultName,
  uploading,
  uploadProgress,
  onSave,
  onDiscard,
}: {
  defaultName: string;
  uploading: boolean;
  uploadProgress: number;
  onSave: (name: string) => void;
  onDiscard: () => void;
}) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#2d2f31] rounded-2xl shadow-2xl p-6 border border-white/10">
        <h2 className="text-white font-bold text-lg mb-1">Save Recording</h2>
        <p className="text-white/50 text-sm mb-4">Give your recording a name before saving it.</p>

        <input
          autoFocus
          disabled={uploading}
          className="w-full bg-[#3c4043] text-white text-sm px-3 py-2.5 rounded-lg placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] mb-4 disabled:opacity-60"
          placeholder="e.g. Algebra Session 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !uploading) onSave(name.trim()); }}
        />

        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Uploading to storage…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1a73e8] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            disabled={uploading}
            className="flex-1 py-2 rounded-lg border border-white/20 text-white/60 text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            disabled={!name.trim() || uploading}
            className="flex-1 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19 13H5v-2h14v2z"/>
  </svg>
);

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-sm text-white/70 font-medium tabular-nums">{time}</span>;
}

// ── Avatar Tile (camera off) ──────────────────────────────────────────────────
const AVATAR_COLORS = ["#1a73e8","#34a853","#fbbc04","#ea4335","#9c27b0","#00bcd4"];
function AvatarTile({ label, size = "lg", avatarUrl }: { label: string; size?: "sm" | "lg"; avatarUrl?: string }) {
  const color = AVATAR_COLORS[label.charCodeAt(0) % AVATAR_COLORS.length];
  const s = size === "sm" ? "w-10 h-10 text-base" : "w-24 h-24 text-3xl";
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#3c4043]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={label}
          className={`${s} rounded-full object-cover ring-4 ring-white/20`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className={`${s} rounded-full flex items-center justify-center font-bold text-white`} style={{ backgroundColor: color }}>
          {label[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// ── Video Tile ────────────────────────────────────────────────────────────────
function VideoTile({
  stream, label, muted: selfMuted = false, isSelf = false, isMuted = false, hasHand = false,
}: {
  stream?: MediaStream | null; label: string; muted?: boolean; isSelf?: boolean;
  isMuted?: boolean; hasHand?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#3c4043] group">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={selfMuted} className="w-full h-full object-cover" />
      ) : (
        <AvatarTile label={label} />
      )}
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />
      {/* Name */}
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
        {isMuted && (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <MicOffIcon />
          </div>
        )}
        <span className="text-white text-xs font-medium drop-shadow">
          {label}{isSelf ? " (You)" : ""}
        </span>
      </div>
      {/* Hand raised */}
      {hasHand && (
        <div className="absolute top-2 right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow-lg">
          ✋
        </div>
      )}
      {/* Hover outline */}
      <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-white/20 transition-all pointer-events-none" />
    </div>
  );
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

// ── Pill end-call button ──────────────────────────────────────────────────────
function EndCallBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={loading}
        className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        <EndCallIcon />
      </button>
      <span className="text-[10px] text-white/60">{loading ? "Ending…" : "End"}</span>
    </div>
  );
}

// ── Grid layout helper ────────────────────────────────────────────────────────
function gridClass(count: number) {
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-3 grid-rows-2";
  return "grid-cols-3 grid-rows-3";
}

// ── Chat side panel ───────────────────────────────────────────────────────────
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
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(["chat", "people"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-white border-b-2 border-[#8ab4f8]" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t === "chat" ? `Chat${unread > 0 ? ` (${unread})` : ""}` : `People (${participants.length})`}
          </button>
        ))}
      </div>

      {tab === "people" ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {participants.length === 0 ? (
            <p className="text-white/40 text-xs text-center mt-10">No students yet</p>
          ) : (
            participants.map((p) => (
              <div key={p.socketId ?? p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: AVATAR_COLORS[(p.email?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length] }}
                >
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
                <div key={m.id} className={`flex gap-2 ${m.role === "teacher" ? "flex-row-reverse" : ""}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: AVATAR_COLORS[(m.email?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length] }}
                  >
                    {(m.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${m.role === "teacher" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    <span className="text-[10px] text-white/40">
                      {m.role === "teacher" ? "You" : m.email?.split("@")[0]}
                    </span>
                    <div className={`px-3 py-1.5 rounded-2xl text-xs text-white leading-relaxed ${
                      m.role === "teacher" ? "bg-[#1a73e8] rounded-tr-sm" : "bg-[#3c4043] rounded-tl-sm"
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
          <form onSubmit={onSend} className="p-3 border-t border-white/10 flex gap-2 items-center">
            <input
              className="flex-1 bg-[#3c4043] text-white text-sm px-3 py-2 rounded-full placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              placeholder="Message everyone…"
              value={input}
              onChange={(e) => onInput(e.target.value)}
            />
            <button
              type="submit"
              className="w-9 h-9 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center transition-colors shrink-0"
            >
              <SendIcon />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ── Language options for live captions ───────────────────────────────────────
const LANG_OPTIONS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "zh-CN", label: "Chinese (Mandarin)" },
  { code: "ar-SA", label: "Arabic" },
  { code: "hi-IN", label: "Hindi" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "si-LK", label: "Sinhala" },
];

const WB_COLORS = ["#000000","#ffffff","#ef4444","#3b82f6","#22c55e","#f59e0b","#8b5cf6","#ec4899","#f97316"];

// ── Whiteboard Canvas component ───────────────────────────────────────────────
function WhiteboardCanvas({
  canvasRef,
  wbSharing,
  onShare,
  onStopShare,
  onClose,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wbSharing: boolean;
  onShare: () => void;
  onStopShare: () => void;
  onClose: () => void;
}) {
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.fillStyle = "#ffffff";
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };

  const doDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current || !lastRef.current) return;
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx2d.beginPath();
    ctx2d.moveTo(lastRef.current.x, lastRef.current.y);
    ctx2d.lineTo(pos.x, pos.y);
    ctx2d.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx2d.lineWidth = tool === "eraser" ? size * 5 : size;
    ctx2d.lineCap = "round";
    ctx2d.lineJoin = "round";
    ctx2d.stroke();
    lastRef.current = pos;
  };

  const endDraw = () => { drawingRef.current = false; lastRef.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d")!;
    ctx2d.fillStyle = "#ffffff";
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-black/80 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#202124] border-b border-white/10 flex-wrap shrink-0">
        <span className="text-white text-sm font-semibold mr-1">Whiteboard</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setTool("pen")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tool === "pen" ? "bg-[#1a73e8] text-white" : "bg-[#3c4043] text-white/70 hover:bg-[#4a5157]"}`}>
            ✏️ Pen
          </button>
          <button onClick={() => setTool("eraser")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tool === "eraser" ? "bg-[#1a73e8] text-white" : "bg-[#3c4043] text-white/70 hover:bg-[#4a5157]"}`}>
            ⬜ Eraser
          </button>
        </div>
        <div className="flex gap-1.5">
          {WB_COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool("pen"); }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c && tool === "pen" ? "border-white scale-125" : "border-white/30"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">Size</span>
          <input type="range" min={1} max={20} value={size} onChange={(e) => setSize(+e.target.value)}
            className="w-20 accent-[#1a73e8]" />
        </div>
        <button onClick={clearCanvas}
          className="px-3 py-1.5 bg-[#3c4043] hover:bg-[#4a5157] text-white/70 text-xs rounded-lg transition-colors">
          🗑️ Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          {wbSharing ? (
            <button onClick={onStopShare}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
              ⏹ Stop Sharing
            </button>
          ) : (
            <button onClick={onShare}
              className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded-lg transition-colors">
              📡 Share to Students
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-1.5 bg-[#3c4043] hover:bg-[#4a5157] text-white/70 text-xs rounded-lg transition-colors">
            ✕ Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[#2d2f31] p-4">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="max-w-full max-h-full shadow-2xl"
          style={{ background: "#fff", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={doDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
          onTouchMove={(e) => { e.preventDefault(); doDraw(e); }}
          onTouchEnd={endDraw}
        />
      </div>
    </div>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(^| )access_token=([^;]+)/);
  return m ? m[2] : null;
}

// ── Main Teacher Page ─────────────────────────────────────────────────────────
export default function TeacherClassroomPage() {
  const { instituteId, sessionId } = useParams<{ instituteId: string; sessionId: string }>();
  const router = useRouter();
  const ctx = useLiveSession();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // ── Recording state ──────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Whiteboard state ─────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [wbSharing, setWbSharing] = useState(false);
  const wbStreamRef = useRef<MediaStream | null>(null);

  const handleShareWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasStream = canvas.captureStream(30);
    ctx.originalStreamRef.current?.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
    ctx.peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      const [vTrack] = canvasStream.getVideoTracks();
      if (sender && vTrack) sender.replaceTrack(vTrack).catch(() => {});
    });
    ctx.localStreamRef.current = canvasStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = canvasStream;
    wbStreamRef.current = canvasStream;
    setWbSharing(true);
  };

  const handleStopWhiteboardShare = () => {
    const original = ctx.originalStreamRef.current;
    if (original) {
      ctx.peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        const [vTrack] = original.getVideoTracks();
        if (sender && vTrack) sender.replaceTrack(vTrack).catch(() => {});
      });
      ctx.localStreamRef.current = original;
      if (localVideoRef.current) localVideoRef.current.srcObject = original;
    }
    setWbSharing(false);
    wbStreamRef.current = null;
  };

  // ── Live captions state ──────────────────────────────────────────────────
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captionLang, setCaptionLang] = useState("en-US");
  const [captionText, setCaptionText] = useState("");
  const [captionError, setCaptionError] = useState("");
  const recognitionRef = useRef<any>(null);

  const startRecognition = (lang: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setCaptionError("Live captions are not supported in this browser.");
      setCaptionsOn(false);
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setCaptionError("");
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    let fatalError = false;

    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setCaptionText(text);
      setCaptionError("");
    };

    rec.onerror = (e: any) => {
      if (e.error === "network") {
        fatalError = true;
        setCaptionError("Speech recognition needs an internet connection. Check your connection.");
        setCaptionsOn(false);
      } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        fatalError = true;
        setCaptionError("Microphone access was denied for captions.");
        setCaptionsOn(false);
      } else if (e.error === "language-not-supported") {
        fatalError = true;
        setCaptionError("Selected language is not supported for captions.");
        setCaptionsOn(false);
      }
      // "no-speech" and "aborted" are non-fatal — onend will restart automatically
    };

    rec.onend = () => {
      // Only auto-restart for non-fatal errors; stop permanently on fatal ones
      if (!fatalError && recognitionRef.current === rec) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    rec.start();
    recognitionRef.current = rec;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setCaptionText("");
    setCaptionError("");
  };

  const handleToggleCaptions = () => {
    if (captionsOn) {
      stopRecognition();
      setCaptionsOn(false);
    } else {
      setCaptionsOn(true);
      startRecognition(captionLang);
    }
  };

  // Changing language auto-restarts recognition — no separate button needed
  const handleCaptionLangChange = (lang: string) => {
    setCaptionLang(lang);
    if (captionsOn) startRecognition(lang);
  };

  useEffect(() => () => { stopRecognition(); }, []); // eslint-disable-line

  const startRecording = () => {
    const stream = ctx.localStream;
    if (!stream) return;
    recordingChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setShowNameModal(true);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleSaveRecording = async (name: string) => {
    if (!recordedBlob) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = recordedBlob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `${name.replace(/\s+/g, "_")}_${Date.now()}.${ext}`;
      const form = new FormData();
      form.append("title", name);
      form.append("file", recordedBlob, fileName);
      const token = getToken();
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", `${API}/api/institutes/institutes/${instituteId}/recordings`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(form);
      });
      setShowNameModal(false);
      setRecordedBlob(null);
      setUploadProgress(0);
    } catch (err) {
      console.error("Recording upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDiscardRecording = () => {
    setShowNameModal(false);
    setRecordedBlob(null);
    setUploadProgress(0);
  };

  // Format recording duration as mm:ss
  const recDuration = `${String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:${String(recordingSeconds % 60).padStart(2, "0")}`;

  // Join (or re-attach to) the session in the persistent context
  useEffect(() => {
    ctx.joinSession({
      sessionId,
      instituteId,
      isTeacher: true,
      title: "Live Class",
    });
    // Auto-minimize on unmount so PiP widget keeps session alive
    return () => { ctx.minimize(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, instituteId]);

  // Fetch session title once
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
    const token = document.cookie.match(/(^| )access_token=([^;]+)/)?.[2];
    fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (d.title) ctx.setSessionTitle(d.title); })
      .catch(() => {});
  }, [instituteId, sessionId]); // eslint-disable-line

  // Attach local video element to the context stream
  useEffect(() => {
    if (localVideoRef.current && ctx.localStream) {
      localVideoRef.current.srcObject = ctx.localStream;
    }
  }, [ctx.localStream]);

  const {
    session, isMinimized, isEnding, mediaReady, mediaError,
    isMicMuted, isCamOff, isScreenSharing, selfEmail, selfAvatar,
    participants, remoteVideos, raisedHands, chatMessages, chatInput,
    sidePanel, activePanelTab, unreadChat,
    minimize, toggleMic, toggleCam, toggleScreenShare, endSession,
    sendChat, setChatInput, togglePanel, setActivePanelTab, clearUnread, broadcastCaption,
  } = ctx;

  // Broadcast captions to students whenever the text changes
  useEffect(() => {
    if (captionsOn && captionText) broadcastCaption(captionText);
  }, [captionText]); // eslint-disable-line

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendChat(msg);
    setChatInput("");
  };

  const handleEndClass = () => {
    if (!confirm("End the live class for all students?")) return;
    endSession();
  };

  const tileCount = 1 + remoteVideos.length;

  if (mediaError) {
    return (
      <div className="fixed inset-0 z-999999 bg-[#202124] flex flex-col items-center justify-center gap-5 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-3xl">🎥</div>
        <div>
          <p className="text-white font-semibold text-lg">Camera / Mic Access Denied</p>
          <p className="text-white/50 text-sm mt-1">{mediaError}</p>
        </div>
        <button onClick={() => router.push(`/${instituteId}/teacher/live-classes`)}
          className="px-5 py-2 rounded-full bg-[#3c4043] hover:bg-[#4a5157] text-white text-sm transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  // When minimized the layout's LivePipWidget handles display; page renders nothing
  if (isMinimized) return null;

  return (
    <div className="fixed inset-0 z-999999 bg-[#202124] flex flex-col overflow-hidden">
      {/* Whiteboard overlay */}
      {showWhiteboard && (
        <WhiteboardCanvas
          canvasRef={canvasRef}
          wbSharing={wbSharing}
          onShare={handleShareWhiteboard}
          onStopShare={handleStopWhiteboardShare}
          onClose={() => setShowWhiteboard(false)}
        />
      )}

      {/* Recording name modal */}
      {showNameModal && (
        <RecordingNameModal
          defaultName={`${session?.title ?? "Live Class"} – ${new Date().toLocaleDateString()}`}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onSave={handleSaveRecording}
          onDiscard={handleDiscardRecording}
        />
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 bg-linear-to-b from-black/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-full animate-pulse">
            ● LIVE
          </span>
          <h1 className="text-white text-sm font-medium max-w-xs truncate">{session?.title ?? "Live Class"}</h1>
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-700 px-2.5 py-1 rounded-full">
              ⏺ REC {recDuration}
            </span>
          )}
          {wbSharing && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 px-2.5 py-1 rounded-full">
              📋 Whiteboard
            </span>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Caption language selector — auto-starts when changed, no translate button */}
          {captionsOn && (
            <select
              value={captionLang}
              onChange={(e) => handleCaptionLangChange(e.target.value)}
              className="bg-[#3c4043] text-white text-xs px-2 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          )}
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

      {/* Video grid + side panel */}
      <div className="flex flex-1 overflow-hidden pt-14 pb-24">
        {/* Grid */}
        <div className={`flex-1 grid gap-2 p-2 ${gridClass(tileCount)}`}>
          {/* Self tile */}
          <div className="relative rounded-2xl overflow-hidden bg-[#3c4043]">
            {/* Always in DOM — never hidden — so srcObject never suspends */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Avatar overlays on top when cam is off */}
            {isCamOff && (
              <div className="absolute inset-0">
                <AvatarTile label={selfEmail} avatarUrl={selfAvatar} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
              {isMicMuted && <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"><MicOffIcon /></div>}
              <span className="text-white text-xs font-medium">
                You {isScreenSharing ? "(Screen)" : ""}
              </span>
            </div>
            {!mediaReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Remote tiles */}
          {remoteVideos.map((rv) => (
            <VideoTile
              key={rv.socketId}
              stream={rv.stream}
              label={rv.email ?? rv.userId.slice(0, 8)}
              hasHand={raisedHands.has(rv.userId)}
            />
          ))}

          {/* Empty placeholder when no students */}
          {remoteVideos.length === 0 && (
            <div className="rounded-2xl bg-[#3c4043] flex flex-col items-center justify-center gap-3 text-center p-6">
              <PeopleIcon />
              <p className="text-white/50 text-sm">Waiting for students to join…</p>
              <p className="text-white/30 text-xs">{participants.length} viewer{participants.length !== 1 ? "s" : ""} connected</p>
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

      {/* Caption error banner */}
      {captionError && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center px-6 z-20">
          <div className="flex items-center gap-2 max-w-lg bg-red-900/90 text-red-200 text-xs px-4 py-2.5 rounded-xl border border-red-700/50">
            <span>⚠️</span>
            <span>{captionError}</span>
            <button onClick={() => setCaptionError("")} className="ml-auto text-red-300 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Live caption overlay */}
      {captionsOn && !captionError && captionText && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center px-6 pointer-events-none z-20">
          <div className="max-w-2xl bg-black/75 text-white text-sm px-4 py-2 rounded-xl backdrop-blur-sm text-center leading-relaxed">
            {captionText}
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 pb-6 bg-linear-to-t from-black/50 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-end gap-3 px-6 py-3 rounded-2xl bg-[#202124]/80 backdrop-blur-md border border-white/10 shadow-2xl">
          <RoundBtn onClick={toggleMic} label={isMicMuted ? "Unmute" : "Mute"} active={!isMicMuted} >
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </RoundBtn>
          <RoundBtn onClick={toggleCam} label={isCamOff ? "Start cam" : "Stop cam"} active={!isCamOff}>
            {isCamOff ? <CamOffIcon /> : <CamOnIcon />}
          </RoundBtn>
          <RoundBtn onClick={toggleScreenShare} label={isScreenSharing ? "Stop share" : "Share"} highlight={isScreenSharing}>
            {isScreenSharing ? <StopShareIcon /> : <ScreenShareIcon />}
          </RoundBtn>
          <RoundBtn onClick={() => setShowWhiteboard((v) => !v)} label="Whiteboard" highlight={showWhiteboard || wbSharing}>
            <WhiteboardIcon />
          </RoundBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <RoundBtn onClick={() => togglePanel("people")} label="People" highlight={sidePanel === "people"} badge={raisedHands.size || undefined}>
            <PeopleIcon />
          </RoundBtn>
          <RoundBtn onClick={() => togglePanel("chat")} label="Chat" highlight={sidePanel === "chat"} badge={unreadChat || undefined}>
            <ChatIcon />
          </RoundBtn>
          <RoundBtn onClick={handleToggleCaptions} label={captionsOn ? "Captions On" : "Captions"} highlight={captionsOn}>
            <CaptionIcon />
          </RoundBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <RoundBtn
            onClick={isRecording ? stopRecording : startRecording}
            label={isRecording ? "Stop Rec" : "Record"}
            red={isRecording}
          >
            <RecordIcon recording={isRecording} />
          </RoundBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <EndCallBtn onClick={handleEndClass} loading={isEnding ?? false} />
        </div>
      </div>
    </div>
  );
}
