"use client";
import React, { useState, useCallback } from "react";
import ComponentCard from "../common/ComponentCard";
import { useDropzone } from "react-dropzone";
import Label from "../form/Label";
import { useKnowledgeBaseSourceTypes, useCreateKnowledgeBase } from "@/hooks/useKnowledgeBase";
import type { CreateKnowledgeBaseRequest } from "@/types/knowledgebase";
import { useRouter } from "next/navigation";

const CreateKnowledgeBase: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [knowledgeBaseType, setKnowledgeBaseType] = useState<string>("");
  const [selectedSourceTypeName, setSelectedSourceTypeName] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<string>("");
  const router = useRouter();

  // Fetch source types from backend
  const { sourceTypes, loading: typesLoading, error: typesError } = useKnowledgeBaseSourceTypes();

  // Create knowledge base hook
  const { createKnowledgeBase, loading: createLoading, error: createError } = useCreateKnowledgeBase();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });

  const removeFile = (indexToRemove: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!title.trim()) {
      setSubmitError("Please enter a knowledge base name");
      return;
    }

    if (!description.trim()) {
      setSubmitError("Please enter a description");
      return;
    }

    if (!selectedSourceTypeName) {
      setSubmitError("Please select a knowledge base type");
      return;
    }

    if (!files || files.length === 0) {
      setSubmitError("Please upload at least one file");
      return;
    }

    try {
      setSubmitError("");
      setSubmitSuccess("");

      const createData: CreateKnowledgeBaseRequest = {
        knowledgeBaseName: title.trim(),
        description: description.trim(),
        sourceTypeName: selectedSourceTypeName,
        files: files
      };

      const response = await createKnowledgeBase(createData);

      if (response.success) {
        setSubmitSuccess("Knowledge base created successfully!");

        // Reset form after successful creation
        setTimeout(() => {
          setTitle("");
          setDescription("");
          setFiles([]);
          setKnowledgeBaseType("");
          setSelectedSourceTypeName("");
          setSubmitSuccess("");
          
          // Navigate to knowledge base list page
          router.push('/knowledge-base');
        }, 2000);
      } else {
        setSubmitError(response.message || "Failed to create knowledge base");
      }
    } catch (error) {
      console.error("Error creating knowledge base:", error);
      setSubmitError("Failed to create knowledge base. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ComponentCard title="Create New Knowledge Base">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <Label htmlFor="title">Knowledge Base Name</Label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
              placeholder="Enter a name for your knowledge base"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will this knowledge base be used for?"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <Label>Knowledge Base Type</Label>
            {typesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading types...</span>
              </div>
            ) : typesError ? (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{typesError}</p>
              </div>
            ) : sourceTypes.length === 0 ? (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">No knowledge base types available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {sourceTypes.map((type) => (
                  <div
                    key={type.sourceTypeID}
                    onClick={() => {
                      setKnowledgeBaseType(type.sourceTypeID);
                      setSelectedSourceTypeName(type.sourceTypeName);
                    }}
                    className={`flex items-center gap-3 p-4 border ${knowledgeBaseType === type.sourceTypeID
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-800'
                      } rounded-lg cursor-pointer hover:border-brand-500 transition-colors`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100/50 dark:bg-gray-800">
                      {type.icon ? (
                        <div dangerouslySetInnerHTML={{ __html: type.icon }} />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600 dark:text-gray-400">
                          <path d="M4 7C4 5.34315 7.58172 4 12 4C16.4183 4 20 5.34315 20 7M4 7V17C4 18.6569 7.58172 20 12 20C16.4183 20 20 18.6569 20 17V7M4 7V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white/90">{type.sourceTypeName}</span>
                      {type.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Upload Files (PDF, TXT, DOC, DOCX, XLS, XLSX)</Label>
            <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-xl hover:border-brand-500">
              <div
                {...getRootProps()}
                className={`dropzone rounded-xl border-dashed border-gray-300 p-7 lg:p-10
                ${isDragActive
                    ? "border-brand-500 bg-gray-100 dark:bg-gray-800"
                    : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                  }
              `}
              >
                <input {...getInputProps()} />
                <div className="dz-message flex flex-col items-center m-0">
                  <div className="mb-[22px] flex justify-center">
                    <div className="flex h-[68px] w-[68px]  items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      <svg
                        className="fill-current"
                        width="29"
                        height="28"
                        viewBox="0 0 29 28"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82466 20.4256 9.53186L15.0463 4.15589C14.9093 4.00891 14.7141 3.91699 14.5019 3.91699ZM5.5 20.417C5.5 20.0028 5.16421 19.667 4.75 19.667C4.33579 19.667 4 20.0028 4 20.417V21.5837C4 22.8244 5.00924 23.8337 6.25 23.8337H22.75C23.9908 23.8337 25 22.8244 25 21.5837V20.417C25 20.0028 24.6642 19.667 24.25 19.667C23.8358 19.667 23.5 20.0028 23.5 20.417V21.5837C23.5 21.9979 23.1642 22.3337 22.75 22.3337H6.25C5.83579 22.3337 5.5 21.9979 5.5 21.5837V20.417Z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h4 className="mb-3 font-semibold text-gray-800 text-theme-xl dark:text-white/90">
                    {isDragActive ? "Drop Files Here" : "Drag & Drop Files Here"}
                  </h4>
                  <span className="text-center mb-5 block w-full max-w-[290px] text-sm text-gray-700 dark:text-gray-400">
                    Drag and drop your PDF, TXT, DOC, DOCX, XLS, XLSX files here or browse
                  </span>
                  <span className="font-medium underline text-theme-sm text-brand-500">
                    Browse Files
                  </span>
                </div>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4 dark:border-gray-800">
              <h4 className="mb-3 font-medium text-gray-800 dark:text-white/90">Uploaded Files</h4>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded dark:bg-gray-800">
                        {file.name.toLowerCase().endsWith('.pdf') && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#FF5252" />
                            <path d="M14.6 11.5C14.4 11.5 14.2 11.5 14 11.5V16.5H12V7.5H14L18 7.5V9.5C17.1 11.2 16.1 11.5 14.6 11.5Z" fill="white" />
                            <path d="M9.5 12.5C8.9 12.5 8.5 12.8 8.5 13.4V14.5H10.5V13.4C10.5 12.8 10.1 12.5 9.5 12.5Z" fill="white" />
                            <path d="M11.2 15.5H10.5V16.5H9.5V15.5H6V11.5H9.5C10.9 11.5 11.5 12.5 11.5 13.4V15.5H11.2Z" fill="white" />
                          </svg>
                        )}
                        {file.name.toLowerCase().endsWith('.txt') && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#2196F3" />
                            <path d="M10 7H14V9H10V7Z" fill="white" />
                            <path d="M10 11H14V13H10V11Z" fill="white" />
                            <path d="M10 15H14V17H10V15Z" fill="white" />
                          </svg>
                        )}
                        {(file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4" />
                            <path d="M11.9 15.6C11.9 16.9 10.9 18 9.5 18C8.1 18 7.1 16.9 7.1 15.6C7.1 14.3 8.1 13.2 9.5 13.2C10.9 13.2 11.9 14.3 11.9 15.6Z" fill="white" />
                            <path d="M16.4 13.1H12.9V18H16.4C17.3 18 18 17.3 18 16.4V14.7C18 13.8 17.3 13.1 16.4 13.1Z" fill="white" />
                            <path d="M8.3 6H16.7V11.2H8.3V6Z" fill="white" />
                          </svg>
                        )}
                        {(file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4CAF50" />
                            <path d="M7 7H10V10H7V7Z" fill="white" />
                            <path d="M11 7H17V10H11V7Z" fill="white" />
                            <path d="M7 11H10V14H7V11Z" fill="white" />
                            <path d="M11 11H17V14H11V11Z" fill="white" />
                            <path d="M7 15H10V18H7V15Z" fill="white" />
                            <path d="M11 15H17V18H11V15Z" fill="white" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9 2C8.44772 2 8 2.44772 8 3V4H5C4.44772 4 4 4.44772 4 5C4 5.55228 4.44772 6 5 6H15C15.5523 6 16 5.55228 16 5C16 4.44772 15.5523 4 15 4H12V3C12 2.44772 11.5523 2 11 2H9ZM5 8C5.55228 8 6 8.44772 6 9V15C6 16.1046 6.89543 17 8 17H12C13.1046 17 14 16.1046 14 15V9C14 8.44772 14.4477 8 15 8C15.5523 8 16 8.44772 16 9V15C16 17.2091 14.2091 19 12 19H8C5.79086 19 4 17.2091 4 15V9C4 8.44772 4.44772 8 5 8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {(submitError || createError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{submitError || createError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700 dark:text-green-400">{submitSuccess}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={createLoading}
              className={`inline-flex items-center px-4 py-2 font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${createLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-600'
                }`}
            >
              {createLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {createLoading ? 'Creating...' : 'Create Knowledge Base'}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
};

export default CreateKnowledgeBase;
