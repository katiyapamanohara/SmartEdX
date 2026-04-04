"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChatIcon, PaperPlaneIcon } from "@/icons";
import { messageService, MessageContact, Message } from "@/services/messageService";
import { authService } from "@/services/authService";
import { useMessageSocket } from "@/hooks/useMessageSocket";

function TeacherDetailsModal({
  contact,
  onClose,
}: {
  contact: MessageContact;
  onClose: () => void;
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-24 bg-gradient-to-r from-brand-500 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4 flex items-end justify-between">
            {contact.profilePicture ? (
              <img
                src={contact.profilePicture}
                alt={fullName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-gray-900 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-500/20 border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-2xl shrink-0">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={onClose}
              className="mb-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{fullName}</h2>
          <p className="text-sm text-brand-500 font-medium capitalize mb-5">{contact.role}</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="break-all">{contact.email}</span>
            </div>
            {contact.courses.length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                <p className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Courses
                </p>
                <div className="flex flex-col gap-1.5">
                  {contact.courses.map((c) => (
                    <span key={c.id} className="text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 rounded-lg px-2.5 py-1.5">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, picture, size = "10" }: { name: string; picture?: string; size?: string }) {
  if (picture) {
    return <img src={picture} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-linear-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function StudentMessagesPage() {
  const params = useParams();
  const instituteId = params.instituteId as string;
  const searchParams = useSearchParams();
  const contactParam = searchParams.get("contact");

  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<MessageContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<MessageContact | null>(null);
  const token = authService.getToken();
  const currentUserId = authService.getUserId();

  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!instituteId) return;
    setLoadingContacts(true);
    Promise.all([
      messageService.getContacts(instituteId),
      messageService.getUnreadCounts(instituteId),
    ]).then(([contactList, counts]) => {
      setContacts(contactList);
      setUnreadCounts(counts);
      setLoadingContacts(false);
    });
  }, [instituteId]);

  useEffect(() => {
    if (!contactParam || contacts.length === 0 || selectedContact) return;
    const target = contacts.find((c) => c.id === contactParam);
    if (target) handleSelectContact(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactParam, contacts]);

  const handleNewMessage = useCallback((msg: Message) => {
    const active = selectedContactRef.current;
    if (active && msg.senderId === active.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } else {
      setUnreadCounts((prev) => ({ ...prev, [msg.senderId]: (prev[msg.senderId] || 0) + 1 }));
    }
  }, []);

  const handleMessageSent = useCallback((msg: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id.startsWith("temp-") && m.content === msg.content ? msg : m))
    );
  }, []);

  useMessageSocket(token, handleNewMessage, handleMessageSent);

  const handleSelectContact = async (contact: MessageContact) => {
    setSelectedContact(contact);
    setMessages([]);
    setLoadingMessages(true);
    const msgs = await messageService.getConversation(instituteId, contact.id);
    setMessages(msgs);
    setUnreadCounts((prev) => ({ ...prev, [contact.id]: 0 }));
    setLoadingMessages(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedContact || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content: text,
      senderId: currentUserId || "",
      recipientId: selectedContact.id,
      isRead: false,
      isMine: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const sent = await messageService.sendMessage(instituteId, selectedContact.id, text);
    if (!sent) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 h-[calc(100vh-9rem)] min-h-[600px] rounded-2xl overflow-hidden bg-white dark:bg-gray-900">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="bg-gray-50 dark:bg-gray-800/60 flex flex-col overflow-hidden">
          {/* Sidebar header */}
          <div className="px-5 py-4">
            <p className="text-base font-semibold text-gray-800 dark:text-white">Conversations</p>
            {!loadingContacts && contacts.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{contacts.length} teacher{contacts.length !== 1 ? "s" : ""}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex flex-col gap-1 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3 py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ChatIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No teachers yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Enroll in a course to start messaging.</p>
              </div>
            ) : (
              <div className="py-2">
                {contacts.map((contact) => {
                  const fullName = `${contact.firstName} ${contact.lastName}`;
                  const isSelected = selectedContact?.id === contact.id;
                  const unread = unreadCounts[contact.id] || 0;
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full text-left px-4 py-3.5 flex items-center gap-3.5 transition-all rounded-xl mx-1 mb-0.5 ${
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-500/10"
                          : "hover:bg-gray-50 dark:hover:bg-white/4"
                      }`}
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <div className="relative shrink-0">
                        <Avatar name={fullName} picture={contact.profilePicture} size="11" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${unread > 0 ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-200"}`}>
                            {fullName}
                          </p>
                          {unread > 0 && (
                            <span className="shrink-0 bg-brand-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {contact.courses.map((c) => c.name).join(", ")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 flex items-center gap-4 shrink-0 bg-white dark:bg-gray-900">
                <div className="relative shrink-0">
                  <Avatar
                    name={`${selectedContact.firstName} ${selectedContact.lastName}`}
                    picture={selectedContact.profilePicture}
                    size="12"
                  />
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-base">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {selectedContact.courses.map((c) => c.name).join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeacherDetails(true)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors shrink-0"
                  title="View teacher details"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <ChatIcon className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Say hello to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const prevMsg = messages[i - 1];
                    const showDateSep =
                      !prevMsg ||
                      new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                    return (
                      <React.Fragment key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium px-2">
                              {new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                            </span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                          </div>
                        )}
                        <div className={`flex items-end gap-3 ${msg.isMine ? "flex-row-reverse" : "flex-row"}`}>
                          {!msg.isMine && (
                            <Avatar
                              name={`${selectedContact.firstName} ${selectedContact.lastName}`}
                              picture={selectedContact.profilePicture}
                              size="8"
                            />
                          )}
                          <div className={`max-w-[65%] flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                msg.isMine
                                  ? "bg-linear-to-br from-brand-500 to-indigo-500 text-white rounded-br-sm"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4 shrink-0">
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedContact.firstName}…`}
                    className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PaperPlaneIcon className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-brand-50 to-indigo-50 dark:from-brand-500/10 dark:to-indigo-500/10 flex items-center justify-center">
                <ChatIcon className="w-10 h-10 text-brand-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">Your messages</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Select a teacher from the left to start a conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTeacherDetails && selectedContact && (
        <TeacherDetailsModal contact={selectedContact} onClose={() => setShowTeacherDetails(false)} />
      )}
    </>
  );
}
