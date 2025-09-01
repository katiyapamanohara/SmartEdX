'use client';

import React, { useState } from 'react';
import { CreateFlow } from '../CreateFlow';
import { EditFlow } from './EditFlow';
import { MarkerType } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import { useWorkflows } from '@/hooks/useWorkflows';
import type { Workflow } from '@/types/workflow';

// Define FlowData interface
interface FlowData {
  id: string;
  name: string;
  description: string;
  status: string;
  icon: string;
  color: string;
  flowStructure?: {
    nodes: Node[];
    edges: Edge[];
  };

  // Optional API properties for when we have full data
  flowID?: string;
  assistantID?: string;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowsProps {
  assistantId?: string;
}

export const Workflows: React.FC<WorkflowsProps> = ({ assistantId }) => {
  const [isCreateFlowOpen, setIsCreateFlowOpen] = useState(false);
  const [isEditFlowOpen, setIsEditFlowOpen] = useState(false);
  const [currentFlowID, setCurrentFlowID] = useState<string | undefined>(undefined);

  // Fetch workflows from API
  const { workflows: apiWorkflows, loading: workflowsLoading, error: workflowsError, refetch } = useWorkflows(assistantId);

  // Transform API workflow to UI FlowData format
  const transformWorkflowToFlowData = (workflow: Workflow): FlowData => {
    // Ensure nodes array exists, default to empty array if undefined
    const workflowNodes = workflow.nodes || [];
    const workflowEdges = workflow.edges || [];

    // Create a mapping from workflowNodeID to workflowAgentID for edge connections
    const nodeIdMapping: { [key: string]: string } = {};
    workflowNodes.forEach(node => {
      //map from workflowNodeID to workflowAgentID
      const nodeId = node.workflowNodeID || node.workflowAgentID;
      nodeIdMapping[nodeId] = node.workflowAgentID;
    });

    // Convert API nodes to React Flow nodes
    const nodes: Node[] = workflowNodes.map(node => {
      let nodeData;
      try {
        nodeData = JSON.parse(node.nodeConfiguration || '{}');
      } catch {
        nodeData = {
          label: 'Unknown Agent',
          description: 'Configuration error',
          image: '/images/user/user-01.jpg'
        };
      }

      return {
        id: node.workflowAgentID,
        type: 'custom',
        position: { x: node.positionX || 0, y: node.positionY || 0 },
        data: nodeData,
        connectable: true,
        dragHandle: '.drag-handle'
      };
    });

    // Convert API edges to React Flow edges
    const edges: Edge[] = workflowEdges.map(edge => ({
      id: edge.workflowEdgeID,
      // Map the node IDs from the API to React Flow node IDs
      source: nodeIdMapping[edge.sourceNodeID] || edge.sourceNodeID,
      target: nodeIdMapping[edge.targetNodeID] || edge.targetNodeID,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1',
        width: 20,
        height: 20,
      }
    }));

    // Determine UI properties based on API data
    const getFlowIcon = (flowName: string) => {
      const name = flowName.toLowerCase();
      if (name.includes('support') || name.includes('customer')) return 'workflow-support';
      if (name.includes('lead') || name.includes('qualification')) return 'workflow-chart';
      if (name.includes('data') || name.includes('processing')) return 'workflow-data';
      return 'workflow-support';
    };

    const getFlowColor = (flowName: string) => {
      const name = flowName.toLowerCase();
      if (name.includes('support') || name.includes('customer')) return 'indigo';
      if (name.includes('lead') || name.includes('qualification')) return 'purple';
      if (name.includes('data') || name.includes('processing')) return 'blue';
      return 'indigo';
    };

    return {
      id: workflow.flowID,
      name: workflow.flowName,
      description: workflow.description ?? '',
      status: workflow.isEnabled ? 'active' : 'disabled',
      icon: getFlowIcon(workflow.flowName),
      color: getFlowColor(workflow.flowName),
      flowStructure: { nodes, edges },
      flowID: workflow.flowID,
      assistantID: workflow.assistantID,
      isEnabled: workflow.isEnabled,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  };

  // Convert API workflows to FlowData format
  const flowsData: FlowData[] = (apiWorkflows || []).map(transformWorkflowToFlowData);

  // Function to open edit flow modal with selected flow ID
  const handleEditFlow = (flow: FlowData) => {
    setCurrentFlowID(flow.id);
    setIsEditFlowOpen(true);
  };

  // Refresh workflows when create flow is closed (to show new workflows)
  const handleCreateFlowClose = () => {
    setIsCreateFlowOpen(false);
    refetch(); // Refresh the workflows list
  };

  // Function to get status badge based on flow status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>;
      case 'disabled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Disabled</span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Error</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Unknown</span>;
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
        {/* Create New Flow Card */}
        <div
          className="bg-white border border-gray-300 rounded-2xl overflow-hidden transition-all hover:border-indigo-400 dark:bg-white/[0.03] dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer flex items-center justify-center mb-8 max-w-2xl mx-auto"
          onClick={() => setIsCreateFlowOpen(true)}
        >
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New Flow
            </h3>
            <p className="text-gray-500 text-sm dark:text-gray-400 mt-2">
              Build a custom workflow to automate your business processes
            </p>
          </div>
        </div>
        {/* Create Flow Modal */}
        {assistantId && (
          <CreateFlow
            isOpen={isCreateFlowOpen}
            onClose={handleCreateFlowClose}
            assistantId={assistantId}
          />
        )}

        {/* Edit Flow Modal */}
        {assistantId && (
          <EditFlow
            isOpen={isEditFlowOpen}
            onClose={() => setIsEditFlowOpen(false)}
            flowID={currentFlowID}
            assistantId={assistantId}
          />
        )}

        <h2 className="text-xl text-center font-semibold text-gray-900 dark:text-white mb-6">
          Your flows
        </h2>

        {/* Loading State */}
        {workflowsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!workflowsLoading && !workflowsError && flowsData.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No workflows found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first workflow.</p>
          </div>
        )}

        {/* Flows Grid */}
        {!workflowsLoading && !workflowsError && flowsData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {/* Flow Cards from API data */}
            {flowsData.map(flow => (
              <div
                key={flow.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all hover:shadow-md dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer"
              >
                <div className="p-6">
                  <div className={`w-14 h-14 rounded-lg bg-${flow.color}-100 dark:bg-${flow.color}-900/30 flex items-center justify-center mb-2`}>
                    {flow.icon === "workflow-support" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${flow.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10h-4v4h4m0-4v-2a2 2 0 00-2-2h-2M8 18h4v-4H8m0 4v2a2 2 0 002 2h2M4 8h4V4H4m0 4v2a2 2 0 002 2h2" />
                      </svg>
                    ) : flow.icon === "workflow-chart" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${flow.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 text-${flow.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {flow.name}
                  </h3>
                  <p className="text-gray-500 text-sm dark:text-gray-400 mt-2">
                    {flow.description}
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <button
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFlow(flow);
                    }}
                  >
                    Edit flow →
                  </button>
                  <div className="flex items-center">
                    {getStatusBadge(flow.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Workflows;