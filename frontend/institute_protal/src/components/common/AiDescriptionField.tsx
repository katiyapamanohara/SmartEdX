"use client";
import React, { useState } from "react";
import { FiZap, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";

interface AiDescriptionFieldProps {
  /** Current textarea value */
  value: string;
  /** Called when the value changes (typing or AI generation) */
  onChange: (value: string) => void;
  /** Placeholder for the textarea */
  placeholder?: string;
  /** Number of rows for the textarea */
  rows?: number;
  /** Optional hint sent to the AI as context (e.g. course name) */
  context?: string;
  /** Label shown above the textarea */
  label?: string;
  /** Tailwind classes for the textarea */
  textareaClassName?: string;
}

const AiDescriptionField: React.FC<AiDescriptionFieldProps> = ({
  value,
  onChange,
  placeholder = "Enter a description...",
  rows = 3,
  context,
  label = "Description",
  textareaClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white",
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/description/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), context: context || undefined }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      onChange(data.description);
      setPanelOpen(false);
      setPrompt("");
    } catch (err: any) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <button
          type="button"
          onClick={() => { setPanelOpen((p) => !p); setError(null); }}
          className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          <FiZap className="w-3.5 h-3.5" />
          Generate with AI
          {panelOpen ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* AI prompt panel */}
      {panelOpen && (
        <div className="mb-2 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
          <p className="text-xs text-violet-700 dark:text-violet-300 font-medium mb-2">
            Describe what you want — AI will write the description for you.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
              placeholder='e.g. "A beginner Python course covering loops and functions"'
              className="flex-1 px-3 py-1.5 text-sm border border-violet-300 dark:border-violet-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <FiZap className="w-3.5 h-3.5" />
                  Generate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setPanelOpen(false); setError(null); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={textareaClassName}
      />
    </div>
  );
};

export default AiDescriptionField;
