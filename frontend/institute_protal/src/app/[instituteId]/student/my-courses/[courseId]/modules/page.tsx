"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  instituteService,
  Course,
  CourseModule,
  ModuleContent,
  ContentType,
} from "@/services/instituteService";
import { BoxIconLine } from "@/icons";
import {
  FiChevronRight,
  FiChevronDown,
  FiFile,
  FiVideo,
  FiLink,
  FiFileText,
  FiHelpCircle,
  FiExternalLink,
} from "react-icons/fi";

const TYPE_CONFIG: Record<
  ContentType,
  { icon: React.ReactNode; label: string; iconBg: string; iconColor: string }
> = {
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

function ContentRow({ content }: { content: ModuleContent }) {
  const cfg = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.document;

  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors">
      <div
        className={`mt-0.5 w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        {content.url ? (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm leading-snug inline-flex items-center gap-1.5"
          >
            {content.title}
            <FiExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </a>
        ) : (
          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm leading-snug">
            {content.title}
          </p>
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
    </div>
  );
}

function ModuleAccordion({
  module,
  instituteId,
  courseId,
  forceOpen = false,
}: {
  module: CourseModule;
  instituteId: string;
  courseId: string;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [contents, setContents] = useState<ModuleContent[]>([]);

  useEffect(() => {
    if (forceOpen && !loaded) {
      setLoadingContents(true);
      instituteService
        .getModuleContents(instituteId, courseId, module.id)
        .then((data) => {
          setContents(data);
          setLoaded(true);
        })
        .finally(() => setLoadingContents(false));
    }
    setOpen(forceOpen);
  }, [forceOpen, loaded, instituteId, courseId, module.id]);

  async function toggle() {
    if (!loaded && !open) {
      setLoadingContents(true);
      try {
        const data = await instituteService.getModuleContents(instituteId, courseId, module.id);
        setContents(data);
      } finally {
        setLoaded(true);
        setLoadingContents(false);
      }
    }
    setOpen((prev) => !prev);
  }

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        open
          ? "border-blue-300 dark:border-blue-700 shadow-md"
          : "border-gray-200 dark:border-gray-700 shadow-sm"
      } bg-white dark:bg-white/3`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            open
              ? "bg-blue-600 text-white"
              : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          }`}
        >
          {open ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">{module.title}</h3>
          {module.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {module.description}
            </p>
          )}
        </div>

        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
          Order {module.order}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {loadingContents ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading contents...
            </div>
          ) : contents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No learning content available in this module yet.
            </div>
          ) : (
            <div>
              {contents.map((content) => (
                <ContentRow key={content.id} content={content} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentCourseModulesPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    if (!instituteId || !courseId) return;

    (async () => {
      setLoading(true);
      try {
        const [enrolledCourses, moduleData] = await Promise.all([
          instituteService.getMyEnrolledCourses(instituteId),
          instituteService.getCourseModules(instituteId, courseId),
        ]);

        setCourse(enrolledCourses.find((c) => c.id === courseId) ?? null);
        setModules(moduleData.sort((a, b) => a.order - b.order));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId, courseId]);

  const title = useMemo(() => course?.name ?? "Course Modules", [course?.name]);

  return (
    <div className="flex flex-col gap-0 max-w-3xl mx-auto pb-16">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-5">
        <button className="px-1 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-600 mr-6">
          Course
        </button>
        <button
          onClick={() => router.push(`/${instituteId}/student/my-courses`)}
          className="px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← Back to My Courses
        </button>
      </div>

      {course?.coverImage ? (
        <img
          src={course.coverImage}
          alt={course.name ?? ""}
          className="w-full h-48 object-cover rounded-2xl shadow mb-6"
        />
      ) : (
        <div className="w-full h-48 rounded-2xl bg-linear-to-br from-violet-600 via-purple-400 to-blue-300 shadow mb-6" />
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {course?.code && (
        <p className="text-base font-semibold text-gray-500 dark:text-gray-400 mt-1">
          Code: {course.code}
        </p>
      )}
      {course?.description && (
        <p className="text-base text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
          {course.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-6 mb-4">
        <button
          onClick={() => setAllExpanded((prev) => !prev)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? "Loading..." : `${modules.length} module${modules.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5"
            >
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded mt-3" />
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <BoxIconLine className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No modules available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Your instructor has not added modules for this course yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              instituteId={instituteId}
              courseId={courseId}
              forceOpen={allExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
