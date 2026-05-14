import React from "react";
import { ModuleContent, ContentType } from "@/services/instituteService";
import { FiEdit2, FiTrash2, FiFile, FiVideo, FiLink, FiFileText, FiHelpCircle, FiEye } from "react-icons/fi";

interface ContentListProps {
  contents: ModuleContent[];
  isLoading: boolean;
  onEdit: (content: ModuleContent) => void;
  onDelete: (contentId: string) => void;
  onViewQuiz?: (content: ModuleContent) => void;
}

const contentTypeConfig: Record<ContentType, { icon: React.ReactNode; label: string; color: string }> = {
  pdf: {
    icon: <FiFile className="w-5 h-5" />,
    label: "PDF",
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  },
  video: {
    icon: <FiVideo className="w-5 h-5" />,
    label: "Video",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  document: {
    icon: <FiFileText className="w-5 h-5" />,
    label: "Document",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  quiz: {
    icon: <FiHelpCircle className="w-5 h-5" />,
    label: "Quiz",
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  },
  link: {
    icon: <FiLink className="w-5 h-5" />,
    label: "Link",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  simulation: {
    icon: <FiFileText className="w-5 h-5" />,
    label: "Simulation",
    color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
  },
};

const ContentList: React.FC<ContentListProps> = ({
  contents,
  isLoading,
  onEdit,
  onDelete,
  onViewQuiz,
}) => {
  if (isLoading) {
    return (
      <div className="w-full text-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading contents...</p>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          No content yet. Add PDFs, videos, documents, quizzes or links.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {contents.map((content) => {
        const typeConfig = contentTypeConfig[content.type] ?? contentTypeConfig.document;
        return (
          <div
            key={content.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg flex-shrink-0 ${typeConfig.color}`}>
                {typeConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {content.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                </div>
                {content.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {content.description}
                  </p>
                )}
                {content.url && (
                  <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-0.5 block truncate max-w-xs"
                  >
                    {content.url}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {content.type === "quiz" && onViewQuiz && (
                <button
                  onClick={() => onViewQuiz(content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <FiEye className="w-4 h-4" />
                  View
                </button>
              )}
              <button
                onClick={() => onEdit(content)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onDelete(content.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContentList;
