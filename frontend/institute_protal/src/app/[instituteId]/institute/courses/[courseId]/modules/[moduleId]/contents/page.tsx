"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModuleContent, instituteService } from "@/services/instituteService";
import ContentList from "./components/ContentList";
import ContentModal from "./components/ContentModal";
import { FiPlus, FiArrowLeft } from "react-icons/fi";

const ContentsPage = () => {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;
  const moduleId = params?.moduleId as string;

  const [contents, setContents] = useState<ModuleContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ModuleContent | null>(null);

  useEffect(() => {
    if (instituteId && courseId && moduleId) {
      fetchContents();
    }
  }, [instituteId, courseId, moduleId]);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const data = await instituteService.getModuleContents(instituteId, courseId, moduleId);
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
        await instituteService.deleteModuleContent(instituteId, courseId, moduleId, contentId);
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
        let created;
        if ((rest.type === "pdf" || rest.type === "document" || rest.type === "video") && pdfFile) {
          created = await instituteService.uploadFileContent(
            instituteId, courseId, moduleId, pdfFile,
            { title: rest.title, type: rest.type, description: rest.description, order: rest.order }
          );
        } else {
          created = await instituteService.createModuleContent(
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
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Contents</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage PDFs, videos, documents, quizzes and links
          </p>
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
      />

      <ContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingContent}
      />
    </div>
  );
};

export default ContentsPage;
