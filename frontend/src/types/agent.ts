// Agent related types and interfaces

export interface AgentType {
  agentTypeID: string;
  agentTypeName: string;
  description?: string;
}

export interface AgentTypeListOutput {
  data: AgentType[];
  success: boolean;
  message?: string;
}

// Local Agent interface for UI components
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  workflowAgentID?: string;
}

// Agent settings interface for configuration
export interface AgentSettings {
  prompts: {
    systemPrompt: string;
    userPrompt: string;
    greetingMessage: string;
    errorMessage: string;
  };
  integration: {
    endpoint: string;
    apiKey: string;
    isEnabled: boolean;
  };
  parameters: {
    temperature: number;
    maxTokens: number;
    model: string;
    apiKey?: string;
  };
  training: {
    initialPrompt: string;
    instructions: string[];
  };
}

// API Agent interface (from backend)
export interface APIAgent {
  workflowAgentID?: string;
  agentName: string;
  description: string;
  agentTypeID: string;
  assistantID: string;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  aiModelID?: string | null;
  initialPrompt?: string | null;
  systemPrompt?: string | null;
  defaultUserPrompt?: string | null;
  greetingsMessage?: string | null;
  errorMessage?: string | null;
}

export interface WorkflowsGetByAssistantOutput {
  agents: APIAgent[];
  success: boolean;
  message?: string;
}

export interface CreateAgentRequest {
  assistantID: string;
  agentName: string;
  description?: string;
  agentTypeID: string;
}

export interface CreateAgentFormData {
  name: string;
  description: string;
  type: string;
  isActive: boolean;
}

export interface CreateAgentResponse {
  agent: APIAgent;
  success: boolean;
  message?: string;
}

export interface UpdateAgentRequest {
  isEnabled?: boolean;
  agentName?: string;
  description?: string;
  agentTypeID?: string;
  aiModelID?: string;
  initialPrompt?: string;
  systemPrompt?: string;
  defaultUserPrompt?: string;
  greetingsMessage?: string;
  errorMessage?: string;
}

export interface UpdateAgentResponse {
  agent: APIAgent;
  success: boolean;
  message?: string;
}
