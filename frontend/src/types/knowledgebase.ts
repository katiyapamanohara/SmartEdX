// Knowledge base related type definitions

export interface KnowledgeBaseSourceType {
  sourceTypeID: string;
  sourceTypeName: string;
  description?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBaseSourceTypesResponse {
  success: boolean;
  message?: string;
  sourceTypes: KnowledgeBaseSourceType[];
}

export interface CreateKnowledgeBaseRequest {
  knowledgeBaseName: string;
  description: string;
  sourceTypeName: string;
  files: File[];
}

export interface KnowledgeBaseSource {
  knowledgeBaseSourceID: string;
  knowledgeBaseID: string;
  sourceTypeID: string;
  sourceName: string;
  content: string;
  metadata?: string;
  status: string;
  lastProcessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceType?: KnowledgeBaseSourceType;
}

export interface KnowledgeBase {
  knowledgeBaseID: string;
  userID: string;
  knowledgeBaseName: string;
  description?: string;
  sourceTypeName?: string;
  sourceType?: KnowledgeBaseSourceType;
  status: 'active' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sources?: KnowledgeBaseSource[];
}

export interface CreateKnowledgeBaseResponse {
  success: boolean;
  message?: string;
  knowledgeBase?: KnowledgeBase;
}

export interface KnowledgeBaseListResponse {
  success: boolean;
  message?: string;
  knowledgeBases: KnowledgeBase[];
  total?: number;
}

export interface KnowledgeBaseResponse {
  success: boolean;
  message?: string;
  knowledgeBase?: KnowledgeBase;
}

export interface UpdateKnowledgeBaseRequest {
  knowledgeBaseName?: string;
  description?: string;
  status?: 'active' | 'processing' | 'completed' | 'failed';
  sourceTypeName?: string;
  files?: File[];
  sources?: {
    remove?: { knowledgeBaseSourceID: string }[];
  } | string;
}
