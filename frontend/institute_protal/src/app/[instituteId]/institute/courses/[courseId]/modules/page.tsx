"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CourseModule,
  ModuleContent,
  ContentType,
  instituteService,
  Course,
} from "@/services/instituteService";
import {
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiArrowLeft,
  FiFile,
  FiVideo,
  FiLink,
  FiFileText,
  FiHelpCircle,
  FiExternalLink,
} from "react-icons/fi";
import ModuleModal from "./components/ModuleModal";

// ─── Type config ────────────────────────────────────────────────
const TYPE_CONFIG: Record<ContentType, { icon: React.ReactNode; label: string; iconBg: string; iconColor: string }> = {
  pdf: {
    icon: <FiFile className="w-5 h-5" />,
    label: "PDF",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  video: {
    icon: <FiVideo className="w-5 h-5" />,
    label: "Video",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  document: {
    icon: <FiFileText className="w-5 h-5" />,
    label: "Document",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  quiz: {
    icon: <FiHelpCircle className="w-5 h-5" />,
    label: "Quiz",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  link: {
    icon: <FiLink className="w-5 h-5" />,
    label: "Link",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
};

// ─── Single content row ─────────────────────────────────────────
function ContentRow({ content }: { content: ModuleContent }) {
  const cfg = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.document;
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors group ">
      {/* Colored type icon */}
      <div className={`mt-0.5 w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>
      {/* Title + description */}
      <div className="flex-1 min-w-0">
        {content.url ? (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm leading-snug flex items-center gap-1.5"
          >
            {content.title}
            <FiExternalLink className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
          </a>
        ) : (
          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm leading-snug">{content.title}</p>
        )}
        {content.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {content.description}
          </p>
        )}
        <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          {cfg.label}
        </span>
      </div>
      {/* Open button */}
      {content.url && (
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 hidden group-hover:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-0.5"
        >
          Open
        </a>
      )}
    </div>
  );
}

// ─── Module accordion ────────────────────────────────────────────
interface ModuleAccordionProps {
  module: CourseModule;
  instituteId: string;
  courseId: string;
  forceOpen?: boolean;  // controlled by parent Expand/Collapse all
  onEditModule: (m: CourseModule) => void;
  onDeleteModule: (id: string) => void;
}

function ModuleAccordion({ module, instituteId, courseId, forceOpen = false, onEditModule, onDeleteModule }: ModuleAccordionProps) {
  const [open, setOpen] = useState(forceOpen);
  const [contents, setContents] = useState<ModuleContent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Respond to parent Expand all / Collapse all
  useEffect(() => {
    if (forceOpen && !loaded) {
      // Auto-fetch contents when force-expanded for the first time
      setLoading(true);
      instituteService
        .getModuleContents(instituteId, courseId, module.id)
        .then((data) => {
          setContents(data);
          setLoaded(true);
        })
        .finally(() => setLoading(false));
    }
    setOpen(forceOpen);
  }, [forceOpen]);

  const toggle = async () => {
    if (!loaded && !open) {
      setLoading(true);
      const data = await instituteService.getModuleContents(instituteId, courseId, module.id);
      setContents(data);
      setLoaded(true);
      setLoading(false);
    }
    setOpen((p) => !p);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-blue-300 dark:border-blue-700 shadow-md" : "border-gray-200 dark:border-gray-700 shadow-sm"} bg-white dark:bg-gray-800`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors select-none"
        onClick={toggle}
      >
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${open ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
          {open ? (
            <FiChevronDown className="w-4 h-4" />
          ) : (
            <FiChevronRight className="w-4 h-4" />
          )}
        </span>
        <h2 className="flex-1 font-bold text-gray-900 dark:text-white text-base leading-snug">{module.title}</h2>
        {/* Module actions */}
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEditModule(module)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteModule(module.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {module.description && (
            <p className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 italic border-b border-gray-100 dark:border-gray-700">
              {module.description}
            </p>
          )}
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2" />
              Loading contents…
            </div>
          ) : contents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No content yet for this module.
            </div>
          ) : (
            <div>
              {contents.map((c) => (
                <ContentRow key={c.id} content={c} />
              ))}
            </div>
          )}
          {/* Manage contents footer */}
          <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <a
              href={`/${instituteId}/institute/courses/${courseId}/modules/${module.id}/contents`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              + Manage contents
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function ModulesPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    if (instituteId && courseId) fetchData();
  }, [instituteId, courseId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const courses = await instituteService.getCourses(instituteId);
      const matched = courses.find((c) => c.id === courseId);
      if (matched) setCourse(matched);
      const mods = await instituteService.getCourseModules(instituteId, courseId);
      setModules(mods);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Delete this module?")) return;
    await instituteService.deleteCourseModule(instituteId, courseId, id);
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const handleModalSubmit = async (data: any) => {
    if (editingModule) {
      const updated = await instituteService.updateCourseModule(instituteId, courseId, editingModule.id, data);
      setModules((prev) => prev.map((m) => (m.id === editingModule.id ? updated : m)));
    } else {
      const created = await instituteService.createCourseModule(instituteId, courseId, data);
      setModules((prev) => [...prev, created]);
    }
  };

  return (
    <div className="flex flex-col gap-0 max-w-3xl mx-auto pb-16">
      {/* Top nav tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-5">
        <button className="px-1 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-600 mr-6">
          Course
        </button>
        <button
          onClick={() => router.push(`/${instituteId}/institute/courses`)}
          className="px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← Back to Courses
        </button>
      </div>

      {/* Course banner */}
      {course?.coverImage ? (
        <img src={course.coverImage} alt={course.name ?? ""} className="w-full h-48 object-cover rounded-2xl shadow mb-6" />
      ) : (
        <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-400 to-blue-300 shadow mb-6" />
      )}

      {/* Toolbar row: Expand all + Add */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setAllExpanded((p) => !p)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <button
          onClick={() => { setEditingModule(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <FiPlus className="w-4 h-4" /> Add Module
        </button>
      </div>

      {/* Module accordions */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500">No modules yet. Click "Add Module" to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((mod) => (
            <ModuleAccordion
              key={mod.id}
              module={mod}
              instituteId={instituteId}
              courseId={courseId}
              forceOpen={allExpanded}
              onEditModule={(m) => { setEditingModule(m); setIsModalOpen(true); }}
              onDeleteModule={handleDeleteModule}
            />
          ))}
        </div>
      )}

      <ModuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingModule}
        instituteId={instituteId}
        courseId={courseId}
      />
    </div>
  );
}
