// API service for workflow operations
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type {
    CreateWorkflowResponse,
    CreateWorkflowEdgesRequest,
    CreateWorkflowEdgesResponse,
    WorkflowRequest,
    GetWorkflowsResponse,
    GetSingleWorkflowCompleteResponse,
} from '@/types/workflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class WorkflowService {

    async createWorkflow(request: WorkflowRequest): Promise<CreateWorkflowResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/workflows/nodes`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();

                    if (isApiError(errorData.error)) {
                        throw new Error(getErrorMessage(errorData.error));
                    } else if (errorData.message) {
                        throw new Error(getErrorMessage(errorData));
                    } else {
                        throw new Error('Failed to create workflow. Please try again.');
                    }
                } catch (parseError) {
                    if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                        throw parseError;
                    }
                    throw new Error('Failed to create workflow. Please try again.');
                }
            }

            const data = await response.json();

            return {
                success: true,
                message: data.message || 'Workflow created successfully',
                workflowID: data.flowID || data.workflowID, // Handle both flowID and workflowID
                flowName: data.flowName,
                flowDescription: data.flowDescription,
                nodes: data.nodes,
            };

        } catch (error) {
            console.error('Error creating workflow:', error);
            throw error instanceof Error ? error : new Error('Failed to create workflow');
        }
    }

    async createWorkflowEdges(request: CreateWorkflowEdgesRequest): Promise<CreateWorkflowEdgesResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/workflows/edges`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();

                    if (isApiError(errorData.error)) {
                        throw new Error(getErrorMessage(errorData.error));
                    } else if (errorData.message) {
                        throw new Error(getErrorMessage(errorData));
                    } else {
                        throw new Error('Failed to create workflow edges. Please try again.');
                    }
                } catch (parseError) {
                    if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                        throw parseError;
                    }
                    throw new Error('Failed to create workflow edges. Please try again.');
                }
            }

            const data = await response.json();

            return {
                success: true,
                message: data.message || 'Workflow edges created successfully',
            };

        } catch (error) {
            console.error('Error creating workflow edges:', error);
            throw error instanceof Error ? error : new Error('Failed to create workflow edges');
        }
    }

    async getWorkflows(assistantID: string): Promise<GetWorkflowsResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        if (!assistantID) {
            throw new Error('Assistant ID is required');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/workflows/flow/assistant/${assistantID}`, {
                method: 'GET',
                headers: {
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
                        throw new Error('Failed to fetch workflow flows. Please try again.');
                    }
                } catch (parseError) {
                    if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                        throw parseError;
                    }
                    throw new Error('Failed to fetch workflow flows. Please try again.');
                }
            }

            const data = await response.json();

            return {
                success: true,
                message: data.message || 'Workflow flows fetched successfully',
                flows: data.flows || [],
            };

        } catch (error) {
            console.error('Error fetching workflow flows:', error);
            throw error instanceof Error ? error : new Error('Failed to fetch workflow flows');
        }
    }

    async getSingleWorkflow(flowID: string): Promise<GetSingleWorkflowCompleteResponse> {
        const token = TokenManager.getAccessToken();

        if (!token) {
            throw new Error('No authentication token found');
        }

        if (!flowID) {
            throw new Error('Flow ID is required');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/workflows/agent/flow/${flowID}`, {
                method: 'GET',
                headers: {
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
                        throw new Error('Failed to fetch workflow flow. Please try again.');
                    }
                } catch (parseError) {
                    if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
                        throw parseError;
                    }
                    throw new Error('Failed to fetch workflow flow. Please try again.');
                }
            }

            const data = await response.json();

            return {
                success: true,
                message: data.message || 'Workflow flow fetched successfully',
                flow: data.flow || null,
                nodes: data.nodes || [],
                edges: data.edges || [],
                workflows: data.workflows || [],
            };

        } catch (error) {
            console.error('Error fetching single workflow flow:', error);
            throw error instanceof Error ? error : new Error('Failed to fetch workflow flow');
        }
    }
}

export const workflowService = new WorkflowService();
