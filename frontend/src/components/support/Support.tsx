"use client";
import { useEffect, useState } from "react";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function SupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { user } = useCurrentUser();

  const CHATWOOT_BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL
  const INBOX_IDENTIFIER = process.env.NEXT_PUBLIC_INBOX_IDENTIFIER

  const clearError = () => setError("");

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  interface ContactResponse {
    source_id: string;
    [key: string]: unknown;
  }

  interface ConversationResponse {
    id: string;
    [key: string]: unknown;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Create contact
      const contactRes = await fetch(
        `${CHATWOOT_BASE_URL}/public/api/v1/inboxes/${INBOX_IDENTIFIER}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user?.email || "Unknown User",
            name: user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : "Unknown User"
          }),
        }
      );
      if (!contactRes.ok) throw new Error("Failed to create contact");
      const contactData: ContactResponse = await contactRes.json();
      const sourceId = contactData.source_id;

      // Create conversation
      const convRes = await fetch(
        `${CHATWOOT_BASE_URL}/public/api/v1/inboxes/${INBOX_IDENTIFIER}/contacts/${sourceId}/conversations`,
        { method: "POST" }
      );
      if (!convRes.ok) throw new Error("Failed to create conversation");
      const convData: ConversationResponse = await convRes.json();
      const conversationId = convData.id;

      // Send first message
      const msgRes = await fetch(
        `${CHATWOOT_BASE_URL}/public/api/v1/inboxes/${INBOX_IDENTIFIER}/contacts/${sourceId}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${subject}\n\n${message}`,
            message_type: "incoming",
          }),
        }
      );
      if (!msgRes.ok) throw new Error("Failed to send message");

      setSuccess(true);
      setSubject("");
      setMessage("");
    } catch (err: unknown | null) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Create Support Ticket
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tell us about your issue and we&apos;ll help you resolve it
        </p>
      </div>

      <div className="grid grid-cols-12 gap-y-6 gap-x-6 items-start">
        {/* Subject Field */}
        <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
          Subject
          <span className="text-red-500 ml-1">*</span>
          <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
            Brief description of your issue
          </p>
        </div>
        <div className="col-span-8">
          <Input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              clearError();
            }}
            placeholder="Brief description of your issue"
          />
        </div>

        {/* Message Field */}
        <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
          Description
          <span className="text-red-500 ml-1">*</span>
          <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
            Please describe your issue in detail
          </p>
        </div>
        <div className="col-span-8">
          <TextArea
            value={message}
            onChange={(value) => {
              setMessage(value);
              clearError();
            }}
            placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information..."
            // onKeyDown={handleKeyPress}
            rows={5}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Press Ctrl+Enter to submit quickly
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="col-span-12">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">Ticket submitted successfully!</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">We&apos;ll get back to you soon.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="col-span-12">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">Something went wrong</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="col-span-12 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !message.trim()}
            className={`w-full px-6 py-3 font-medium rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 ${loading || !subject.trim() || !message.trim()
              ? 'bg-gray-300 cursor-not-allowed text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
        </div>

        {/* Help Text */}
        <div className="col-span-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Need immediate help?</p>
              <p>For urgent issues, you can also reach us through our live chat or call our support hotline.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}