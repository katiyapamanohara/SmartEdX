"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { TaskIcon } from "@/icons";
import { FiMic } from "react-icons/fi";
import { instituteService, StudentAssessmentGroup } from "@/services/instituteService";
import { authService } from "@/services/authService";
import VoiceAssessmentPlayer from "@/components/student/VoiceAssessmentPlayer";

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

type AssessmentItem = {
  id: string;
  type: "exam" | "quiz" | "voice";
  courseName: string;
  moduleTitle: string;
  title: string;
  description?: string;
  questionCount: number;
  passingScore: number;
  timeLimit: number;
  totalMarks?: number;
  voiceQuestions?: VoiceQuestion[];
  createdAt?: string;
};

export default function StudentAssignmentsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<StudentAssessmentGroup[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [attemptScores, setAttemptScores] = useState<Record<string, number>>({});
  const [voicePlayerOpen, setVoicePlayerOpen] = useState(false);
  const [activeVoiceItem, setActiveVoiceItem] = useState<AssessmentItem | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyStudentAssessments(instituteId);
        setGroups(data);
        
        // Track which quizzes have been attempted by current user
        const userId = authService.getUserId();
        if (userId) {
          const attempted = new Set<string>();
          const scores: Record<string, number> = {};
          for (const g of data) {
            for (const q of g.quizzes) {
              const attempts = q.content.studentAttempts || {};
              if (attempts[userId]) {
                attempted.add(q.content.id);
                scores[q.content.id] = attempts[userId].score ?? 0;
              }
            }
          }
          setAttemptedIds(attempted);
          setAttemptScores(scores);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const items = useMemo<AssessmentItem[]>(() => {
    return groups.flatMap((g) =>
      g.quizzes.map(({ content, module }) => {
        const isVoice = (content.quizData as any)?.assessmentType === "voice";
        const t = `${content.title} ${module.title}`.toLowerCase();
        const type: "exam" | "quiz" | "voice" = isVoice
          ? "voice"
          : t.includes("exam")
          ? "exam"
          : "quiz";
        return {
          id: content.id,
          type,
          courseName: g.course.name,
          moduleTitle: module.title,
          title: content.title,
          description: content.description,
          questionCount: isVoice
            ? ((content.quizData as any)?.voiceQuestions?.length ?? 0)
            : (content.quizData?.questions?.length ?? 0),
          passingScore: content.quizData?.passingScore ?? 70,
          timeLimit: content.quizData?.timeLimit ?? 0,
          totalMarks: (content.quizData as any)?.totalMarks,
          voiceQuestions: isVoice ? (content.quizData as any)?.voiceQuestions : undefined,
          createdAt: content.createdAt,
        };
      }),
    );
  }, [groups]);

  const stats = useMemo(() => {
    const exams = items.filter((i) => i.type === "exam").length;
    const quizzes = items.filter((i) => i.type === "quiz").length;
    const voice = items.filter((i) => i.type === "voice").length;
    const completed = items.filter((i) => attemptedIds.has(i.id)).length;
    return { total: items.length, exams, quizzes, voice, completed };
  }, [items, attemptedIds]);

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View quizzes and exams assigned from your enrolled courses
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total", value: loading ? "-" : String(stats.total) },
          { label: "Exams", value: loading ? "-" : String(stats.exams) },
          { label: "Quizzes", value: loading ? "-" : String(stats.quizzes) },
          { label: "Voice", value: loading ? "-" : String(stats.voice) },
          { label: "Completed", value: loading ? "-" : String(stats.completed) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/3"
            >
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center dark:border-gray-700 dark:bg-white/3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <TaskIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No assessments yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Quizzes and exams will appear here once your teacher creates them.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.courseName} • {item.moduleTitle}
                  </p>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    item.type === "exam"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      : item.type === "voice"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                  }`}
                >
                  {item.type === "exam" ? "Exam" : item.type === "voice" ? "Voice" : "Quiz"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {item.questionCount} question{item.questionCount !== 1 ? "s" : ""}
                  {item.type === "voice" && item.totalMarks ? ` • ${item.totalMarks} marks` : ""}
                  {item.type !== "voice" && item.timeLimit > 0 ? ` • ${item.timeLimit} min` : ""}
                  {item.type !== "voice" ? ` • Pass ${item.passingScore}%` : ""}
                </span>

                {item.type === "voice" ? (
                  <button
                    onClick={() => {
                      setActiveVoiceItem(item);
                      setVoicePlayerOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm shadow-purple-500/20"
                  >
                    <FiMic className="w-3 h-3" /> Start Interview
                  </button>
                ) : attemptedIds.has(item.id) ? (
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      (attemptScores[item.id] ?? 0) >= item.passingScore
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    }`}>
                      {(attemptScores[item.id] ?? 0) >= item.passingScore ? "Passed" : "Failed"} · {attemptScores[item.id] ?? 0}%
                    </span>
                    <Link
                      href={`/${instituteId}/student/assignments/${item.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      View Review
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/${instituteId}/student/assignments/${item.id}`}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    Start
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VoiceAssessmentPlayer
        isOpen={voicePlayerOpen}
        onClose={() => { setVoicePlayerOpen(false); setActiveVoiceItem(null); }}
        assessmentData={activeVoiceItem ? {
          id: activeVoiceItem.id,
          title: activeVoiceItem.title,
          instructions: activeVoiceItem.description,
          questions: activeVoiceItem.voiceQuestions ?? [],
        } : undefined}
      />
    </div>
  );
}
