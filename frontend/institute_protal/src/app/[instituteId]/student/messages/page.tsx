"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatIcon, PaperPlaneIcon } from "@/icons";
import { messageService, MessageContact, Message } from "@/services/messageService";
import { authService } from "@/services/authService";

function Avatar({ name, picture, size = 9 }: { name: string; picture?: string; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function StudentMessagesPage() {
  const params = useParams();
  const instituteId = params.instituteId as string;

  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<MessageContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = authService.getUserId();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load contacts on mount
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

  const loadMessages = useCallback(
    async (contactId: string) => {
      const msgs = await messageService.getConversation(instituteId, contactId);
      setMessages(msgs);
      // Clear unread for this contact
      setUnreadCounts((prev) => ({ ...prev, [contactId]: 0 }));
    },
    [instituteId]
  );

  // Select a contact
  const handleSelectContact = async (contact: MessageContact) => {
    setSelectedContact(contact);
    setMessages([]);
    setLoadingMessages(true);
    await loadMessages(contact.id);
    setLoadingMessages(false);
  };

  // Poll for new messages every 3s when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedContact) return;

    pollRef.current = setInterval(() => {
      loadMessages(selectedContact.id);
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedContact, loadMessages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedContact || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
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
    if (sent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? sent : m))
      );
    } else {
      // Remove optimistic on failure
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
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Communicate with your teachers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Sidebar */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex flex-col gap-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-1 py-2 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">No teachers assigned yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Enroll in a course to start messaging.</p>
              </div>
            ) : (
              contacts.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName}`;
                const isSelected = selectedContact?.id === contact.id;
                const unread = unreadCounts[contact.id] || 0;

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                      isSelected ? "bg-brand-50 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <Avatar name={fullName} picture={contact.profilePicture} size={9} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {fullName}
                        </p>
                        {unread > 0 && (
                          <span className="ml-1 shrink-0 bg-brand-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
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

        {/* Chat Area */}
        <div className="md:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
                <Avatar
                  name={`${selectedContact.firstName} ${selectedContact.lastName}`}
                  picture={selectedContact.profilePicture}
                  size={9}
                />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedContact.courses.map((c) => c.name).join(", ")}
                  </p>
                </div>
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
                            : "bg-gray-100 dark:bg-white/7 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed wrap-break-word">{msg.content}</p>
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
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedContact.firstName}…`}
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
                Choose a teacher from the left to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
