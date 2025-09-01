"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import KnowledgeBaseList from "@/components/knowledge-base/KnowledgeBaseList";
import Link from "next/link";
import React from "react";
import { motion, Variants } from "framer-motion";

export default function KnowledgeBasePage() {
  // Define animation variants
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 30,
        mass: 0.8 
      }
    }
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring" as const, 
        stiffness: 500,
        damping: 30,
        mass: 0.6
      } 
    }
  };

  return (
    <motion.div 
      className="h-full flex flex-col"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      <PageBreadcrumb pageTitle="Knowledge Base" />
      <motion.div 
        className="flex-1 space-y-8"
        variants={contentVariants}
      >
        {/* Create New Knowledge Base Card */}
        <motion.div variants={cardVariants}>
          <Link
            href="/knowledge-base/create"
            className="block w-full border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow text-center"
          >
            <motion.div 
              className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full mb-3"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-brand-500"
              >
                <path 
                  d="M12 5V19M5 12H19" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-1">Create New Knowledge Base</h2>
            <p className="text-gray-500 dark:text-gray-400">Build a custom knowledge base to organize your documentation</p>
          </Link>
        </motion.div>
        
        <motion.div variants={cardVariants}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-6">Your knowledge bases</h2>
          <KnowledgeBaseList />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}