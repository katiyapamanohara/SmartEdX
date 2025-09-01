// LLM-related type definitions

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  displayValue: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LLMListParams {
  sort?: string;
  search?: string;
  limit?: number;
  page?: number;
}

export interface LLMListResponse {
  data: LLMModel[];
  total: number;
  page: number;
  limit: number;
}

// Internal/Raw type for API responses
export interface RawLLMModelData {
  id?: string;
  llmID?: string;
  _id?: string;
  name?: string;
  llmName?: string;
  modelName?: string;
  provider?: string;
  providerName?: string;
  displayValue?: string;
  modelKey?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}
