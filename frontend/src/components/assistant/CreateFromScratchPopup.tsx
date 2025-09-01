"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Select from "../form/Select";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import { useAssistants } from "@/hooks/useAssistants";
import { useLLMModels } from "@/hooks/useLLMModels";
import { useLanguages } from "@/hooks/useLanguages";
import { setGlobalLoading } from "@/components/common/GlobalLoader";
import posthog from 'posthog-js';

interface CreateFromScratchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplateId?: string | null;
}

const CreateFromScratchPopup: React.FC<CreateFromScratchPopupProps> = ({
  isOpen,
  onClose,
  selectedTemplateId,
}) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assistantName, setAssistantName] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const llmParams = useMemo(() => ({ limit: 50 }), []);

  const { models: aiModels, loading: modelsLoading, error: modelsError } = useLLMModels(llmParams);
  const { languages, isLoading: languagesLoading, error: languagesError } = useLanguages();
  const { createAssistant } = useAssistants();
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear error when user starts typing or making selections
  const clearError = () => {
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  };

  // Cleanup URL objects when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (image && image.startsWith('blob:')) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setIsCreating(false);
      setAssistantName("");
      setSelectedLanguages([]);
      setDescription("");
      setImage("");
      setSelectedModel("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleCreate = async () => {
    try {
      // Validate all required fields before proceeding
      // Check assistant name
      if (!assistantName.trim()) {
        setError("Please enter an assistant name");
        return;
      }

      // Check AI model selection
      if (!selectedModel) {
        setError("Please select an AI model");
        return;
      }

      // Check languages selection
      if (selectedLanguages.length === 0) {
        setError("Please select at least one language");
        return;
      }

      // Check description
      if (!description.trim()) {
        setError("Please add a description for your assistant");
        return;
      }

      // All validations passed, proceed with creation
      setIsCreating(true);
      setError(null);
      setGlobalLoading(true);

      // Validate that selectedLanguages contains languageIDs, not display text
      const invalidLanguages = selectedLanguages.filter(lang => !lang.startsWith('lang_'));
      if (invalidLanguages.length > 0) {
        console.error('ERROR: Selected languages contain invalid values:', invalidLanguages);
        console.error('Expected format: ["lang_001", "lang_002"], got:', selectedLanguages);
        setError('Invalid language selection. Please refresh and try again.');
        return;
      }

      // Map UI values to backend IDs
      const selectedModelId = aiModels.find(model => model.displayValue === selectedModel)?.id || selectedModel;
      const stringLanguageIDs = selectedLanguages.map(id => String(id));

      // Prepare the data for API call
      const formData = {
        assistantName,
        selectedLLMID: selectedModelId,
        languageIDs: stringLanguageIDs,
        description: description.trim() || "Your personal AI assistant powered by Articom.",
        ...(selectedFile && { assistantImage: selectedFile }),
        ...(selectedTemplateId && { sourceTemplateID: selectedTemplateId }),
      };

      //Track assistant creation
      posthog.capture(selectedTemplateId ? 'assistant_created_from_template' : 'assistant_created_from_scratch', {
        timestamp: new Date().toISOString(),
      });

      const createdAssistant = await createAssistant(formData);

      // Show success message
      setSuccess(`Assistant "${assistantName}" created successfully! `);

      // Wait a moment to show the success message before redirecting
      setTimeout(() => {
        // Navigate to customize page with the created assistant ID
        const languagesParam = selectedLanguages.join(',');
        router.push(`/assistant/customize?id=${createdAssistant.id}&model=${selectedModel}&languages=${languagesParam}`);
        onClose();
      }, 5000);
    } catch (err) {
      console.error('Error creating assistant:', err);
      let errorMessage = 'Failed to create assistant';

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsCreating(false);
      setGlobalLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage("/images/brand/brand-01.svg");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) { // 5MB
        console.error('File size exceeds limit:', file.size);
        setError('Image file size exceeds 5MB limit');
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setSelectedFile(file);

      posthog.capture('uploaded_image', {
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString(),
      });
    } else {
      setImage("/images/brand/brand-01.svg");
      setSelectedFile(null);
    }
  };

  // Combine model and language loading errors with form error
  useEffect(() => {
    if (modelsError) {
      setError(modelsError);
    } else if (languagesError) {
      setError(languagesError instanceof Error ? languagesError.message : 'Failed to load languages');
    }
  }, [modelsError, languagesError]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl mx-auto p-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 lg:p-10 w-full">
        <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-6">
          Create New Assistant
        </h4>

        <div className="grid grid-cols-12 gap-y-6 gap-x-6 items-start">
          {/* Assistant Name */}
          <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Assistant Name
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
              What name will your chatbot go by.
            </p>
          </div>
          <div className="col-span-8">
            <Input
              type="text"
              defaultValue={assistantName}
              onChange={(e) => {
                setAssistantName(e.target.value);
                clearError();

                // Clear existing timeout
                if (nameTimeoutRef.current) {
                  clearTimeout(nameTimeoutRef.current);
                }

                // Only track after user stops typing for 1 second
                if (e.target.value.trim()) {
                  nameTimeoutRef.current = setTimeout(() => {
                    posthog.capture('entered_assistant_name', {
                      timestamp: new Date().toISOString(),
                    });
                  }, 1000); // 1 second delay
                }

              }}
              placeholder="Name"
            />
          </div>

          {/* Image */}
          <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Image
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
              An optional image that will be displayed in your chatbots list.
            </p>
          </div>
          <div className="col-span-8 flex items-center space-x-4">
            <div className="size-14 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
              {image ? (
                <Image
                  src={image}
                  alt="Bot Icon"
                  width={60}
                  height={60}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7a2 2 0 012-2h2l1-2h6l1 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="space-x-2 flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Remove
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangeImage}
                >
                  Change Image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended size: 250x250px
              </p>
            </div>
          </div>

          {/* AI Model */}
          <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            AI Model
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
              Select AI model for your chatbot
            </p>
          </div>
          <div className="col-span-8">
            {modelsLoading ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-4 h-4 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading AI models...</span>
              </div>
            ) : aiModels.length > 0 ? (
              <Select
                options={aiModels.map(model => ({
                  value: model.displayValue,
                  label: `${model.name || model.displayValue} ${model.provider ? `(${model.provider})` : ''}`.trim()
                }))}
                onChange={(value) => {
                  setSelectedModel(value);
                  clearError();
                  posthog.capture('selected_ai_model', {
                    selectedModel: value,
                    timestamp: new Date().toISOString(),
                  });
                }}
                placeholder="Select AI model"
              />
            ) : (
              <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="text-sm text-red-600 dark:text-red-400">No AI models available</span>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Languages
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
              Select languages (multiple allowed)
            </p>
          </div>
          <div className="col-span-8">
            {languagesLoading ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-4 h-4 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
              </div>
            ) : languages && languages.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedLanguages.map((langId) => {
                    const lang = languages.find(l => l.languageID === langId); // Use languageID for comparison
                    return lang ? (
                      <div
                        key={lang.languageID} // Use languageID as key
                        className="flex items-center bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs px-2 py-1 rounded-md"
                      >
                        <span>{lang.name}</span>
                        <button
                          className="ml-1.5 text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                          onClick={() => {
                            setSelectedLanguages(selectedLanguages.filter(id => id !== lang.languageID));
                            clearError();
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
                <Select
                  options={languages.map(lang => ({
                    value: lang.languageID, // Use languageID as value
                    label: lang.name // Display only the name
                  }))}
                  placeholder="Add a language..."
                  onChange={(value) => {
                    if (value && !selectedLanguages.includes(String(value))) {
                      const languageID = String(value);
                      setSelectedLanguages([...selectedLanguages, languageID]);
                      clearError();

                      posthog.capture('added_language', {
                        languageCount: languages.length,
                        addedLanguage: languages.find(l => l.languageID === value)?.name,
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }}
                />
              </>
            ) : languagesError ? (
              <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="text-sm text-red-600 dark:text-red-400">
                  Error loading languages
                </span>
              </div>
            ) : (
              <div className="p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">No languages available. The API may have returned an unexpected response format.</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="col-span-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
            Description
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
              Description about your chatbot
            </p>
          </div>
          <div className="col-span-8">
            <TextArea
              value={description}
              onChange={(value) => {
                setDescription(value);
                clearError();

                // Clear existing timeout
                if (descriptionTimeoutRef.current) {
                  clearTimeout(descriptionTimeoutRef.current);
                }

                // Only track after user stops typing for 1 second
                if (value.trim()) {
                  descriptionTimeoutRef.current = setTimeout(() => {
                    posthog.capture('entered_description', {
                      descriptionLength: value.trim().length,
                      timestamp: new Date().toISOString(),
                    });
                  }, 1000); // 1 second delay
                }

              }}
              placeholder="Description"
              rows={4}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="col-span-12 mb-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="col-span-12 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="col-span-12 pt-4">
            <Button
              onClick={handleCreate}
              variant="primary"
              size="md"
              className="w-full"
              disabled={
                isCreating ||
                modelsLoading ||
                aiModels.length === 0 ||
                languagesLoading ||
                (!languages || languages.length === 0) ||
                success !== null
              }
            >
              {success ? 'Success! Redirecting...' :
                isCreating ? 'Creating Assistant...' :
                  modelsLoading ? 'Loading AI Models...' :
                    aiModels.length === 0 ? 'No AI Models Available' :
                      languagesLoading ? 'Loading Languages...' :
                        (!languages || languages.length === 0) ? 'No Languages Available' :
                          'Create and Customize'}
            </Button>
          </div>
        </div>
      </div>
    </Modal >
  );
};

export default CreateFromScratchPopup;
