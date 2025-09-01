"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
// import { useRouter } from "next/navigation";
import CreateFromScratchPopup from "./CreateFromScratchPopup";
import { useModal } from "@/hooks/useModal";
import { useTemplates } from "@/hooks/useTemplates";
import { motion, stagger, useAnimate } from "framer-motion";
import type { Template } from "@/types/template";

const Templates: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const { templates, loading, error } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [scope, animate] = useAnimate();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animation sequence exactly like in Assistant.tsx
    const sequence = async () => {

      // First animate borders
      await animate([
        [".animated-border", { borderColor: "rgba(156, 163, 175, 0.3)" }, { duration: 0.35, delay: stagger(0.02) }]
      ]);

      // Then animate cards with spring physics
      await animate([
        [".animated-card", 
          { opacity: 1, y: 0 }, 
          { 
            type: "spring" as const, 
            stiffness: 500, 
            damping: 28, 
            mass: 0.6, 
            delay: stagger(0.02) 
          }
        ]
      ]);

      // Finally animate content
      await animate([
        [".animated-content", 
          { opacity: 1, y: 0 }, 
          { 
            type: "spring" as const, 
            stiffness: 600, 
            damping: 30, 
            mass: 0.5, 
            delay: stagger(0.01) 
          }
        ]
      ]);
    };

    sequence();
  }, [animate]);

  // Templates from API are used directly, ensure every template has an id property
  const displayTemplates: Template[] = templates.map(template => ({
    ...template,
    // Make sure each template has an id field (use templateID as fallback)
    id: template.id || template.templateID
  }));

  const handleTemplateSelection = (templateId: string) => {
    // Store the template ID from the API
    setSelectedTemplateId(templateId);
    openModal();
  };

  const handleCloseModal = () => {
    closeModal();
    setSelectedTemplateId(null);
  };

  // Helper function to get template name - handles both API and fallback formats
  const getTemplateName = (template: Template): string => {
    return template.templateName || template.name || 'Unnamed Template';
  };

  // Helper function to get template description - handles both API and fallback formats
  const getTemplateDescription = (template: Template): string => {
    return template.templateDescription || template.description || '';
  };

  // Helper function to get a default icon when none is provided
  const getTemplateIcon = (template: Template): string => {
    // First try the API-specific image URL
    if (template.templateImageURL) return template.templateImageURL;

    // Then try the generic icon field
    if (template.icon) return template.icon;

    // Return category-based icon or default icon
    const categoryIcons: Record<string, string> = {
      business: "/images/brand/brand-01.svg",
      education: "/images/brand/brand-03.svg",
      finance: "/images/brand/brand-04.svg",
      healthcare: "/images/brand/brand-06.svg",
      health: "/images/brand/brand-08.svg",
    };

    return categoryIcons[template.category || ''] || "/images/brand/brand-01.svg";
  };

  return (
    <div className="container mx-auto px-4 py-6" ref={scope}>
      <motion.div 
        className="mb-8 text-center animated-content"
        initial={{ opacity: 0, y: 15 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Choose a Template
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Select a pre-built template to quickly set up your AI assistant. Each template comes with 
          industry-specific knowledge and workflows that you can customize to fit your needs.
        </p>
      </motion.div>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm">
            {error}. Please check your connection and try again.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No templates available.</p>
        </div>
      )}

      {!loading && displayTemplates.length > 0 && (
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {displayTemplates.map((template, index) => (
            <motion.div
              key={`template-${template.templateID || index}`}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer flex flex-col h-full animated-card animated-border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.3,
                ease: "easeOut"
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                transition: { duration: 0.2 }
              }}
              onClick={() => handleTemplateSelection(template.templateID)}
            >
              <div className="p-6 flex-grow">
                <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 relative animated-content">
                  <Image
                    src={getTemplateIcon(template)}
                    alt={getTemplateName(template)}
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      console.error('Error loading image:', getTemplateIcon(template));
                      e.currentTarget.src = "/images/brand/brand-01.svg";
                    }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {getTemplateName(template)}
                </h3>
                <p className="text-gray-500 text-sm dark:text-gray-400">
                  {getTemplateDescription(template)}
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <button className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 text-sm">
                  Select Template →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create from Scratch Popup - shown after template selection */}
      <CreateFromScratchPopup
        isOpen={isOpen}
        onClose={handleCloseModal}
        selectedTemplateId={selectedTemplateId}
      />
    </div>
  );
};

export default Templates;