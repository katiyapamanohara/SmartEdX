"use client";
import React from "react";
import { createPortal } from "react-dom";
import { ModuleContent, QuizQuestion } from "@/services/instituteService";
import { FiX, FiCheckCircle, FiClock, FiAward, FiHelpCircle } from "react-icons/fi";

interface QuizViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ModuleContent | null;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

const QuizViewModal: React.FC<QuizViewModalProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen || !content) return null;

  const quiz = content.quizData;
  const questions: QuizQuestion[] = quiz?.questions ?? [];

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <FiHelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{content.title}</h2>
              {content.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{content.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Stats bar */}
        {quiz && (
          <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FiHelpCircle className="w-4 h-4" />
              <span><span className="font-semibold text-gray-900 dark:text-white">{questions.length}</span> Questions</span>
            </div>
            {quiz.passingScore !== undefined && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiAward className="w-4 h-4" />
                <span>Pass: <span className="font-semibold text-gray-900 dark:text-white">{quiz.passingScore}%</span></span>
              </div>
            )}
            {quiz.timeLimit > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiClock className="w-4 h-4" />
                <span><span className="font-semibold text-gray-900 dark:text-white">{quiz.timeLimit}</span> min</span>
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {questions.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-10">
              This quiz has no questions yet.
            </p>
          ) : (
            questions.map((q, qi) => (
              <div
                key={q.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                {/* Question header */}
                <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                    {qi + 1}
                  </span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                    {q.question}
                  </p>
                </div>

                {/* Options */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.correctAnswer;
                    return (
                      <div
                        key={oi}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isCorrect
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-white dark:bg-gray-900"
                        }`}
                      >
                        {/* Letter badge */}
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                            isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {OPTION_LETTERS[oi]}
                        </span>

                        <span
                          className={`text-sm flex-1 ${
                            isCorrect
                              ? "text-green-800 dark:text-green-300 font-medium"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {opt}
                        </span>

                        {isCorrect && (
                          <FiCheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-semibold">Explanation: </span>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
};

export default QuizViewModal;
