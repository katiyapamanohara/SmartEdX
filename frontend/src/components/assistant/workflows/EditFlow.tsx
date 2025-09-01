"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Modal } from "../../ui/modal";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  ReactFlowInstance,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSingleWorkflow } from '@/hooks/useWorkflows';
import { useAgents } from '@/hooks/useAgents';
import { workflowService } from '@/services/workflowService';
import type { Workflow, WorkflowNodeResponse, WorkflowEdgeResponse, WorkflowNode, WorkflowEdge } from '@/types/workflow';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  isAvailable: boolean;
}

interface EditFlowProps {
  isOpen: boolean;
  onClose: () => void;
  flowID?: string;
  assistantId?: string;
}

//interface for node data
interface NodeData {
  label: string;
  description: string;
  image: string;
}

const EditFlow: React.FC<EditFlowProps> = ({
  isOpen,
  onClose,
  flowID,
  assistantId = ''
}) => {
  const [flowName, setFlowName] = useState("New Flow");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Reset local state (messages and saving state)
  const resetLocalState = useCallback(() => {
    setSaveError('');
    setSaveSuccess('');
  }, []);

  // Reset local state when modal opens/closes or flowID changes
  useEffect(() => {
    if (isOpen) {
      resetLocalState();
    }
  }, [isOpen, flowID, resetLocalState]);

  // Fetch workflow data from API
  const { workflow: flowData, loading: workflowLoading } = useSingleWorkflow(flowID);

  // Reset state when modal opens/closes or when flowID changes
  useEffect(() => {
    resetLocalState();
  }, [isOpen, flowID, resetLocalState]);

  // Load agents using the useAgents hook
  const { agents: apiAgents, loading: agentsLoading } = useAgents(assistantId);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Transform API workflow to React Flow format
  const transformWorkflowToReactFlow = useCallback((workflow: Workflow, nodes?: WorkflowNodeResponse[], edges?: WorkflowEdgeResponse[]) => {
    // Use provided nodes/edges first, then fallback to workflow data
    const workflowNodes = nodes || workflow.nodes || [];
    const workflowEdges = edges || workflow.edges || [];

    // Create a mapping from workflowNodeID to workflowAgentID for edge connections
    const nodeIdMapping: { [key: string]: string } = {};
    workflowNodes.forEach(node => {
      nodeIdMapping[node.workflowNodeID] = node.workflowAgentID;
    });

    // Convert API nodes to React Flow nodes
    const reactFlowNodes: Node[] = workflowNodes.map(node => {
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
    const reactFlowEdges: Edge[] = workflowEdges.map(edge => {
      return {
        id: edge.workflowEdgeID,
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
      };
    });

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  }, []);

  // Initialize form with flow data when flowData changes
  useEffect(() => {
    if (flowData) {
      // Extract flow metadata from the nested flow object
      const flow = flowData.flow;
      if (flow) {
        setFlowName(flow.flowName || "New Flow");
        setDescription(flow.description || "");
        setIsActive(flow.isEnabled || false);

        // Use the nodes and edges from the root level of the API response
        const nodesToUse = flowData.nodes || [];
        const edgesToUse = flowData.edges || [];

        // Transform API data to React Flow format
        const { nodes: reactFlowNodes, edges: reactFlowEdges } = transformWorkflowToReactFlow(flow, nodesToUse, edgesToUse);

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);

        // Extract selected agent IDs from nodes
        const agentIds = reactFlowNodes.map((node: Node) => node.id);
        setSelectedAgents(agentIds);
      }
    }
  }, [flowData, transformWorkflowToReactFlow, setNodes, setEdges]);

  // Separate effect to handle fitView when reactFlowInstance is ready
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [reactFlowInstance, nodes]);

  // Connection handler for React Flow
  const onConnect = useCallback(
    (connection: Connection) => {
      // Use functional update to check if connection exists without edges dependency
      setEdges((currentEdges) => {
        // Check if this connection already exists
        const connectionExists = currentEdges.some(
          edge => edge.source === connection.source && edge.target === connection.target
        );

        if (!connectionExists) {
          return addEdge({
            ...connection,
            id: `e${connection.source}-${connection.target}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6366f1',
              width: 20,
              height: 20,
            },
          }, currentEdges);
        }
        return currentEdges;
      });
    },
    [setEdges]
  );

  // Add reset function for nodes
  const handleResetFlow = useCallback(() => {
    // Clear everything - completely reset the workspace
    setNodes([]);
    setEdges([]);
    setSelectedAgents([]);
    setShowResetConfirmation(false);
  }, [setNodes, setEdges]);

  // Show confirmation dialog before reset
  const handleResetRequest = () => {
    setShowResetConfirmation(true);
  };

  // Cancel reset confirmation
  const handleResetCancel = () => {
    setShowResetConfirmation(false);
  };

  // Add this new function to handle drag and drop for agents
  const onDragStart = (event: React.DragEvent, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      event.dataTransfer.setData('application/reactflow', JSON.stringify(agent));
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  // Add a new function to handle dropping agents onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const agentData = event.dataTransfer.getData('application/reactflow');

      if (!agentData) return;

      const agent = JSON.parse(agentData);

      // Get the position where agent was dropped
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a new node
      const newNode = {
        id: agent.id,
        type: 'custom',
        position,
        data: {
          label: agent.name,
          description: agent.description,
          image: agent.avatarUrl
        }
      };

      setNodes((nds) => nds.concat(newNode));

      // Add agent to selected agents if not already selected
      if (!selectedAgents.includes(agent.id)) {
        setSelectedAgents(prev => [...prev, agent.id]);
      }
    },
    [reactFlowInstance, selectedAgents, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Update agents when apiAgents change
  useEffect(() => {
    if (apiAgents && apiAgents.length > 0 && !agentsLoading) {
      // Convert API agents to the format expected by the component
      const formattedAgents: Agent[] = apiAgents
        .filter(agent => agent.isEnabled) // Only show enabled agents
        .map(agent => ({
          id: agent.workflowAgentID || '',
          name: agent.agentName || 'Unnamed Agent',
          description: agent.description || 'No description available',
          avatarUrl: '/images/user/user-01.jpg', // Default avatar, you can customize this
          isAvailable: agent.isEnabled ?? true,
        }));

      setAgents(formattedAgents);
      setIsLoading(false);
    } else if (agentsLoading) {
      setIsLoading(true);
    }
  }, [apiAgents, agentsLoading]);

  // Update flow visualization when agents are selected
  useEffect(() => {
    // Skip if we're loading workflow or agents
    if (workflowLoading || agentsLoading) {
      return;
    }

    // If we have flow data with nodes, use that and skip this effect
    if (flowData && flowData.nodes && flowData.nodes.length > 0) {
      return;
    }

    if (selectedAgents.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create nodes for selected agents (this is for new agent selection, not for existing workflow)
    const selectedAgentsData = agents.filter(agent =>
      selectedAgents.includes(agent.id)
    );

    const newNodes: Node[] = selectedAgentsData.map((agent, index) => ({
      id: agent.id,
      type: 'custom',
      position: {
        x: 50 + (300 * (index % 3)),
        y: 100 + (200 * Math.floor(index / 3))
      },
      data: {
        label: agent.name,
        description: agent.description,
        image: agent.avatarUrl
      },
      // Add these attributes to improve connections
      connectable: true,
      dragHandle: '.drag-handle'
    }));

    setNodes(newNodes);

    // Use functional update to avoid dependency on edges
    setEdges(currentEdges => {
      // Keep existing edges for connections that still have both nodes
      const validEdges = currentEdges.filter(edge => {
        const sourceExists = selectedAgents.includes(edge.source);
        const targetExists = selectedAgents.includes(edge.target);
        return sourceExists && targetExists;
      });

      // Only return new edges if they actually changed to prevent infinite loop
      if (JSON.stringify(validEdges) !== JSON.stringify(currentEdges)) {
        return validEdges;
      }
      return currentEdges;
    });

  }, [selectedAgents, agents, setNodes, setEdges, workflowLoading, agentsLoading, flowData]);

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSave = async () => {
    if (!flowData || !flowData.flow || !assistantId) {
      setSaveError('Missing required data to save workflow');
      return;
    }

    if (!flowName || !flowName.trim()) {
      setSaveError('Please provide a name for the flow');
      return;
    }

    try {
      setSaveError('');
      setSaveSuccess('');

      const flow = flowData.flow;

      // Transform React Flow nodes back to API format
      const apiNodes: WorkflowNode[] = nodes.map((node, index) => {
        // Find the original node to get the nodeType
        const originalNode = flowData.nodes?.find(n => n.workflowAgentID === node.id);

        // Determine node type based on position in the workflow
        let nodeType: 'start' | 'process' | 'end' = 'process';

        if (nodes.length === 1) {
          // If only one node, it's a start node
          nodeType = 'start';
        } else if (index === 0) {
          // First node is start
          nodeType = 'start';
        } else if (index === nodes.length - 1) {
          // Last node is end
          nodeType = 'end';
        }
        // Middle nodes remain as 'process'

        return {
          workflowAgentID: node.id,
          nodeType: originalNode?.nodeType || nodeType,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
          nodeConfiguration: JSON.stringify(node.data)
        };
      });

      // First update nodes to get the updated workflowNodeIDs
      const nodesResponse = await workflowService.createWorkflow({
        assistantID: assistantId,
        flowName: flowName,
        flowID: flow.flowID,
        flowDescription: description,
        nodes: apiNodes
      });

      // Create a mapping from workflowAgentID to workflowNodeID using the response
      const nodeIdMapping: { [key: string]: string } = {};
      if (nodesResponse.success && nodesResponse.nodes) {
        nodesResponse.nodes.forEach((node: WorkflowNodeResponse) => {
          nodeIdMapping[node.workflowAgentID] = node.workflowNodeID;
        });
      }

      // Transform React Flow edges back to API format using the updated mapping
      const apiEdges: WorkflowEdge[] = edges.map(edge => {
        return {
          sourceNodeID: nodeIdMapping[edge.source] || edge.source,
          targetNodeID: nodeIdMapping[edge.target] || edge.target,
          edgeCondition: 'default'
        };
      });

      // Update edges with the correct workflowNodeIDs
      if (apiEdges.length > 0) {
        await workflowService.createWorkflowEdges({
          assistantID: assistantId,
          flowID: flow.flowID,
          edges: apiEdges
        });
      }

      setSaveSuccess('Workflow updated successfully!');

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving workflow:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save workflow');
    }
  };





  // Custom Node Component with proper handles for connections
  const CustomNode = ({ data, id }: { data: NodeData, id: string }) => (
    <div className="relative bg-white p-3 rounded-lg border border-gray-200 shadow-md w-48 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target`}
        style={{
          background: '#6366f1',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
        isConnectable={true}
      />

      <div className="flex items-center mb-2 drag-handle cursor-move">
        <div className="relative h-8 w-8 rounded-full overflow-hidden mr-2">
          <Image
            src={data.image}
            alt={data.label}
            fill
            className="object-cover"
          />
        </div>
        <div className="font-medium text-sm">{data.label}</div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{data.description}</div>

      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source`}
        style={{
          background: '#6366f1',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
        isConnectable={true}
      />
    </div>
  );

  // Memoize the nodeTypes to prevent React Flow warnings
  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-7xl mx-auto p-0">
      <div className="bg-white dark:bg-gray-900 md:rounded-2xl shadow-lg p-4 sm:p-8 w-full max-h-[100vh] md:max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">Edit Workflow</h2>

        {/* Loading State */}
        {workflowLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {!workflowLoading && (
          <div>
            <div className="grid grid-cols-12 gap-y-4 sm:gap-y-6 gap-x-3 sm:gap-x-6 items-start">
              {/* Flow Name */}
              <div className="col-span-12 md:col-span-6">
                <div className="flex flex-col sm:flex-row sm:items-center mb-4">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 w-full sm:w-32 mb-2 sm:mb-0">
                    Flow Name
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col sm:flex-row sm:items-start mb-4">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 w-full sm:w-32 mb-2 sm:mb-0">
                    Description
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this workflow used for?"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm resize-none dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center mb-4">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 w-full sm:w-32 mb-2 sm:mb-0">
                    Status
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        value=""
                        className="sr-only peer"
                        checked={isActive}
                        onChange={() => setIsActive(!isActive)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-12 gap-4 sm:gap-6">
                {/* Agents Selection - Left Column */}
                <div className="col-span-12 md:col-span-3">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Available Agents
                    <p className="text-xs font-normal text-gray-500 mt-1">
                      Drag agents to the workspace
                    </p>
                  </div>

                  {isLoading || agentsLoading ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading agents...
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No agents available
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[250px] sm:max-h-[500px] overflow-y-auto pr-2">
                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          draggable={agent.isAvailable}
                          onDragStart={(e) => agent.isAvailable && onDragStart(e, agent.id)}
                          onClick={() => agent.isAvailable && toggleAgentSelection(agent.id)}
                          className={`flex items-center p-3 border rounded-lg transition-colors ${!agent.isAvailable
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800'
                            : selectedAgents.includes(agent.id)
                              ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/30 cursor-grab'
                              : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-gray-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/10 cursor-grab'
                            }`}
                        >
                          <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
                            <Image
                              src={agent.avatarUrl}
                              alt={agent.name}
                              fill
                              className="object-cover"
                            />
                            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${agent.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{agent.name}</h4>
                            <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-[160px]">{agent.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500 hidden sm:block">
                    <p className="font-medium">Tip:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Drag agents to the workspace</li>
                      <li>Connect agents by dragging from one node to another</li>
                      <li>Rearrange nodes by dragging them</li>
                    </ul>
                  </div>
                </div>

                {/* Flow Workspace - Right Column */}
                <div className="col-span-12 md:col-span-9">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex justify-between items-center">
                    <div>
                      Flow Workspace
                      <p className="text-xs font-normal text-gray-500 mt-1">
                        Visualize and customize your agent workflow
                      </p>
                      <p className="text-xs font-normal text-blue-600 mt-1">
                        Nodes: {nodes.length} | Connections: {edges.length}
                      </p>
                    </div>
                    <button
                      onClick={handleResetRequest}
                      className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Flow
                    </button>
                  </div>

                  <div className="h-[300px] sm:h-[500px] w-full border border-gray-200 rounded-lg overflow-hidden dark:border-gray-700 relative">
                    {/* Show message when no nodes */}
                    {nodes.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800">
                        <div className="text-center">
                          <p className="text-sm">No workflow nodes to display</p>
                          <p className="text-xs mt-1">Add agents from the sidebar or check the API response</p>
                        </div>
                      </div>
                    )}

                    <ReactFlow
                      key={`${nodes.length}-${edges.length}`} // Force re-render when nodes/edges change
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onInit={setReactFlowInstance}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      nodeTypes={nodeTypes}
                      snapToGrid={true}
                      snapGrid={[15, 15]}
                      connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
                      connectionMode={ConnectionMode.Strict}
                      defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 },
                        markerEnd: {
                          type: MarkerType.ArrowClosed,
                          color: '#6366f1',
                          width: 20,
                          height: 20
                        }
                      }}
                      className="bg-slate-50 dark:bg-gray-800"
                      style={{ width: '100%', height: '100%' }}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                    >
                      <Controls />
                      <Background color="#aaa" gap={16} />
                    </ReactFlow>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-span-12 pt-4">
                {/* Success Message */}
                {saveSuccess && (
                  <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-green-700 dark:text-green-400">{saveSuccess}</p>
                    </div>
                  </div>
                )}

                {saveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        resetLocalState();
                        onClose();
                      }}
                      className="px-4 sm:px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={selectedAgents.length === 0}
                      className={`px-4 sm:px-5 py-2 font-medium rounded-lg text-sm transition ${selectedAgents.length === 0
                        ? 'bg-indigo-300 cursor-not-allowed dark:bg-indigo-800/50 text-white/80'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Dialog */}
        {showResetConfirmation && (
          <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Reset Workflow?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Are you sure you want to reset the workflow? This will remove all nodes and connections from the workspace. This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleResetCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetFlow}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Yes, Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export { EditFlow };
