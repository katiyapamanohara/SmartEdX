"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/useModal";
import { motion, stagger, useAnimate } from "framer-motion";
import { useAssistants } from "@/hooks/useAssistants";
import { setGlobalLoading } from "@/components/common/GlobalLoader";
import CreateFromScratchPopup from "./CreateFromScratchPopup";
import BuildWithAIPopup from "./BuildWithAIPopup";

const Assistant: React.FC = () => {
  const router = useRouter();
  const { isOpen: isCreateModalOpen, openModal: openCreateModal, closeModal: closeCreateModal } = useModal();
  const { isOpen: isAIModalOpen, openModal: openAIModal, closeModal: closeAIModal } = useModal();
  const [scope, animate] = useAnimate();
  const { assistants, loading } = useAssistants();

  // send loading state to global loader
  useEffect(() => {
    setGlobalLoading(loading);
  }, [loading]);

  useEffect(() => {
    // More aggressive staggering for faster animations
    const sequence = async () => {
      // First animate borders (much faster)
      await animate([
        [".animated-border", { borderColor: "rgba(156, 163, 175, 0.3)" }, { duration: 0.35, delay: stagger(0.02) }]
      ]);

      // Then animate cards with spring physics for snappier motion
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

      // Finally animate content with more aggressive staggering
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


  // Keep the function but comment it out to resolve the ESLint error while preserving the code
  // for future use
  // const handleDelete = (e: React.MouseEvent, id: string) => {
  //   e.stopPropagation(); // Prevent event from bubbling up to parent
  //   console.log(`Delete assistant with ID: ${id}`);
  //   // Implement delete functionality
  // };

  const handleCustomize = (id: string) => {
    router.push(`/assistant/customize?id=${id}`);
  };

  // Define animation variants with faster transitions
  const cardVariants = {
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



  return (
    <div className="h-full" ref={scope}>
      {/* Create New Assistants Section */}
      <div className="mb-12">
        <motion.div
          className="text-center animated-content"
          initial={{ opacity: 0, y: 15 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Assistants
          </h2>
          <p className="text-gray-400 dark:text-gray-400 mb-6">
            Choose how you want to Start working with the Chatbot
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create from Scratch */}
          <motion.div
            className="flex items-center p-6 py-10 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer animated-card animated-border"
            initial="hidden"
            variants={cardVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              transition: { duration: 0.15 }
            }}
            onClick={openCreateModal}
          >
            <div className="flex-shrink-0 mr-4 mt-1">
              <motion.div
                className="w-20 h-20 bg-indigo-100 rounded-lg flex items-center justify-center dark:bg-indigo-900/30 animated-content"
                initial={{ opacity: 0, y: 10 }}
              >
                <Image
                  src="/images/icons/create.svg"
                  alt="Create from Scratch"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              </motion.div>
            </div>
            <motion.div
              className="flex-grow animated-content"
              initial={{ opacity: 0, y: 10 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Create from Scratch
              </h3>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Start fresh and build a fully customized chatbot tailored to
                your unique needs—perfect for full control and creativity.
              </p>
            </motion.div>
          </motion.div>

          {/* Easy Create & Customize */}
          <motion.div
            className="flex items-center p-6 py-10 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer animated-card animated-border"
            initial="hidden"
            variants={cardVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              transition: { duration: 0.15 }
            }}
            onClick={() => router.push("/assistant/templates")}
          >
            <div className="flex-shrink-0 mr-4 mt-1">
              <motion.div
                className="w-20 h-20 bg-indigo-100 rounded-lg flex items-center justify-center dark:bg-indigo-900/30 animated-content"
                initial={{ opacity: 0, y: 10 }}
              >
                <Image
                  src="/images/icons/Template.svg"
                  alt="Easy Create & Customize"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              </motion.div>
            </div>
            <motion.div
              className="flex-grow animated-content"
              initial={{ opacity: 0, y: 10 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Easy Create & Customize
              </h3>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Use our guided setup to quickly launch a chatbot with pre-built
                templates and tweak it to fit your brand in minutes.
              </p>
            </motion.div>
          </motion.div>

          {/* Build with AI */}
          <motion.div
            className="flex items-center p-6 py-10 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer animated-card animated-border"
            initial="hidden"
            variants={cardVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              transition: { duration: 0.15 }
            }}
            onClick={openAIModal}
          >
            <div className="flex-shrink-0 mr-4 mt-1">
              <motion.div
                className="w-20 h-20 bg-indigo-100 rounded-lg flex items-center justify-center dark:bg-indigo-900/30 animated-content"
                initial={{ opacity: 0, y: 10 }}
              >
                <Image
                  src="/images/icons/AICreation.svg"
                  alt="Build with AI"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              </motion.div>
            </div>
            <motion.div
              className="flex-grow animated-content"
              initial={{ opacity: 0, y: 10 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Build with AI
              </h3>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Let AI help you create an intelligent chatbot by analyzing your
                content and automatically generating responses.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Your Assistants Section */}
      <div>
        {/* Show heading only when there are assistants */}
        {assistants.length > 0 && (
          <motion.h2
            className="text-xl text-center font-semibold text-gray-900 dark:text-white mb-6 animated-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Your Assistants
          </motion.h2>
        )}

        {assistants.length === 0 ? (
          <div className="space-y-3 max-w-4xl mx-auto">
            {/* Info Cards for empty state */}
            <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800/30 dark:border-gray-700">
              <div className="flex-shrink-0 w-6 h-6 border-2 border-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-indigo-500 text-xs font-bold">i</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                Build powerful chatbots effortlessly using our intuitive drag-and-drop interface. No coding skills required!
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800/30 dark:border-gray-700">
              <div className="flex-shrink-0 w-6 h-6 border-2 border-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-indigo-500 text-xs font-bold">i</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                Train your bot with your own content by uploading PDFs, text files, or links. Your bot will respond accurately based on your data.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800/30 dark:border-gray-700">
              <div className="flex-shrink-0 w-6 h-6 border-2 border-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-indigo-500 text-xs font-bold">i</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                Easily create bots that speak multiple languages to serve a global audience with seamless language detection.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800/30 dark:border-gray-700">
              <div className="flex-shrink-0 w-6 h-6 border-2 border-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-indigo-500 text-xs font-bold">i</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                Set up keyword-based or AI-powered intents to deliver precise responses and smooth conversational flows.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800/30 dark:border-gray-700">
              <div className="flex-shrink-0 w-6 h-6 border-2 border-indigo-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-indigo-500 text-xs font-bold">i</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                Embed your chatbot in websites or mobile apps with just a few lines of code. Compatible with all major platforms.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Assistants Grid */}
            {assistants.map((assistant, index) => (
              <motion.div
                key={assistant.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer flex flex-col h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.3,
                  ease: "easeOut" as const
                }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  transition: { duration: 0.2 }
                }}
                onClick={() => handleCustomize(assistant.id)}
              >
                <div className="p-6 flex-grow">
                  <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-2">
                    {assistant.avatar ? (
                      <Image
                        src={assistant.avatar}
                        alt={assistant.name || 'Assistant'}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/brand/brand-01.svg";
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-200 dark:bg-indigo-800 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                          {(assistant.name || 'A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {assistant.name || 'Untitled Assistant'}
                  </h3>
                  <p className="text-gray-500 text-sm dark:text-gray-400">
                    {assistant.description || 'No description available'}
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center mt-auto">
                  <button className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 text-sm">
                    Customize →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create from Scratch Popup */}
      <CreateFromScratchPopup isOpen={isCreateModalOpen} onClose={closeCreateModal} />

      {/* Build with AI Popup */}
      <BuildWithAIPopup isOpen={isAIModalOpen} onClose={closeAIModal} />
    </div>
  );
};

export default Assistant;
