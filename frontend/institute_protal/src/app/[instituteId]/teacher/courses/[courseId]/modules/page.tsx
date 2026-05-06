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
  FiFile,
  FiVideo,
  FiLink,
  FiFileText,
  FiHelpCircle,
  FiExternalLink,
  FiEye,
} from "react-icons/fi";
import ModuleModal from "./components/ModuleModal";
import QuizViewModal from "./[moduleId]/contents/components/QuizViewModal";
import ContentModal from "./[moduleId]/contents/components/ContentModal";

// ─── Type config ─────────────────────────────────────────────────
const TYPE_CONFIG: Record<ContentType, { icon: React.ReactNode; label: string; iconBg: string; iconColor: string }> = {
  pdf:      { icon: <FiFile className="w-5 h-5"/>,      label: "PDF",      iconBg: "bg-red-100 dark:bg-red-900/30",    iconColor: "text-red-600 dark:text-red-400" },
  video:    { icon: <FiVideo className="w-5 h-5"/>,     label: "Video",    iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
  document: { icon: <FiFileText className="w-5 h-5"/>,  label: "Document", iconBg: "bg-blue-100 dark:bg-blue-900/30",  iconColor: "text-blue-600 dark:text-blue-400" },
  quiz:     { icon: <FiHelpCircle className="w-5 h-5"/>,label: "Quiz",     iconBg: "bg-green-100 dark:bg-green-900/30",iconColor: "text-green-600 dark:text-green-400" },
  link:       { icon: <FiLink className="w-5 h-5"/>,      label: "Link",       iconBg: "bg-amber-100 dark:bg-amber-900/30",iconColor: "text-amber-600 dark:text-amber-400" },
  simulation: { icon: <FiFileText className="w-5 h-5"/>, label: "Simulation", iconBg: "bg-cyan-100 dark:bg-cyan-900/30",  iconColor: "text-cyan-600 dark:text-cyan-400" },
};

// ─── Content row ─────────────────────────────────────────────────
function ContentRow({
  content,
  onViewQuiz,
  onEdit,
  onDelete,
}: {
  content: ModuleContent;
  onViewQuiz: (c: ModuleContent) => void;
  onEdit: (c: ModuleContent) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.document;
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors group">
      <div className={`mt-0.5 w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        {content.url ? (
          <a href={content.url} target="_blank" rel="noopener noreferrer"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1.5">
            {content.title}<FiExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0"/>
          </a>
        ) : (
          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{content.title}</p>
        )}
        {content.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{content.description}</p>
        )}
        <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          {cfg.label}
        </span>
      </div>
      <div className="shrink-0 hidden group-hover:flex items-center gap-1 mt-0.5">
        {content.type === "quiz" && (
          <button onClick={() => onViewQuiz(content)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
            <FiEye className="w-3.5 h-3.5"/> View
          </button>
        )}
        <button onClick={() => onEdit(content)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          <FiEdit className="w-4 h-4"/>
        </button>
        <button onClick={() => onDelete(content.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <FiTrash2 className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}

// ─── Module accordion ─────────────────────────────────────────────
type ModuleWithContents = CourseModule & { contents: ModuleContent[] };

function ModuleAccordion({
  module,
  forceOpen,
  instituteId,
  courseId,
  onEditModule,
  onDeleteModule,
  onViewQuiz,
}: {
  module: ModuleWithContents;
  forceOpen: boolean;
  instituteId: string;
  courseId: string;
  onEditModule: (m: ModuleWithContents) => void;
  onDeleteModule: (id: string) => void;
  onViewQuiz: (c: ModuleContent) => void;
}) {
  const [open, setOpen] = useState(forceOpen);
  const [contents, setContents] = useState<ModuleContent[]>(module.contents ?? []);
  const [contentModal, setContentModal] = useState<{ open: boolean; editing: ModuleContent | null }>({ open: false, editing: null });

  useEffect(() => { setOpen(forceOpen); }, [forceOpen]);
  useEffect(() => { setContents(module.contents ?? []); }, [module.contents]);

  const handleContentSubmit = async (data: any) => {
    const { pdfFile, ...rest } = data;
    if (contentModal.editing) {
      const updated = await instituteService.updateTeacherContent(instituteId, courseId, module.id, contentModal.editing.id, rest);
      setContents((p) => p.map((c) => (c.id === contentModal.editing!.id ? updated : c)));
    } else {
      const isFileType = rest.type === "pdf" || rest.type === "document" || rest.type === "video";
      let created;
      if (isFileType && pdfFile) {
        created = await instituteService.uploadTeacherFileContent(
          instituteId, courseId, module.id, pdfFile,
          { title: rest.title, type: rest.type, description: rest.description, order: rest.order }
        );
      } else if (isFileType && rest.url?.trim()) {
        created = await instituteService.createTeacherContent(instituteId, courseId, module.id, rest);
      } else if (isFileType) {
        throw new Error("Please select a file to upload or enter a URL.");
      } else {
        created = await instituteService.createTeacherContent(instituteId, courseId, module.id, rest);
      }
      setContents((p) => [...p, created]);
    }
    setContentModal({ open: false, editing: null });
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm("Delete this content?")) return;
    await instituteService.deleteTeacherContent(instituteId, courseId, module.id, id);
    setContents((p) => p.filter((c) => c.id !== id));
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-blue-300 dark:border-blue-700 shadow-md" : "border-gray-200 dark:border-gray-700 shadow-sm"} bg-white dark:bg-gray-800`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors select-none"
        onClick={() => setOpen((p) => !p)}
      >
        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${open ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
          {open ? <FiChevronDown className="w-4 h-4"/> : <FiChevronRight className="w-4 h-4"/>}
        </span>
        <h2 className="flex-1 font-bold text-gray-900 dark:text-white text-base">{module.title}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{contents.length} item{contents.length !== 1 ? "s" : ""}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEditModule(module)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <FiEdit className="w-4 h-4"/>
          </button>
          <button onClick={() => onDeleteModule(module.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <FiTrash2 className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {module.description && (
            <p className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 italic border-b border-gray-100 dark:border-gray-700">{module.description}</p>
          )}
          {contents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No content yet.</div>
          ) : (
            <div>
              {contents.map((c) => (
                <ContentRow
                  key={c.id}
                  content={c}
                  onViewQuiz={onViewQuiz}
                  onEdit={(c) => setContentModal({ open: true, editing: c })}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
          )}
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setContentModal({ open: true, editing: null })}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <FiPlus className="w-3.5 h-3.5"/> Add content
            </button>
          </div>
        </div>
      )}

      <ContentModal
        isOpen={contentModal.open}
        onClose={() => setContentModal({ open: false, editing: null })}
        onSubmit={handleContentSubmit}
        initialData={contentModal.editing}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function TeacherModulesPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;

  const [modules, setModules] = useState<ModuleWithContents[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);
  const [viewingQuiz, setViewingQuiz] = useState<ModuleContent | null>(null);
  const [moduleModal, setModuleModal] = useState<{ open: boolean; editing: ModuleWithContents | null }>({ open: false, editing: null });

  useEffect(() => {
    if (!instituteId || !courseId) return;
    (async () => {
      setIsLoading(true);
      try {
        const data = await instituteService.getCourseForTeacher(instituteId, courseId);
        if (data) {
          setCourse(data.course);
          setModules(data.modules as ModuleWithContents[]);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [instituteId, courseId]);

  const handleModuleSubmit = async (data: any) => {
    if (moduleModal.editing) {
      const updated = await instituteService.updateTeacherModule(instituteId, courseId, moduleModal.editing.id, data);
      setModules((p) => p.map((m) => (m.id === moduleModal.editing!.id ? { ...m, ...updated } : m)));
    } else {
      const created = await instituteService.createTeacherModule(instituteId, courseId, data) as ModuleWithContents;
      created.contents = [];
      setModules((p) => [...p, created]);
    }
    setModuleModal({ open: false, editing: null });
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Delete this module and all its content?")) return;
    await instituteService.deleteTeacherModule(instituteId, courseId, id);
    setModules((p) => p.filter((m) => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-0 max-w-3xl mx-auto pb-16">
      {/* Top nav */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-5">
        <button className="px-1 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-600 mr-6">
          Course
        </button>
        <button
          onClick={() => router.push(`/${instituteId}/teacher/courses`)}
          className="px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← Back to My Courses
        </button>
      </div>

      {/* Banner */}
      {course?.coverImage ? (
        <img src={course.coverImage} alt={course.name ?? ""} className="w-full h-48 object-cover rounded-2xl shadow mb-6"/>
      ) : (
        <div className="w-full h-48 rounded-2xl bg-linear-to-br from-violet-600 via-purple-400 to-blue-300 shadow mb-6"/>
      )}

      {/* Course info */}
      {course && (
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
          {course.code && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Code: {course.code}</p>}
          {course.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{course.description}</p>}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setAllExpanded((p) => !p)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <button
          onClick={() => setModuleModal({ open: true, editing: null })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <FiPlus className="w-4 h-4"/> Add Content field
        </button>
      </div>

      {/* Modules */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"/>
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500">No content yet. Click "Add Content" to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((mod) => (
            <ModuleAccordion
              key={mod.id}
              module={mod}
              forceOpen={allExpanded}
              instituteId={instituteId}
              courseId={courseId}
              onEditModule={(m) => setModuleModal({ open: true, editing: m })}
              onDeleteModule={handleDeleteModule}
              onViewQuiz={setViewingQuiz}
            />
          ))}
        </div>
      )}

      <ModuleModal
        isOpen={moduleModal.open}
        onClose={() => setModuleModal({ open: false, editing: null })}
        onSubmit={handleModuleSubmit}
        initialData={moduleModal.editing}
        instituteId={instituteId}
        courseId={courseId}
      />

      <QuizViewModal
        isOpen={viewingQuiz !== null}
        onClose={() => setViewingQuiz(null)}
        content={viewingQuiz}
      />
    </div>
  );
}
