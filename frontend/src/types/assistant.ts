// Types for Assistant-related data structures

/**
 * Represents a language supported by the system
 */
export interface Language {
  id: string;
  languageID: string; // ("lang_001")
  name: string;
  languageName?: string;
  code: string;
  languageCode?: string;
}

/**
 * Core Assistant interface
 * Represents an assistant in the system
 */
export interface Assistant {
  id: string;
  name?: string;
  description?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  status?: string;
  settings?: AssistantSettings;
  instructions?: string;
  selectedLLMID?: string;
  creationMode?: string;
  languages?: AssistantLanguage[];
  [key: string]: unknown;
}

/**
 * Settings for an assistant
 */
export interface AssistantSettings {
  model?: string;
  temperature?: number;
  contextLength?: number;
  voice?: string;
  speed?: number;
}

/**
 * Language configuration for an assistant
 */
export interface AssistantLanguage {
  id: string;
  languageID: string;
  languageCode: string;
  languageName: string;
}

/**
 * Raw API response format for an assistant
 */
export interface AssistantApiResponse {
  assistantID: string;
  assistantName?: string;
  description?: string;
  assistantImageURL?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  status?: string;
  selectedLLMID?: string;
  systemPrompt?: string;
  instructions?: string;
  temperature?: number;
  contextLength?: number;
  [key: string]: unknown;
}

/**
 * Data required to create a new assistant
 */
export interface CreateAssistantData {
  name: string;
  description: string;
  avatar?: string;
  selectedLLMID: string;
  languageIDs: string[];
  instructions?: string;
  settings?: Partial<AssistantSettings>;
}

/**
 * Form data for creating an assistant
 */
export interface CreateAssistantFormData {
  assistantName: string;
  selectedLLMID: string;
  languageIDs: string[];
  description: string;
  assistantImage?: File;
  instructions?: string;
  sourceTemplateID?: string; // ID of the template to use as a source
}

/**
 * Data required to update an existing assistant
 */
export interface UpdateAssistantData {
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<AssistantSettings>;
  instructions?: string;
  languageIDs?: string[];
  selectedLLMID?: string;
  serviceIDs?: string[];
}

/**
 * Form data for updating an assistant
 */
export interface UpdateAssistantFormData {
  assistantName?: string;
  selectedLLMID?: string;
  languageIDs?: string;
  description?: string;
  assistantImage?: File;
  instructions?: string;
  serviceIDs?: string;
}

/**
 * Response from the API for a list of assistants
 */
export interface AssistantsResponse {
  assistants: Assistant[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Props for assistant components
 */
export interface AssistantProps {
  assistant: Assistant;
  onUpdate?: (assistant: Assistant) => void;
  onDelete?: (id: string) => void;
}

/**
 * Raw assistant data from API responses (internal use)
 * Used for mapping API responses to the Assistant interface
 */
export interface RawAssistantData {
  assistantID?: string;
  id?: string;
  assistantName?: string;
  name?: string;
  description?: string;
  assistantImageURL?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userID?: string;
  status?: string;
  selectedLLMID?: string;
  creationMode?: string;
  temperature?: number;
  contextLength?: number;
  instructions?: string;
  systemPrompt?: string;
  settings?: {
    model?: string;
    temperature?: number;
    contextLength?: number;
  };
  [key: string]: unknown;
}
