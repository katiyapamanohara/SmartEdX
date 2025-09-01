'use client';

import React, { useState, useEffect } from 'react';
import { motion, stagger, useAnimate } from "framer-motion";
import { useRouter } from "next/navigation";
import Select from "../../form/Select";

interface KnowledgeBaseSelectorProps {
  onNext?: (selectedKnowledgeBases: string[]) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseSelectorProps> = ({ 
  onNext 
}) => {
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newKnowledgeBaseName, setNewKnowledgeBaseName] = useState<string>('');
  const [scope, animate] = useAnimate();
  const router = useRouter();

  useEffect(() => {
    // Animate knowledge base elements on mount - similar to Assistant and Templates components
    const sequence = async () => {
      // First animate borders
      await animate([
        [".animated-border", { borderColor: "rgba(156, 163, 175, 0.3)" }, { duration: 0.45, delay: stagger(0.02) }]
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



  // Mock data - in a real app, you would fetch this from your backend
  const knowledgeBases = [
    { id: '1', name: 'General Knowledge' },
    { id: '2', name: 'Product Documentation' },
    { id: '3', name: 'Company FAQ' },
  ];

  const handleNext = () => {
    if (isCreatingNew && newKnowledgeBaseName) {
      // In a real app, you would create the new knowledge base here
      // and then pass the new ID to onNext
      onNext?.([...selectedKnowledgeBases, newKnowledgeBaseName]);
    } else if (selectedKnowledgeBases.length > 0) {
      onNext?.(selectedKnowledgeBases);
    }
  };

  const clearSelection = () => {
    setSelectedKnowledgeBases([]);
  };

  const handleCreateKnowledgeBase = () => {
    router.push('/knowledge-base');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem] animated-card animated-border" ref={scope}>
      <motion.div 
        className="mb-8 animated-content"
        initial={{ opacity: 0, y: 15 }}
      >
        <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Select your Knowledge Base</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Select your Knowledge Base</p>
        
        <motion.div 
          className="mt-4 animated-content"
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedKnowledgeBases.map((kbId) => {
              const kb = knowledgeBases.find(k => k.id === kbId);
              return (
                <div 
                  key={kbId} 
                  className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-md"
                >
                  <span>{kb?.name || kbId}</span>
                  <button 
                    className="ml-1.5 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    onClick={() => setSelectedKnowledgeBases(selectedKnowledgeBases.filter(id => id !== kbId))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          <Select
            options={knowledgeBases.map(kb => ({ value: kb.id, label: kb.name }))}
            placeholder="Add a knowledge base..."
            onChange={(value) => {
              if (value && !selectedKnowledgeBases.includes(value)) {
                setSelectedKnowledgeBases([...selectedKnowledgeBases, value]);
              }
            }}
          />
          
          <div className="mt-1 text-right">
            <button 
              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              onClick={clearSelection}
            >
              Clear Selection
            </button>
          </div>
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="mb-8 animated-content"
        initial={{ opacity: 0, y: 15 }}
      >
        <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Create/Add Knowledge Base</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create or add your own Knowledge Base</p>
        
        <motion.div 
          className="mt-4 animated-content"
          initial={{ opacity: 0, y: 10 }}
        >
          {isCreatingNew ? (
            <div className="space-y-4">
              <input
                type="text"
                value={newKnowledgeBaseName}
                onChange={(e) => setNewKnowledgeBaseName(e.target.value)}
                placeholder="Enter Knowledge Base name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateKnowledgeBase}
              className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-md hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800"
            >
              Create new Knowledge Base
            </button>
          )}
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="flex animated-content"
        initial={{ opacity: 0, y: 15 }}
      >
        <button
          disabled={(selectedKnowledgeBases.length === 0 && !isCreatingNew) || (isCreatingNew && !newKnowledgeBaseName)}
          className={`px-4 py-2 text-white font-medium rounded-md focus:outline-none focus:ring-4 transition-colors ${
            (selectedKnowledgeBases.length === 0 && !isCreatingNew) || (isCreatingNew && !newKnowledgeBaseName)
              ? 'bg-indigo-300 cursor-not-allowed dark:bg-indigo-800'
              : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-300 dark:focus:ring-indigo-800'
          }`}
          onClick={handleNext}
        >
          Next
        </button>
      </motion.div>
    </div>
  );
};

export default KnowledgeBase;