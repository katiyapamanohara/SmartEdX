// Workflow related types and interfaces

// Workflow Nodes types
export interface WorkflowNode {
    workflowAgentID: string;
    nodeType: 'start' | 'process' | 'end';
    positionX: number;
    positionY: number;
    nodeConfiguration: string;
}

// Workflow Node Response
export interface WorkflowNodeResponse {
    workflowNodeID: string;
    flowID: string;
    assistantID: string;
    workflowAgentID: string;
    nodeType: 'start' | 'process' | 'end';
    positionX: number;
    positionY: number;
    nodeConfiguration: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateWorkflowRequest {
    assistantID: string;
    flowName: string;
    flowDescription: string;
    nodes: WorkflowNode[];
}

export interface UpdateWorkflowRequest {
    assistantID: string;
    flowName: string;
    flowID: string;
    flowDescription: string;
    nodes: WorkflowNode[];
}

// Union type for both create and update operations
export type WorkflowRequest = CreateWorkflowRequest | UpdateWorkflowRequest;

export interface CreateWorkflowResponse {
    success: boolean;
    message?: string;
    workflowID?: string;
    flowID?: string;
    flowName?: string;
    flowDescription?: string;
    nodes?: WorkflowNodeResponse[];
}

// Workflow Edges types
export interface WorkflowEdge {
    sourceNodeID: string;
    targetNodeID: string;
    edgeCondition: string;
}

export interface CreateWorkflowEdgesRequest {
    assistantID: string;
    flowID: string;
    edges: WorkflowEdge[];
}

export interface CreateWorkflowEdgesResponse {
    success: boolean;
    message?: string;
}

// Workflow Flow List types
export interface Workflow {
    flowID: string;
    assistantID: string;
    flowName: string;
    description?: string;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    nodes?: WorkflowNodeResponse[];
    edges?: WorkflowEdgeResponse[];
}

export interface WorkflowEdgeResponse {
    workflowEdgeID: string;
    flowID: string;
    sourceNodeID: string;
    targetNodeID: string;
    edgeCondition: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetWorkflowsResponse {
    success: boolean;
    message?: string;
    flows?: Workflow[];
}

//single workflow response with nodes and edges at root level
export interface GetSingleWorkflowCompleteResponse {
    success: boolean;
    message?: string;
    flow?: Workflow;
    nodes?: WorkflowNodeResponse[];
    edges?: WorkflowEdgeResponse[];
    workflows?: Workflow[];
}
