"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
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
import { useAgents } from '@/hooks/useAgents';
import { workflowService } from '@/services/workflowService';
import type { WorkflowNode, WorkflowNodeResponse } from '@/types/workflow';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  isAvailable: boolean;
}

interface CreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
  assistantId?: string;
}

// Define interface for node data
interface NodeData {
  label: string;
  description: string;
  image: string;
}

// Initial nodes and edges for the flow
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const CreateFlow: React.FC<CreateFlowProps> = ({
  isOpen,
  onClose,
  assistantId = '',
}) => {
  const [flowName, setFlowName] = useState("");
  const [description, setDescription] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'nodes' | 'edges' | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load agents using the useAgents hook
  const { agents: apiAgents, loading: agentsLoading } = useAgents(assistantId);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Reset form when modal opens
  const resetForm = useCallback(() => {
    setFlowName("");
    setDescription("");
    setSelectedAgents([]);
    setNodes([]);
    setEdges([]);
    setError('');
    setSuccess('');
    setIsCreating(false);
    setCreationStep(null);
  }, [setNodes, setEdges]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Connection handler for React Flow
  const onConnect = useCallback(
    (connection: Connection) => {
      // Clear error and success when user makes connections
      if (error) setError('');
      if (success) setSuccess('');

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
    [setEdges, error, success]
  );

  // Add reset function for nodes
  const handleResetFlow = useCallback(() => {
    resetForm();
  }, [resetForm]);

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
    if (selectedAgents.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create nodes for selected agents
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

  }, [selectedAgents, agents, setNodes, setEdges]);

  const toggleAgentSelection = (agentId: string) => {
    // Clear error and success when user makes changes
    if (error) setError('');
    if (success) setSuccess('');

    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };


  const handleCreate = async () => {
    // Clear any previous errors and success messages
    setError('');
    setSuccess('');

    if (!assistantId) {
      setError('Assistant ID is required');
      return;
    }

    if (!flowName || !flowName.trim()) {
      setError('Please provide a name for the flow');
      return;
    }

    if (selectedAgents.length < 2 || nodes.length < 2) {
      setError('Please add at least two agents to the workflow');
      return;
    }

    setIsCreating(true);
    setCreationStep('nodes');

    try {
      // Transform nodes data to API format
      const workflowNodes: WorkflowNode[] = nodes.map((node, index) => {
        // Determine node type based on position in the workflow
        let nodeType: 'start' | 'process' | 'end' = 'process';

        if (nodes.length === 1) {
          // If only one node, it's both start and end
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
          nodeType: nodeType,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
          nodeConfiguration: JSON.stringify({
            label: node.data.label,
            description: node.data.description,
            image: node.data.image
          })
        };
      });

      // Create workflow request
      const workflowRequest = {
        assistantID: assistantId,
        flowName: flowName,
        flowDescription: description,
        nodes: workflowNodes
      };

      // Step 1: Create workflow nodes
      const response = await workflowService.createWorkflow(workflowRequest);

      if (response.success && (response.workflowID || response.flowID)) {
        const flowID = response.workflowID || response.flowID;

        if (!flowID) {
          console.error('No valid flowID found in response');
          setError('Workflow created but missing flowID for creating connections');
          return;
        }

        // Step 2: Create workflow edges if there are any connections
        if (edges.length > 0) {
          setCreationStep('edges');

          // Create a mapping from workflowAgentID to workflowNodeID
          const nodeIdMapping: { [key: string]: string } = {};
          if (response.nodes && Array.isArray(response.nodes)) {
            response.nodes.forEach((node: WorkflowNodeResponse) => {
              nodeIdMapping[node.workflowAgentID] = node.workflowNodeID;
            });
          }

          const workflowEdges = edges.map(edge => ({
            sourceNodeID: nodeIdMapping[edge.source] || edge.source,
            targetNodeID: nodeIdMapping[edge.target] || edge.target,
            edgeCondition: 'default' //default condition
          }));

          const edgesRequest = {
            assistantID: assistantId,
            flowID: flowID,
            edges: workflowEdges
          };

          const edgesResponse = await workflowService.createWorkflowEdges(edgesRequest);

          if (edgesResponse.success) {
            // Success - show success message and close modal after delay
            setSuccess(`Workflow "${flowName}" created successfully with ${nodes.length} agents and ${edges.length} connections!`);
            setTimeout(() => {
              // Reset all form data and state
              setFlowName("");
              setDescription("");
              setSelectedAgents([]);
              setNodes([]);
              setEdges([]);
              setSuccess('');
              setError('');
              onClose();
            }, 2000);
          } else {
            console.error('Failed to create workflow edges:', edgesResponse.message);
            setError(`Workflow created but failed to create connections: ${edgesResponse.message}`);
          }
        } else {
          // Success - show success message and close modal after delay
          setSuccess(`Workflow "${flowName}" created successfully with ${nodes.length} agents!`);
          setTimeout(() => {
            // Reset all form data and state
            setFlowName("");
            setDescription("");
            setSelectedAgents([]);
            setNodes([]);
            setEdges([]);
            setSuccess('');
            setError('');
            onClose();
          }, 2000);
        }

      } else {
        setError(`Failed to create workflow: ${response.message}`);
      }

    } catch (error) {
      console.error('Error creating workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow';
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsCreating(false);
      setCreationStep(null);
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
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">Create New Flow</h2>

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
                  placeholder="Name of the Flow"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
              </div>
            </div>

            {/* Flow Image and Status */}
            {/* <div className="flex items-center mb-4">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 w-32">
                Flow Image
              </div>
              <div className="flex-1 flex items-center">
                <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 mr-4">
                  <Image 
                    src={imageSrc} 
                    alt="Flow image"
                    fill
                    className="object-cover"
                  />
                  <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <div>
                  <button className="px-4 py-2 mb-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors text-sm">
                    Upload Image
                  </button>
                </div>

          
            </div> */}

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

              {isLoading ? (
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
                  onClick={handleResetFlow}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Flow
                </button>
              </div>

              <div className="h-[300px] sm:h-[500px] w-full border border-gray-200 rounded-lg overflow-hidden dark:border-gray-700">
                <ReactFlow
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
                  fitView
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
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 sm:px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={selectedAgents.length === 0 || nodes.length === 0 || isCreating}
                className={`px-4 sm:px-5 py-2 font-medium rounded-lg text-sm transition flex items-center gap-2 ${selectedAgents.length === 0 || nodes.length === 0 || isCreating
                    ? 'bg-indigo-300 cursor-not-allowed dark:bg-indigo-800/50 text-white/80'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
              >
                {isCreating && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isCreating ? (
                  creationStep === 'nodes' ? 'Creating Nodes...' :
                    creationStep === 'edges' ? 'Creating Connections...' :
                      'Creating Workflow...'
                ) : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export { CreateFlow };
