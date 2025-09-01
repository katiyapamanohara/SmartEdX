// Services-related type definitions

// Public service interfaces
export interface ServiceItem {
  id: string;
  serviceID: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceListOutput {
  services: ServiceItem[];
  total?: number;
}

// Configuration types based on the backend entities
export interface ChatbotConfiguration {
  assistantServiceID: string;
  chatbotName: string;
  webWidgetThemeColor?: string;
  webWidgetDisplayName?: string;
  webWidgetFontSize?: string;
  webWidgetBotMessageColor?: string;
  webWidgetUserMessageColor?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface VoiceAssistantConfiguration {
  assistantServiceID: string;
  voiceAssistantName: string;
  voiceAssistantImageURL?: string;
  selectedVoice?: string;
  selectedVoiceLanguage?: string;
  selectedVoiceAccent?: string;
  pitch?: number;
  speed?: number;
  volume?: number;
  accentStrength?: number;
  telephonyIntegrationDetails?: string;
  webWidgetEnabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AgentCallingConfiguration {
  assistantServiceID: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SmsConfiguration {
  assistantServiceID: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Service with configuration
export interface ServiceWithConfiguration {
  assistantServiceID: string;
  assistantID: string;
  serviceID: string;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  configuration:
    | ChatbotConfiguration
    | VoiceAssistantConfiguration
    | AgentCallingConfiguration
    | SmsConfiguration
    | null;
}

// Upsert result
export interface ServiceUpsertResult {
  assistantID: string;
  services: ServiceWithConfiguration[];
}

// Update/Request types
export interface ChatbotConfigurationUpdateData {
  assistantID?: string;
  assistantServiceID?: string;
  chatbotName?: string;
  chatbotImageURL?: string | null;
  webWidgetThemeColor?: string | null;
  webWidgetDisplayName?: string | null;
  webWidgetDisplayIconURL?: string | null;
  webWidgetFontSize?: string | null;
  webWidgetBotMessageColor?: string | null;
  webWidgetUserMessageColor?: string | null;
  [key: string]: string | null | undefined;
}

// Response types
export interface ChatbotResponse {
  assistantServiceID?: string;
  chatbotName?: string;
  chatbotImageURL?: string;
  webWidgetThemeColor?: string;
  webWidgetDisplayName?: string;
  webWidgetDisplayIconURL?: string;
  webWidgetFontSize?: string;
  webWidgetBotMessageColor?: string;
  webWidgetUserMessageColor?: string;
  createdAt?: string;
  updatedAt?: string;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

// Internal/Raw types for API responses
export interface RawServiceData {
  id?: string;
  serviceID?: string;
  service_id?: string;
  serviceName?: string;
  name?: string;
  service_name?: string;
  serviceDescription?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface RawAssistantServiceData {
  serviceID?: string;
  service_id?: string;
  assistantServiceID?: string;
  configuration?: Record<string, unknown>;
  [key: string]: unknown;
}

// ChatBot specific configuration interface - moved from components/assistant/chatbot/ChatBot.tsx
export interface ChatBotConfig {
  assistantServiceID: string;
  chatbotName: string;
  chatbotImageURL?: string | null;
  webWidgetThemeColor?: string | null;
  webWidgetDisplayName?: string | null;
  webWidgetDisplayIconURL?: string | null;
  webWidgetFontSize?: string | null;
  webWidgetBotMessageColor?: string | null;
  webWidgetUserMessageColor?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

// Service configuration response interface - moved from components/assistant/chatbot/ChatBot.tsx
export interface ServiceConfigResponse {
  assistantID?: string;
  services?: Array<{
    assistantServiceID: string;
    configuration: ChatBotConfig;
    [key: string]: unknown;
  }>;
  assistantServiceID?: string;
  configuration?: ChatBotConfig;
  [key: string]: unknown;
}

// Voice Assistant specific types
export interface Voice {
  voiceID: string;
  voiceName: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceAccent: string;
  voiceSampleURL: string;
  isActive: boolean;
}

export interface VoiceListResponse {
  voices: Voice[];
  success: boolean;
  message?: string;
}

export interface VoiceAssistantConfigurationUpdate {
  assistantServiceID: string;
  voiceAssistantName?: string;
  voiceAssistantImage?: {
    file: File;
    fileName: string;
    contentType?: string;
  };
  selectedVoice?: string;
  selectedVoiceLanguage?: string;
  selectedVoiceAccent?: string;
  pitch?: number;
  speed?: number;
  volume?: number;
  accentStrength?: number;
  telephonyIntegrationDetails?: string;
  webWidgetEnabled?: boolean;
}

export interface VoiceAssistantConfigurationResponse {
  voiceAssistantConfiguration: VoiceAssistantConfiguration;
  voiceAssistantImageID?: string;
  success: boolean;
  message?: string;
}
