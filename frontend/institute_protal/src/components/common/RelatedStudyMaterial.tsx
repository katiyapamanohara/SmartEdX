"use client";
import { useState, useCallback } from "react";
import { instituteService } from "@/services/instituteService";

type KbResult = {
  content: string;
  page: number | null;
  title: string;
  score: number;
};

/**
 * Expandable "Show related study material" button that lazy-fetches
 * semantically related course KB content from Qdrant.
 *
 * Used on both the student and teacher performance pages.
 */
export function RelatedStudyMaterial({
  instituteId,
  courseId,
  questionText,
}: {
  instituteId: string;
  courseId: string;
  questionText: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KbResult[] | null>(null);

  const load = useCallback(async () => {
    if (results !== null) return; // already fetched
    setLoading(true);
    try {
      const data = await instituteService.searchCourseKB(instituteId, courseId, questionText);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [instituteId, courseId, questionText, results]);

  const toggle = () => {
    if (!open && results === null) load();
    setOpen((v) => !v);
  };

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        <span>{open ? "▾" : "▸"}</span>
        {open ? "Hide" : "Show"} related study material
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-500/6 p-3 flex flex-col gap-2">
          {loading && (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg"
                />
              ))}
            </div>
          )}

          {!loading && results !== null && results.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              No course material found for this topic yet. Make sure PDFs / documents are uploaded
              for this course.
            </p>
          )}

          {!loading &&
            results !== null &&
            results.map((r, i) => (
              <div
                key={i}
                className="rounded-lg bg-white dark:bg-white/4 border border-blue-100 dark:border-blue-900/30 p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                    📄 {r.title || "Course Material"}
                    {r.page ? ` · p.${r.page}` : ""}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {Math.round(r.score * 100)}% match
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
                  {r.content}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
