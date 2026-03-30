"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModuleContent, Course, CourseModule, instituteService } from "@/services/instituteService";
import ContentList from "./components/ContentList";
import ContentModal from "./components/ContentModal";
import QuizViewModal from "./components/QuizViewModal";
import { FiPlus, FiArrowLeft, FiBook, FiLayers } from "react-icons/fi";

const ContentsPage = () => {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;
  const moduleId = params?.moduleId as string;

  const [contents, setContents] = useState<ModuleContent[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<CourseModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ModuleContent | null>(null);
  const [viewingQuiz, setViewingQuiz] = useState<ModuleContent | null>(null);

  useEffect(() => {
    if (instituteId && courseId && moduleId) {
      fetchAll();
    }
  }, [instituteId, courseId, moduleId]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [courses, modules, data] = await Promise.all([
        instituteService.getCourses(instituteId),
        instituteService.getCourseModules(instituteId, courseId),
        instituteService.getModuleContents(instituteId, courseId, moduleId),
      ]);
      setCourse(courses.find((c) => c.id === courseId) ?? null);
      setModule(modules.find((m) => m.id === moduleId) ?? null);
      setContents(data);
    } catch (error) {
      console.error("Failed to fetch contents", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCreateContent = () => {
    setEditingContent(null);
    setIsModalOpen(true);
  };

  const handleEditContent = (content: ModuleContent) => {
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (confirm("Are you sure you want to delete this content?")) {
      try {
        await instituteService.deleteTeacherContent(instituteId, courseId, moduleId, contentId);
        setContents(contents.filter((c) => c.id !== contentId));
      } catch (error) {
        console.error("Failed to delete content", error);
        alert("Failed to delete content");
      }
    }
  };

  const handleModalSubmit = async (contentData: any) => {
    try {
      const { pdfFile, ...rest } = contentData;
      if (editingContent) {
        const updated = await instituteService.updateModuleContent(
          instituteId, courseId, moduleId, editingContent.id, rest
        );
        setContents(contents.map((c) => (c.id === editingContent.id ? updated : c)));
      } else {
        const isFileType = rest.type === "pdf" || rest.type === "document" || rest.type === "video";
        let created;
        if (isFileType && pdfFile) {
          // File selected — upload to MinIO then index into KB
          created = await instituteService.uploadTeacherFileContent(
            instituteId, courseId, moduleId, pdfFile,
            { title: rest.title, type: rest.type, description: rest.description, order: rest.order }
          );
        } else if (isFileType && rest.url?.trim()) {
          // URL provided — create with URL (KB indexing triggered server-side)
          created = await instituteService.createTeacherContent(
            instituteId, courseId, moduleId, rest
          );
        } else if (isFileType) {
          // Neither file nor URL — block submission
          throw new Error("Please select a file to upload or enter a URL.");
        } else {
          // Non-file types (quiz, link) — plain JSON create
          created = await instituteService.createTeacherContent(
            instituteId, courseId, moduleId, rest
          );
        }
        setContents([...contents, created]);
      }
    } catch (error) {
      console.error("Error saving content:", error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4 mb-2">
        <button
          onClick={() => router.back()}
          className="p-2 mt-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 shrink-0"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-1 flex-wrap">
            <FiBook className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{course?.name ?? "Course"}</span>
            <span>/</span>
            <FiLayers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{module?.title ?? "Module"}</span>
          </div>
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {module?.title ?? "Module Contents"}
          </h1>
          {/* Course description */}
          {course?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {course.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Total Items: {contents.length}
        </div>
        <button
          onClick={handleCreateContent}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
        >
          <FiPlus className="w-5 h-5" />
          <span>Add Content</span>
        </button>
      </div>

      <ContentList
        contents={contents}
        isLoading={isLoading}
        onEdit={handleEditContent}
        onDelete={handleDeleteContent}
        onViewQuiz={setViewingQuiz}
      />

      <ContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingContent}
      />

      <QuizViewModal
        isOpen={viewingQuiz !== null}
        onClose={() => setViewingQuiz(null)}
        content={viewingQuiz}
      />
    </div>
  );
};

export default ContentsPage;
