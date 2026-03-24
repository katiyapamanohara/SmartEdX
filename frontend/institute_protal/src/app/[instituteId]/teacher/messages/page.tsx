"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatIcon, PaperPlaneIcon } from "@/icons";
import { messageService, MessageContact, Message } from "@/services/messageService";
import { authService } from "@/services/authService";
import { useMessageSocket } from "@/hooks/useMessageSocket";

function Avatar({
  name,
  picture,
  size = 10,
}: {
  name: string;
  picture?: string;
  size?: number;
}) {
  const sizeClass = `w-${size} h-${size}`;
  if (picture) {
    return (
      <img src={picture} alt={name} className={`${sizeClass} rounded-full object-cover shrink-0`} />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm shrink-0`}
    >
      {initials}
    </div>
  );
}

function StudentDetailPanel({
  contact,
  onClose,
  onMessage,
}: {
  contact: MessageContact;
  onClose: () => void;
  onMessage: () => void;
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`;
  return (
    <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Student Details</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-gray-100 dark:border-gray-700">
        <Avatar name={fullName} picture={contact.profilePicture} size={16} />
        <div className="text-center">
          <p className="font-semibold text-gray-800 dark:text-white">{fullName}</p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{contact.role}</p>
        </div>
        <button
          onClick={onMessage}
          className="w-full mt-1 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
        >
          Send Message
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{contact.email}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Enrolled Courses
          </p>
          {contact.courses.length === 0 ? (
            <p className="text-sm text-gray-400">No shared courses</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {contact.courses.map((c) => (
                <div
                  key={c.id}
                  className="text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 px-3 py-1.5 rounded-lg"
                >
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherMessagesPage() {
  const params = useParams();
  const instituteId = params.instituteId as string;

  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [filtered, setFiltered] = useState<MessageContact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<MessageContact | null>(null);
  const [detailContact, setDetailContact] = useState<MessageContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<MessageContact | null>(null);
  const token = authService.getToken();
  const currentUserId = authService.getUserId();

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load contacts
  useEffect(() => {
    if (!instituteId) return;
    setLoadingContacts(true);
    Promise.all([
      messageService.getContacts(instituteId),
      messageService.getUnreadCounts(instituteId),
    ]).then(([list, counts]) => {
      setContacts(list);
      setFiltered(list);
      setUnreadCounts(counts);
      setLoadingContacts(false);
    });
  }, [instituteId]);

  // Search filter
  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      contacts.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.courses.some((co) => co.name.toLowerCase().includes(term))
      )
    );
  }, [search, contacts]);

  // WebSocket: incoming messages from students
  const handleNewMessage = useCallback((msg: Message) => {
    const active = selectedContactRef.current;
    if (active && msg.senderId === active.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } else {
      setUnreadCounts((prev) => ({
        ...prev,
        [msg.senderId]: (prev[msg.senderId] || 0) + 1,
      }));
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-brand-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {totalUnread}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Communicate with your students
        </p>
      </div>

      <div
        className="flex rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: "520px" }}
      >
        {/* Contact list */}
        <div className="w-72 shrink-0 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-white/3 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-white/5 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex flex-col">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 animate-pulse border-b border-gray-50 dark:border-gray-800"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-2 py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search ? "No students found." : "No students in your courses yet."}
                </p>
              </div>
            ) : (
              filtered.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName}`;
                const isSelected = selectedContact?.id === contact.id;
                const unread = unreadCounts[contact.id] || 0;
                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/4 transition-colors border-b border-gray-50 dark:border-gray-800 ${
                      isSelected ? "bg-brand-50 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <Avatar name={fullName} picture={contact.profilePicture} size={10} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-sm truncate ${
                            unread > 0
                              ? "font-bold text-gray-900 dark:text-white"
                              : "font-medium text-gray-800 dark:text-white/90"
                          }`}
                        >
                          {fullName}
                        </span>
                        {unread > 0 && (
                          <span className="shrink-0 bg-brand-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {contact.courses.map((c) => c.name).join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat pane */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-white/1 min-w-0">
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 flex items-center gap-3 shrink-0">
                <Avatar
                  name={`${selectedContact.firstName} ${selectedContact.lastName}`}
                  picture={selectedContact.profilePicture}
                  size={9}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedContact.courses.map((c) => c.name).join(", ")}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setDetailContact(
                      detailContact?.id === selectedContact.id ? null : selectedContact
                    )
                  }
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    detailContact?.id === selectedContact.id
                      ? "bg-brand-500 text-white border-brand-500"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {detailContact?.id === selectedContact.id ? "Hide Info" : "View Info"}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!msg.isMine && (
                        <Avatar
                          name={`${selectedContact.firstName} ${selectedContact.lastName}`}
                          picture={selectedContact.profilePicture}
                          size={7}
                        />
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          msg.isMine
                            ? "bg-brand-500 text-white rounded-br-sm"
                            : "bg-white dark:bg-white/7 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.isMine ? "text-white/60 text-right" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${selectedContact.firstName}…`}
                  className="flex-1 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:border-brand-400 dark:focus:border-brand-500 text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperPlaneIcon className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <ChatIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">Select a conversation</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Choose a student from the left to view their messages.
              </p>
            </div>
          )}
        </div>

        {/* Student detail panel */}
        {detailContact && (
          <StudentDetailPanel
            contact={detailContact}
            onClose={() => setDetailContact(null)}
            onMessage={() => {
              handleSelectContact(detailContact);
              setDetailContact(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
