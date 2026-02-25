"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ModuleContent, ContentType } from "@/services/instituteService";
import {
  FiX,
  FiFile,
  FiVideo,
  FiFileText,
  FiHelpCircle,
  FiLink,
} from "react-icons/fi";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: ModuleContent | null;
}

// ─── Per-type config ─────────────────────────────────────────────
const TYPE_META: Record<
  ContentType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    urlLabel: string;
    urlPlaceholder: string;
    urlRequired: boolean;
    urlHint?: string;
    descPlaceholder: string;
    showUrl: boolean;
  }
> = {
  pdf: {
    label: "PDF Document",
    icon: <FiFile className="w-5 h-5" />,
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    urlLabel: "PDF URL",
    urlPlaceholder: "https://example.com/document.pdf",
    urlRequired: true,
    urlHint: "Direct link to a PDF file (Google Drive, Dropbox, server URL, etc.)",
    descPlaceholder: "Describe what students will find in this PDF…",
    showUrl: true,
  },
  video: {
    label: "Video",
    icon: <FiVideo className="w-5 h-5" />,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    urlLabel: "Video URL",
    urlPlaceholder: "https://youtube.com/watch?v=… or https://vimeo.com/…",
    urlRequired: true,
    urlHint: "YouTube, Vimeo, or any direct video link",
    descPlaceholder: "What will students learn from this video?",
    showUrl: true,
  },
  document: {
    label: "Document",
    icon: <FiFileText className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    urlLabel: "Document URL",
    urlPlaceholder: "https://docs.google.com/… or any document link",
    urlRequired: false,
    urlHint: "Google Docs, Word Online, Notion, or any shareable doc link",
    descPlaceholder: "Describe the document content…",
    showUrl: true,
  },
  quiz: {
    label: "Quiz",
    icon: <FiHelpCircle className="w-5 h-5" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    urlLabel: "Quiz URL (optional)",
    urlPlaceholder: "https://forms.google.com/… or any quiz platform link",
    urlRequired: false,
    urlHint: "Google Forms, Typeform, or any online quiz. Leave blank for in-app quizzes.",
    descPlaceholder: "Instructions for the quiz — topics covered, time limit, number of questions…",
    showUrl: true,
  },
  link: {
    label: "External Link",
    icon: <FiLink className="w-5 h-5" />,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    urlLabel: "Link URL",
    urlPlaceholder: "https://…",
    urlRequired: true,
    urlHint: "Any external web page, article, or resource",
    descPlaceholder: "Describe what students will find at this link…",
    showUrl: true,
  },
};

const CONTENT_TYPES = Object.entries(TYPE_META).map(([value, meta]) => ({
  value: value as ContentType,
  label: meta.label,
}));

// ─── Input / label helpers ───────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const Label = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Hint = ({ text }: { text: string }) => (
  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{text}</p>
);

// ─── Modal ────────────────────────────────────────────────────────
const ContentModal: React.FC<ContentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "document" as ContentType,
    url: "",
    order: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = TYPE_META[formData.type];

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || "",
        type: initialData.type,
        url: initialData.url || "",
        order: initialData.order,
      });
    } else {
      setFormData({ title: "", description: "", type: "document", url: "", order: 0 });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // When type changes, clear url so stale links don't carry over
    if (name === "type") {
      setFormData((prev) => ({ ...prev, type: value as ContentType, url: "" }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "order" ? parseInt(value) || 0 : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? "Edit Content" : "Add Content"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Content Type selector ─────────────────────────────── */}
          <div>
            <Label>Content Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {CONTENT_TYPES.map((t) => {
                const m = TYPE_META[t.value];
                const active = formData.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      handleChange({
                        target: { name: "type", value: t.value },
                      } as any)
                    }
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg ${active ? m.color : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                      {m.icon}
                    </span>
                    <span className={`text-xs font-medium leading-tight ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Title ─────────────────────────────────────────────── */}
          <div>
            <Label required>Title</Label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder={`Name for this ${meta.label.toLowerCase()}`}
              className={inputCls}
            />
          </div>

          {/* ── URL field – changes label/placeholder/hint per type */}
          {meta.showUrl && (
            <div>
              <Label required={meta.urlRequired}>{meta.urlLabel}</Label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required={meta.urlRequired}
                placeholder={meta.urlPlaceholder}
                className={inputCls}
              />
              {meta.urlHint && <Hint text={meta.urlHint} />}
            </div>
          )}

          {/* ── Description – changes placeholder per type ──────── */}
          <div>
            <Label>Description</Label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder={meta.descPlaceholder}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Order ─────────────────────────────────────────────── */}
          <div>
            <Label>Display Order</Label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              min={0}
              className={inputCls}
            />
            <Hint text="Lower numbers appear first. Items with the same order number are sorted by creation date." />
          </div>

          {/* ── Actions ───────────────────────────────────────────── */}
          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? "Saving…" : initialData ? "Update Content" : "Add Content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
};

export default ContentModal;
