// Types for Template-related data structures

/**
 * Represents a template in the system
 */
export interface Template {
  id?: string;
  templateID: string;
  name?: string;
  templateName?: string; // From API
  description?: string;
  templateDescription?: string; // From API
  icon?: string;
  templateImageURL?: string; // From API
  category?: string;
  version?: string;
  isReadOnly?: boolean;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Raw API response format for a template
 */
export interface TemplateApiResponse {
  templates: Template[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Response from the API for a list of templates
 */
export interface TemplatesResponse {
  templates: Template[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Raw template data from API responses (internal use)
 * Used for mapping API responses to the Template interface
 */
export interface RawTemplateData {
  id?: string;
  templateID?: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  [key: string]: unknown;
}
