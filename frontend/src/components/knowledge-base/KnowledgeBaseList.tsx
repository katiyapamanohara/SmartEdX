"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useKnowledgeBases } from "@/hooks/useKnowledgeBase";
import type { KnowledgeBase } from "@/types/knowledgebase";

type KnowledgeBaseDisplay = {
  id: string;
  title: string;
  description: string;
  status: string;
  icon: string;
  color: string;
};

const KnowledgeBaseList: React.FC = () => {
  // Fetch knowledge bases from backend
  const { knowledgeBases, loading, error, refetch } = useKnowledgeBases();

  // Convert backend data to display format
  const getDisplayData = (kb: KnowledgeBase): KnowledgeBaseDisplay => {
    // Map backend status to display status
    const getDisplayStatus = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'active':
          return 'Active';
        case 'completed':
          return 'Active';
        case 'processing':
          return 'Processing';
        case 'failed':
          return 'Error';
        case 'disabled':
        case 'inactive':
          return 'Disabled';
        default:
          return 'Unknown';
      }
    };

    // Get icon and color based on source type
    const getIconAndColor = (sourceTypeName: string) => {
      const name = (sourceTypeName || '').toLowerCase();
      if (name.includes('support') || name.includes('help')) {
        return { icon: 'workflow-support', color: 'blue' };
      } else if (name.includes('document') || name.includes('manual')) {
        return { icon: 'workflow-chart', color: 'purple' };
      } else if (name.includes('onboard') || name.includes('training')) {
        return { icon: 'database', color: 'indigo' };
      } else if (name.includes('policy') || name.includes('hr')) {
        return { icon: 'workflow-support', color: 'green' };
      } else {
        return { icon: 'database', color: 'gray' };
      }
    };

    const { icon, color } = getIconAndColor(kb.sourceTypeName || '');

    return {
      id: kb.knowledgeBaseID, // Use knowledgeBaseID from backend
      title: kb.knowledgeBaseName || 'Untitled Knowledge Base',
      description: kb.description || 'No description available',
      status: getDisplayStatus(kb.status),
      icon,
      color
    };
  };

  const displayKnowledgeBases = knowledgeBases.map(getDisplayData);

  // Animation variants for the cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        type: "tween" as const,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 25,
        mass: 0.8
      }
    }
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 500, 
        damping: 20,
        delay: 0.1
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "tween" as const,
        duration: 0.4,
        delay: 0.2
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            {status}
          </span>
        );
      case 'Processing':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            {status}
          </span>
        );
      case 'Error':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            {status}
          </span>
        );
      case 'Disabled':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getIcon = (iconType: string, color: string) => {
    switch (iconType) {
      case 'workflow-support':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10h-4v4h4m0-4v-2a2 2 0 00-2-2h-2M8 18h4v-4H8m0 4v2a2 2 0 002 2h2M4 8h4V4H4m0 4v2a2 2 0 002 2h2" />
          </svg>
        );
      case 'workflow-chart':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        );
    }
  };

  return (
    <div>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayKnowledgeBases.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No knowledge bases</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new knowledge base.</p>
        </div>
      )}

      {/* Knowledge Base Grid */}
      {!loading && !error && displayKnowledgeBases.length > 0 && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {displayKnowledgeBases.map((kb, index) => (
            <motion.div
              key={kb.id || `kb-${index}`}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer flex flex-col h-full"
              variants={cardVariants}
              whileHover={{ 
                scale: 1.02, 
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                transition: { type: "tween" as const, duration: 0.2 } 
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="p-6 flex-grow">
                <motion.div 
                  className={`w-14 h-14 rounded-lg bg-${kb.color}-100 dark:bg-${kb.color}-900/30 flex items-center justify-center mb-4`}
                  variants={iconVariants}
                >
                  {getIcon(kb.icon, kb.color)}
                </motion.div>
                <motion.h3 
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  variants={contentVariants}
                >
                  {kb.title}
                </motion.h3>
                <motion.p 
                  className="text-gray-500 text-sm dark:text-gray-400"
                  variants={contentVariants}
                >
                  {kb.description}
                </motion.p>
              </div>
              <motion.div 
                className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center"
                variants={contentVariants}
              >
                <Link
                  href={`/knowledge-base/${kb.id}`}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
                >
                  Edit Knowledge Base →
                </Link>
                <div className="flex items-center">
                  {getStatusBadge(kb.status)}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default KnowledgeBaseList;
