"use client";
import React, { useState, useCallback, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import Label from "../form/Label";
import TextArea from "../form/input/TextArea";
import { useDropzone } from "react-dropzone";
import { useParams } from "next/navigation";
import { useKnowledgeBaseById, useUpdateKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { UpdateKnowledgeBaseRequest } from "@/types/knowledgebase";

type KnowledgeBaseFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

const KnowledgeBaseDetail: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive' | 'draft'>('active');
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedSourceIds, setRemovedSourceIds] = useState<string[]>([]);

  const params = useParams();
  const id = params?.id as string;
  
  // Fetch knowledge base data using our custom hook
  const { knowledgeBase, loading, error, refetch } = useKnowledgeBaseById(id);
  
  // Hook for updating knowledge base
  const { 
    updateKnowledgeBase, 
    loading: updateLoading, 
    error: updateError 
  } = useUpdateKnowledgeBase();
  
  // Update status setting in useEffect
  useEffect(() => {
    if (knowledgeBase) {      
      // Populate form with data from the API
      setTitle(knowledgeBase.knowledgeBaseName);
      setDescription(knowledgeBase.description || '');

      if (knowledgeBase.status === 'active') {
        setStatus('active');
      } else if (knowledgeBase.status === 'processing') {
        setStatus('draft');
      } else if (knowledgeBase.status === 'completed') {
        setStatus('inactive');
      } else {
        // Default to 'active' if the status is not one of our allowed values
        setStatus('active');
      }
      
      // Map API sources to our file format
      if (knowledgeBase.sources && knowledgeBase.sources.length > 0) {
        const mappedFiles: KnowledgeBaseFile[] = knowledgeBase.sources.map(source => ({
          id: source.knowledgeBaseSourceID,
          name: source.sourceName,
          type: source.sourceName.split('.').pop() || 'unknown',
          size: 1024 * 500,
          uploadedAt: source.createdAt,
        }));
        
        setFiles(mappedFiles);
      } else {
        setFiles([]);
      }
    }
  }, [knowledgeBase]);

  useEffect(() => {
    console.log('Status state updated:', status);
  }, [status]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setNewFiles((prev) => [...prev, ...acceptedFiles]);
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
    disabled: !isEditing,
  });

  const removeFile = (fileId: string) => {
    // Add the ID to the list of sources to remove
    setRemovedSourceIds((prev) => [...prev, fileId]);
    // Also update the UI by removing it from the displayed files
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Map UI status to API status
    const mapStatusToApi = (uiStatus: 'active' | 'inactive' | 'draft'): 'active' | 'processing' | 'completed' | 'failed' => {
      switch (uiStatus) {
        case 'active':
          return 'active';
        case 'inactive':
          return 'completed';
        case 'draft':
          return 'processing';
        default:
          return 'active';
      }
    };
    const updateData: UpdateKnowledgeBaseRequest = {
      knowledgeBaseName: title,
      description,
      status: mapStatusToApi(status)
    };

    // Add new files if any were uploaded
    if (newFiles.length > 0) {
      updateData.files = newFiles;
    }

    // Add sources to remove if any files were deleted
    if (removedSourceIds.length > 0) {
      const sourcesJsonString = `{"remove":[${removedSourceIds.map(id => `{"knowledgeBaseSourceID":"${id}"}`).join(',')}]}`;
      updateData.sources = sourcesJsonString;
    }

    try {
      const response = await updateKnowledgeBase(id, updateData);
      
      if (response.success) {
        // Reset form state
        setIsEditing(false);
        setNewFiles([]);        
        setRemovedSourceIds([]);
        refetch();
      } else {
        // Error will be handled by the hook and displayed
        console.error("Failed to update knowledge base:", response.message);
      }
    } catch (error) {
      console.error("Error updating knowledge base:", error);
    }
  };

  const renderFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#FF5252" />
          <path d="M14.6 11.5C14.4 11.5 14.2 11.5 14 11.5V16.5H12V7.5H14L18 7.5V9.5C17.1 11.2 16.1 11.5 14.6 11.5Z" fill="white" />
          <path d="M9.5 12.5C8.9 12.5 8.5 12.8 8.5 13.4V14.5H10.5V13.4C10.5 12.8 10.1 12.5 9.5 12.5Z" fill="white" />
          <path d="M11.2 15.5H10.5V16.5H9.5V15.5H6V11.5H9.5C10.9 11.5 11.5 12.5 11.5 13.4V15.5H11.2Z" fill="white" />
        </svg>
      );
    }
    
    if (extension === 'txt') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#2196F3" />
          <path d="M10 7H14V9H10V7Z" fill="white" />
          <path d="M10 11H14V13H10V11Z" fill="white" />
          <path d="M10 15H14V17H10V15Z" fill="white" />
        </svg>
      );
    }
    
    if (extension === 'doc' || extension === 'docx') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4" />
          <path d="M11.9 15.6C11.9 16.9 10.9 18 9.5 18C8.1 18 7.1 16.9 7.1 15.6C7.1 14.3 8.1 13.2 9.5 13.2C10.9 13.2 11.9 14.3 11.9 15.6Z" fill="white" />
          <path d="M16.4 13.1H12.9V18H16.4C17.3 18 18 17.3 18 16.4V14.7C18 13.8 17.3 13.1 16.4 13.1Z" fill="white" />
          <path d="M8.3 6H16.7V11.2H8.3V6Z" fill="white" />
        </svg>
      );
    }
    
    if (extension === 'xls' || extension === 'xlsx') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4CAF50" />
          <path d="M7 7H10V10H7V7Z" fill="white" />
          <path d="M11 7H17V10H11V7Z" fill="white" />
          <path d="M7 11H10V14H7V11Z" fill="white" />
          <path d="M11 11H17V14H11V11Z" fill="white" />
          <path d="M7 15H10V18H7V15Z" fill="white" />
          <path d="M11 15H17V18H11V15Z" fill="white" />
        </svg>
      );
    }
    
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#90CAF9" />
        <path d="M14 8V2L20 8H14Z" fill="#E1F5FE" />
        <path d="M10 14H14V19H10V14Z" fill="#1976D2" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <ComponentCard title="Knowledge Base Details">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    status === "active" 
                      ? "bg-success-500/10 text-success-500" 
                      : status === "draft"
                      ? "bg-warning-500/10 text-warning-500"
                      : status === "inactive"
                      ? "bg-gray-500/10 text-gray-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                        disabled={updateLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={updateLoading}
                      >
                        {updateLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600"
                    >
                      Edit Knowledge Base
                    </button>
                  )}
                </div>
              </div>
              
              {updateError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{updateError}</span>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">Knowledge Base Title</Label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 dark:text-white/90">{title}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  {isEditing ? (
                    <TextArea
                      rows={4}
                      value={description}
                      onChange={setDescription}
                    />
                  ) : (
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{description}</p>
                  )}
                </div>
                
                {isEditing && (
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      key={`status-dropdown-${status}`}
                      value={status}
                      onChange={(e) => {
                        const newStatus = e.target.value as 'active' | 'inactive' | 'draft';
                        console.log('Status dropdown changed to:', newStatus);
                        setStatus(newStatus);
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </ComponentCard>
      
      <ComponentCard title="Files">
        <div className="space-y-6">
          {isEditing && (
            <div>
              <Label>Upload New Files</Label>
              <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-xl hover:border-brand-500">
                <div
                  {...getRootProps()}
                  className={`dropzone rounded-xl border-dashed border-gray-300 p-7 lg:p-10
                  ${
                    isDragActive
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
          )}

          {newFiles.length > 0 && (
            <div>
              <h4 className="mb-3 font-medium text-gray-800 dark:text-white/90">New Files</h4>
              <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200 dark:border-gray-800 dark:divide-gray-800">
                {newFiles.map((file, index) => (
                  <li key={index} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded dark:bg-gray-800">
                        {renderFileIcon(file.name)}
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
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => removeNewFile(index)}
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
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-3 font-medium text-gray-800 dark:text-white/90">Existing Files</h4>
            {files.length === 0 ? (
              <div className="text-center py-8 border border-gray-200 rounded-lg dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400">No files found</p>
              </div>
            ) : (
              <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200 dark:border-gray-800 dark:divide-gray-800">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded dark:bg-gray-800">
                        {renderFileIcon(file.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {file.name}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path 
                            fillRule="evenodd" 
                            clipRule="evenodd" 
                            d="M2.5 10C2.5 9.44772 2.94772 9 3.5 9H12.5C13.0523 9 13.5 9.44772 13.5 10C13.5 10.5523 13.0523 11 12.5 11H3.5C2.94772 11 2.5 10.5523 2.5 10ZM10 5.5C10 4.94772 10.4477 4.5 11 4.5L16.5 4.5C17.0523 4.5 17.5 4.94772 17.5 5.5C17.5 6.05228 17.0523 6.5 16.5 6.5L11 6.5C10.4477 6.5 10 6.05228 10 5.5ZM11 13.5C10.4477 13.5 10 13.9477 10 14.5C10 15.0523 10.4477 15.5 11 15.5H16.5C17.0523 15.5 17.5 15.0523 17.5 14.5C17.5 13.9477 17.0523 13.5 16.5 13.5H11Z" 
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      {isEditing && (
                        <button 
                          type="button"
                          onClick={() => removeFile(file.id)}
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
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ComponentCard>
    </div>
  );
};

export default KnowledgeBaseDetail;
