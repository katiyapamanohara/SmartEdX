// Language-related type definitions

// Import Language from assistant types
import type { Language } from '@/types/assistant';

export interface LanguageListResponse {
  data?: Language[] | { languages?: Language[] };
  languages?: Language[];
}

// Internal/Raw type for API responses
export interface RawLanguageData {
  id?: string;
  languageId?: string;
  language_id?: string;
  languageID?: string;
  name?: string;
  languageName?: string;
  language_name?: string;
  code?: string;
  languageCode?: string;
  language_code?: string;
  [key: string]: unknown;
}

// Re-export Language for convenience
export type { Language };
