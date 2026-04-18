"use client";

import { useEffect, useState } from "react";
import { instituteService } from "@/services/instituteService";

interface RecommendationData {
  overallAverage: number;
  weakTopics: Array<{ topic: string; score: number; maxScore: number }>;
  strongTopics: Array<{ topic: string; score: number; maxScore: number }>;
  contentResults: Array<{
    contentId: string;
    title: string;
    courseId: string;
    courseName: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  recommendations: string[];
  studyPlan: string;
}

export default function AdaptiveLearningPanel({
  instituteId,
}: {
  instituteId: string;
}) {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);
    instituteService
      .getAdaptiveRecommendations(instituteId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [instituteId]);

  // Don't render if no quiz attempts yet
  if (!loading && (!data || data.contentResults.length === 0)) return null;

  const scoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-600 dark:text-green-400";
    if (pct >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  const barColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <section
      aria-labelledby="adaptive-panel-heading"
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="text-brand-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547Z"
              />
            </svg>
          </div>
          <div>
            <h2
              id="adaptive-panel-heading"
              className="font-semibold text-gray-900 dark:text-white text-sm"
            >
              Adaptive Learning
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Personalised study recommendations
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="adaptive-panel-body"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label={expanded ? "Collapse adaptive learning panel" : "Expand adaptive learning panel"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        id="adaptive-panel-body"
        hidden={!expanded}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <div className="p-5 space-y-3" aria-label="Loading recommendations">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"
              />
            ))}
          </div>
        ) : data ? (
          <div className="p-5 flex flex-col gap-6">
            {/* Overall score */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0"
                style={{
                  borderColor:
                    data.overallAverage >= 70 ? "#22c55e" : data.overallAverage >= 50 ? "#f59e0b" : "#ef4444",
                }}
                role="img"
                aria-label={`Overall average ${data.overallAverage}%`}
              >
                <span className={`text-sm font-bold ${scoreColor(data.overallAverage)}`}>
                  {data.overallAverage}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Overall average across all quizzes
                </p>
                {data.weakTopics.length > 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {data.weakTopics.length} topic{data.weakTopics.length !== 1 ? "s" : ""} need attention
                  </p>
                ) : (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Great performance across all topics!
                  </p>
                )}
              </div>
            </div>

            {/* Topic breakdown */}
            {data.contentResults.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Quiz Performance
                </h3>
                <ul className="flex flex-col gap-2" role="list" aria-label="Quiz topic performance">
                  {data.contentResults
                    .sort((a, b) => a.percentage - b.percentage)
                    .slice(0, 6)
                    .map((item) => (
                      <li key={item.contentId} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={item.title}>
                              {item.title}
                            </span>
                            <span className={`text-xs font-semibold shrink-0 ${scoreColor(item.percentage)}`}>
                              {item.percentage}%
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={item.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${item.title}: ${item.percentage}%`}
                          >
                            <div
                              className={`h-full rounded-full transition-all ${barColor(item.percentage)}`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* AI Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Personalised Recommendations
                </h3>
                <ol className="flex flex-col gap-2" aria-label="Study recommendations">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {rec}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Study Plan */}
            {data.studyPlan && (
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 px-4 py-3">
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Your Study Plan
                </p>
                <p className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
                  {data.studyPlan}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
