// API service for agent operations
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type { AgentTypeListOutput, CreateAgentRequest, CreateAgentResponse, WorkflowsGetByAssistantOutput, UpdateAgentRequest, UpdateAgentResponse, APIAgent } from '@/types/agent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class AgentService {

    async getAgentTypes(): Promise<AgentTypeListOutput> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_BASE_URL}/workflows/agent-types?version=1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();

                if (isApiError(errorData.error)) {
                    throw new Error(getErrorMessage(errorData.error));
                } else if (errorData.message) {
                    throw new Error(getErrorMessage(errorData));
                } else {
                    throw new Error('Failed to fetch agent types. Please try again.');
                }
            } catch (parseError) {
                if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                    throw parseError;
                }
                throw new Error('Failed to fetch agent types. Please try again.');
            }
        }

        const data = await response.json();

        // Handle direct array response from API
        if (Array.isArray(data)) {
            return {
                data: data,
                success: true,
                message: 'Agent types loaded successfully'
            };
        }

        // Handle wrapped response format (data.data)
        if (data && Array.isArray(data.data)) {
            return {
                data: data.data,
                success: data.success ?? true,
                message: data.message
            };
        }

        // Invalid response format
        return {
            data: [],
            success: false,
            message: 'Invalid response format'
        };
    }

    async createAgent(agentData: CreateAgentRequest): Promise<CreateAgentResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        // Prepare the payload - only include description if it's not empty
        const payload: {
            assistantID: string;
            agentName: string;
            agentTypeID: string;
            description?: string;
        } = {
            assistantID: agentData.assistantID,
            agentName: agentData.agentName,
            agentTypeID: agentData.agentTypeID,
        };

        // Only add description if it's provided and not empty
        if (agentData.description && agentData.description.trim()) {
            payload.description = agentData.description.trim();
        }

        const response = await fetch(`${API_BASE_URL}/workflows/agent?version=1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Agent creation failed:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            try {
                const errorData = await response.json();
                console.error('Error response data:', errorData);

                if (isApiError(errorData.error)) {
                    throw new Error(getErrorMessage(errorData.error));
                } else if (errorData.message) {
                    throw new Error(getErrorMessage(errorData));
                } else {
                    throw new Error(`Failed to create agent (${response.status}): ${response.statusText}`);
                }
            } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                    throw parseError;
                }
                throw new Error(`Failed to create agent (${response.status}): ${response.statusText}`);
            }
        }

        const data = await response.json();

        // Handle direct response or wrapped response
        if (data && (data.agentID || data.agent)) {
            return {
                agent: data.agent || data,
                success: true,
                message: data.message || 'Agent created successfully'
            };
        }

        // Fallback for unexpected response format
        return {
            agent: data,
            success: data.success ?? true,
            message: data.message || 'Agent created successfully'
        };
    }

    async getAgentsByAssistant(assistantID: string, workflowAgentID?: string): Promise<WorkflowsGetByAssistantOutput> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        const url = new URL(`${API_BASE_URL}/workflows/agent/assistant/${assistantID}`);
        url.searchParams.set('version', '1');
        if (workflowAgentID) {
            url.searchParams.set('workflowAgentID', workflowAgentID);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();

                if (isApiError(errorData.error)) {
                    throw new Error(getErrorMessage(errorData.error));
                } else if (errorData.message) {
                    throw new Error(getErrorMessage(errorData));
                } else {
                    throw new Error('Failed to fetch agents. Please try again.');
                }
            } catch (parseError) {
                if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                    throw parseError;
                }
                throw new Error('Failed to fetch agents. Please try again.');
            }
        }

        const data = await response.json();
        // Handle the actual API response format with workflows array
        if (data && Array.isArray(data.workflows)) {
            return {
                agents: data.workflows.map((workflow: APIAgent) => ({
                    workflowAgentID: workflow.workflowAgentID,
                    agentName: workflow.agentName,
                    description: workflow.description,
                    agentTypeID: workflow.agentTypeID,
                    assistantID: workflow.assistantID,
                    isActive: workflow.isEnabled,
                    isEnabled: workflow.isEnabled,
                    createdAt: workflow.createdAt,
                    updatedAt: workflow.updatedAt,
                    aiModelID: workflow.aiModelID,
                    initialPrompt: workflow.initialPrompt,
                    systemPrompt: workflow.systemPrompt,
                    defaultUserPrompt: workflow.defaultUserPrompt,
                    greetingsMessage: workflow.greetingsMessage,
                    errorMessage: workflow.errorMessage
                })),
                success: true,
                message: 'Agents loaded successfully'
            };
        }

        // Handle direct array response
        if (Array.isArray(data)) {
            return {
                agents: data,
                success: true,
                message: 'Agents loaded successfully'
            };
        }

        // Handle wrapped response format with agents array
        if (data && Array.isArray(data.agents)) {
            return {
                agents: data.agents,
                success: data.success ?? true,
                message: data.message
            };
        }

        // Invalid response format
        return {
            agents: [],
            success: false,
            message: 'Invalid response format'
        };
    }

    async updateAgent(workflowAgentID: string, updateData: UpdateAgentRequest): Promise<UpdateAgentResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        // Log the request for debugging
        console.log('Updating agent:', {
            workflowAgentID,
            payload: updateData,
            url: `${API_BASE_URL}/workflows/agent/${workflowAgentID}?version=1`
        });

        const response = await fetch(`${API_BASE_URL}/workflows/agent/${workflowAgentID}?version=1`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            console.error('Agent update failed:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            try {
                const errorData = await response.json();
                console.error('Error response data:', errorData);

                if (isApiError(errorData.error)) {
                    throw new Error(getErrorMessage(errorData.error));
                } else if (errorData.message) {
                    throw new Error(getErrorMessage(errorData));
                } else {
                    throw new Error(`Failed to update agent (${response.status}): ${response.statusText}`);
                }
            } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                    throw parseError;
                }
                throw new Error(`Failed to update agent (${response.status}): ${response.statusText}`);
            }
        }

        const data = await response.json();

        return {
            agent: data.agent || data,
            success: data.success ?? true,
            message: data.message || 'Agent updated successfully'
        };
    }
}

export const agentService = new AgentService();
export default agentService;
