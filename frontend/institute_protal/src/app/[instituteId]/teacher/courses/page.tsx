"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService, Course } from "@/services/instituteService";
import { FiLayers, FiSearch, FiBookOpen, FiX, FiCpu } from "react-icons/fi";
import { createPortal } from "react-dom";
import { useFeatures } from "@/context/InstituteFeatureContext";

const DEFAULT_STUDENT_INSTRUCTIONS =
  "You are an AI tutor for this course.\n" +
  "Your ONLY purpose is to help students understand and learn the content of this course.\n" +
  "Rules:\n" +
  "- Greetings and brief follow-ups: answer directly, no tool call.\n" +
  "- ANY question about course topics, concepts, or materials: search course material IMMEDIATELY.\n" +
  "- After search: answer in 1-2 sentences, cite the page if available.\n" +
  "- If nothing is found: say so in one sentence and suggest the student ask their teacher.\n" +
  "- OFF-TOPIC: redirect in one sentence back to the course.\n" +
  "- Always be brief — 1 to 2 sentences per turn.";

const DEFAULT_TEACHER_INSTRUCTIONS =
  "You are an AI assistant for the teacher of this course.\n" +
  "Your purpose is to help the teacher with lesson planning, content queries, and course material.\n" +
  "Rules:\n" +
  "- ANY question about course content or materials: search course material IMMEDIATELY.\n" +
  "- Answer in 1-2 sentences, cite page numbers where available.\n" +
  "- Help with curriculum planning, quiz creation ideas, and teaching strategies.\n" +
  "- OFF-TOPIC: redirect in one sentence back to educational topics.";

function AgentInstructionsModal({
  course,
  instituteId,
  onClose,
  onSaved,
}: {
  course: Course;
  instituteId: string;
  onClose: () => void;
  onSaved: (updated: Course) => void;
}) {
  const [studentInstructions, setStudentInstructions] = useState(
    course.studentAgentInstructions || DEFAULT_STUDENT_INSTRUCTIONS
  );
  const [teacherInstructions, setTeacherInstructions] = useState(
    course.teacherAgentInstructions || DEFAULT_TEACHER_INSTRUCTIONS
  );
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await instituteService.updateCourse(instituteId, course.id, {
        studentAgentInstructions: studentInstructions,
        teacherAgentInstructions: teacherInstructions,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      console.error("Failed to save agent instructions", e);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl my-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiCpu className="text-blue-500" />
              AI Agent Instructions
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{course.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student Agent Instructions
            </label>
            <textarea
              rows={7}
              value={studentInstructions}
              onChange={(e) => setStudentInstructions(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              How the AI behaves when students ask questions about this course.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teacher Agent Instructions
            </label>
            <textarea
              rows={7}
              value={teacherInstructions}
              onChange={(e) => setTeacherInstructions(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              How the AI behaves when you (the teacher) query this course's content.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving…
              </>
            ) : "Save Instructions"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const GRADIENTS = [
  "from-violet-600 via-purple-500 to-indigo-400",
  "from-blue-600 via-cyan-500 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-400",
  "from-amber-500 via-orange-400 to-yellow-300",
  "from-emerald-500 via-green-500 to-teal-400",
  "from-sky-600 via-blue-500 to-indigo-400",
];
const gradientFor = (id: string) => GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="h-28 bg-gray-200 dark:bg-gray-700" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>
    <div className="px-5 pb-5">
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  </div>
);

function CourseCard({
  course,
  instituteId,
  voiceAgentEnabled,
  onEditAgent,
}: {
  course: Course;
  instituteId: string;
  voiceAgentEnabled: boolean;
  onEditAgent: (course: Course) => void;
}) {
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Banner */}
      <div className="relative h-28 overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full bg-linear-to-br ${gradientFor(course.id)} group-hover:scale-105 transition-transform duration-500`}
          />
        )}
        {course.batchNumber && (
          <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold bg-black/30 text-white rounded-full backdrop-blur-sm">
            Batch {course.batchNumber}
          </span>
        )}
        <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-bold bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/30">
          {course.code}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-2">
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2" title={course.name}>
          {course.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {course.description || "No description provided."}
        </p>
        {course.moduleCount !== undefined && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{course.moduleCount} module{course.moduleCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex flex-col gap-2">
        <a
          href={`/${instituteId}/teacher/courses/${course.id}/modules`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <FiLayers className="w-4 h-4" />
          Manage Content
        </a>
        {voiceAgentEnabled && (
          <button
            type="button"
            onClick={() => onEditAgent(course)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold rounded-xl transition-colors"
          >
            <FiCpu className="w-4 h-4" />
            AI Agent Instructions
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeacherCoursesPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const { hasFeature } = useFeatures();
  const voiceAgentEnabled = hasFeature("voice_agent");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agentCourse, setAgentCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyTeacherCourses(instituteId);
        setCourses(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? "Loading…" : `${courses.length} course${courses.length !== 1 ? "s" : ""} assigned to you`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <FiBookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {search ? "No courses match your search" : "No courses assigned yet"}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {search ? "Try a different keyword." : "Contact your institute admin to get courses assigned."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              instituteId={instituteId}
              voiceAgentEnabled={voiceAgentEnabled}
              onEditAgent={setAgentCourse}
            />
          ))}
        </div>
      )}

      {agentCourse && (
        <AgentInstructionsModal
          course={agentCourse}
          instituteId={instituteId}
          onClose={() => setAgentCourse(null)}
          onSaved={(updated) =>
            setCourses((prev) =>
              prev.map((c) =>
                c.id === updated.id
                  ? { ...c, studentAgentInstructions: updated.studentAgentInstructions, teacherAgentInstructions: updated.teacherAgentInstructions }
                  : c
              )
            )
          }
        />
      )}
    </div>
  );
}
