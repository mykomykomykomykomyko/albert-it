import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { OutputLog } from "@/components/output/OutputLog";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { ChatHeader } from "@/components/ChatHeader";
import { useState, useCallback, useEffect } from "react";
import { useWorkflows } from "@/hooks/useWorkflows";
import { toast } from "sonner";
import type { 
  Workflow, 
  WorkflowNode, 
  AgentNode, 
  FunctionNode, 
  ToolNode,
  Stage as StageType,
  Connection,
  ToolInstance,
  LogEntry 
} from "@/types/workflow";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";

// Legacy export for backward compatibility
export type { ToolInstance, LogEntry } from "@/types/workflow";
export type Agent = AgentNode;

import { useTranslation } from "react-i18next";
import { generateId } from "@/lib/utils";

const Stage = () => {
  const { t } = useTranslation('stage');
  const { workflows, createWorkflow, updateWorkflow } = useWorkflows();
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(() => {
    return localStorage.getItem('canvas_currentWorkflowId');
  });
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingFromPort, setConnectingFromPort] = useState<string | undefined>(undefined);
  const [userInput, setUserInput] = useState<string>("");
  const [workflowName, setWorkflowName] = useState<string>("Untitled Workflow");
  const [customAgents, setCustomAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workflow, setWorkflow] = useState<Workflow>({ stages: [], connections: [] });

  // Load workflow from database
  useEffect(() => {
    if (currentWorkflowId) {
      const dbWorkflow = workflows.find(w => w.id === currentWorkflowId);
      if (dbWorkflow) {
        setWorkflow(dbWorkflow.workflow_data);
        setWorkflowName(dbWorkflow.name);
      }
    }
  }, [currentWorkflowId, workflows]);

  // Auto-save workflow to database with debounce
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (currentWorkflowId && workflow.stages.length > 0) {
        await updateWorkflow(currentWorkflowId, {
          workflow_data: workflow,
          name: workflowName,
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [workflow, workflowName, currentWorkflowId]);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [...prev, { time, type, message }]);
  }, []);

  const updateNodeCallback = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    updateNode(nodeId, updates);
  }, []);

  // Use shared workflow execution logic
  const { runSingleAgent, runSingleFunction, runWorkflow, isRunning } = useWorkflowExecution({
    workflow,
    userInput,
    onUpdateNode: updateNodeCallback,
    onAddLog: addLog,
  });

  const addStage = () => {
    const newStage: StageType = {
      id: `stage-${generateId()}`,
      name: `Stage ${workflow.stages.length + 1}`,
      nodes: [],
    };
    setWorkflow((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
  };

  const renameStage = (stageId: string, name: string) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId ? { ...stage, name } : stage
      ),
    }));
  };

  const reorderStages = (fromIndex: number, toIndex: number) => {
    setWorkflow((prev) => {
      const newStages = [...prev.stages];
      const [movedStage] = newStages.splice(fromIndex, 1);
      newStages.splice(toIndex, 0, movedStage);

      // Validate connections after reordering
      const getStageIndex = (nodeId: string): number => {
        for (let i = 0; i < newStages.length; i++) {
          if (newStages[i].nodes.some(n => n.id === nodeId)) {
            return i;
          }
        }
        return -1;
      };

      // Remove connections where output stage is after input stage (backwards connections)
      const validConnections = prev.connections.filter((conn) => {
        const fromStageIndex = getStageIndex(conn.fromNodeId);
        const toStageIndex = getStageIndex(conn.toNodeId);
        return fromStageIndex !== -1 && toStageIndex !== -1 && fromStageIndex < toStageIndex;
      });

      const removedCount = prev.connections.length - validConnections.length;
      if (removedCount > 0) {
        addLog("warning", `Removed ${removedCount} invalid connection(s) after stage reordering`);
      }

      return {
        ...prev,
        stages: newStages,
        connections: validConnections,
      };
    });
  };

  const addNode = (stageId: string, template: any, nodeType: "agent" | "function" | "tool" = "agent") => {
    let newNode: WorkflowNode;

    if (nodeType === "agent") {
      newNode = {
        id: `agent-${generateId()}`,
        nodeType: "agent",
        name: template.name,
        type: template.id,
        systemPrompt: template.defaultSystemPrompt || `You are a ${template.name} agent.`,
        userPrompt: template.defaultUserPrompt || "Process the following input: {input}",
        tools: [],
        status: "idle",
      } as AgentNode;
    } else if (nodeType === "function") {
      newNode = {
        id: `function-${generateId()}`,
        nodeType: "function",
        name: template.name,
        functionType: template.id,
        config: {},
        outputPorts: template.outputs || ["output"],
        status: "idle",
      } as FunctionNode;
    } else {
      newNode = {
        id: `tool-${generateId()}`,
        nodeType: "tool",
        name: template.name,
        toolType: template.id,
        config: {},
        status: "idle",
      } as ToolNode;
    }

    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, nodes: [...stage.nodes, newNode] }
          : stage
      ),
    }));
  };

  // Legacy method for backward compatibility
  const addAgent = (stageId: string, agentTemplate: any) => {
    addNode(stageId, agentTemplate, "agent");
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } as WorkflowNode : node
        ),
      })),
    }));
  };

  // Legacy method for backward compatibility
  const updateAgent = (agentId: string, updates: Partial<AgentNode>) => {
    updateNode(agentId, updates);
  };

  const toggleMinimize = (nodeId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) =>
          node.id === nodeId ? { ...node, minimized: !node.minimized } : node
        ),
      })),
    }));
  };

  const deleteNode = (nodeId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.filter((node) => node.id !== nodeId),
      })),
      // Remove all connections involving this node
      connections: prev.connections.filter(
        (conn) => conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
      ),
    }));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  // Legacy method for backward compatibility
  const deleteAgent = (nodeId: string) => {
    deleteNode(nodeId);
  };

  const deleteStage = (stageId: string) => {
    setWorkflow((prev) => {
      const stageToDelete = prev.stages.find((s) => s.id === stageId);
      const nodeIdsToDelete = stageToDelete?.nodes.map((n) => n.id) || [];
      
      return {
        ...prev,
        stages: prev.stages.filter((stage) => stage.id !== stageId),
        // Remove all connections involving nodes in this stage
        connections: prev.connections.filter(
          (conn) => 
            !nodeIdsToDelete.includes(conn.fromNodeId) && 
            !nodeIdsToDelete.includes(conn.toNodeId)
        ),
      };
    });
  };

  const addToolInstance = (nodeId: string, toolId: string) => {
    const newToolInstance: ToolInstance = {
      id: `tool-${generateId()}`,
      toolId,
      config: {},
    };
    
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) => {
          if (node.id === nodeId && node.nodeType === "agent") {
            const agentNode = node as AgentNode;
            return { ...agentNode, tools: [...agentNode.tools, newToolInstance] } as AgentNode;
          }
          return node;
        }),
      })),
    }));
  };

  const updateToolInstance = (nodeId: string, toolInstanceId: string, config: any) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) => {
          if (node.id === nodeId && node.nodeType === "agent") {
            const agentNode = node as AgentNode;
            return {
              ...agentNode,
              tools: agentNode.tools.map((tool) =>
                tool.id === toolInstanceId ? { ...tool, config } : tool
              ),
            } as AgentNode;
          }
          return node;
        }),
      })),
    }));
  };

  const removeToolInstance = (nodeId: string, toolInstanceId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) => {
          if (node.id === nodeId && node.nodeType === "agent") {
            const agentNode = node as AgentNode;
            return { ...agentNode, tools: agentNode.tools.filter((t) => t.id !== toolInstanceId) } as AgentNode;
          }
          return node;
        }),
      })),
    }));
  };

  const saveWorkflow = async () => {
    try {
      if (currentWorkflowId) {
        // Update existing
        await updateWorkflow(currentWorkflowId, {
          workflow_data: workflow,
          name: workflowName,
        });
        toast.success(t('messages.workflowSavedToDb'));
      } else {
        // Create new
        const newWorkflow = await createWorkflow({
          name: workflowName,
          workflow_data: workflow,
          description: '',
        });
        if (newWorkflow) {
          setCurrentWorkflowId(newWorkflow.id);
          localStorage.setItem('canvas_currentWorkflowId', newWorkflow.id);
          toast.success(t('messages.workflowSavedToDb'));
        }
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error(t('messages.failedToSave'));
    }
  };

  const loadWorkflow = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loaded = JSON.parse(e.target?.result as string);
        
        // Handle both old format (just workflow) and new format (with metadata)
        if (loaded.workflow) {
          // New format with metadata
          setWorkflow(loaded.workflow);
          setUserInput(loaded.userInput || "");
          setWorkflowName(loaded.workflowName || "Untitled Workflow");
          setCustomAgents(loaded.customAgents || []);
        } else {
          // Old format (just the workflow object)
          setWorkflow(loaded);
        }
        
        setSelectedNode(null);
      } catch (error) {
        console.error("Failed to load workflow:", error);
        alert("Failed to load workflow file");
      }
    };
    reader.readAsText(file);
  };

  const clearWorkflow = () => {
    if (confirm(t('messages.clearConfirm'))) {
      setWorkflow({ stages: [], connections: [] });
      setUserInput("");
      setWorkflowName("Untitled Workflow");
      setCustomAgents([]);
      setSelectedNode(null);
      setConnectingFrom(null);
      setCurrentWorkflowId(null);
      localStorage.removeItem('canvas_currentWorkflowId');
    }
  };

  const handleStartConnection = (nodeId: string | null, outputPort?: string) => {
    setConnectingFrom(nodeId);
    setConnectingFromPort(outputPort);
  };

  const handleCompleteConnection = (fromNodeId: string, toNodeId: string, fromOutputPort?: string) => {
    addConnection(fromNodeId, toNodeId, fromOutputPort);
    setConnectingFromPort(undefined);
  };

  const addConnection = (fromNodeId: string, toNodeId: string, fromOutputPort?: string) => {
    const newConnection: Connection = {
      id: `conn-${generateId()}`,
      fromNodeId,
      toNodeId,
      fromOutputPort,
    };
    setWorkflow((prev) => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }));
    setConnectingFrom(null);
    setConnectingFromPort(undefined);
  };

  const deleteConnection = (connectionId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      connections: prev.connections.filter((conn) => conn.id !== connectionId),
    }));
  };

  const selectedNodeData = workflow.stages
    .flatMap((s) => s.nodes)
    .find((n) => n.id === selectedNode);
  
  const selectedAgent = selectedNodeData?.nodeType === "agent" ? (selectedNodeData as AgentNode) : undefined;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <ChatHeader />
      <Toolbar
        onAddStage={addStage}
        onSave={saveWorkflow}
        onLoad={loadWorkflow}
        onClear={clearWorkflow}
        onRun={runWorkflow}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResponsiveLayout
          sidebar={
            <Sidebar 
              onAddAgent={addAgent}
              onAddNode={addNode}
              workflow={workflow} 
              userInput={userInput}
              onUserInputChange={setUserInput}
              workflowName={workflowName}
              onWorkflowNameChange={setWorkflowName}
              customAgents={customAgents}
              onCustomAgentsChange={setCustomAgents}
            />
          }
          mobileCanvas={
            <WorkflowCanvas 
              workflow={workflow}
              selectedNode={selectedNode}
              connectingFrom={connectingFrom}
              layoutId="mobile"
              onSelectNode={setSelectedNode}
              onAddAgent={addAgent}
              onAddNode={addNode}
              onDeleteAgent={deleteAgent}
              onDeleteStage={deleteStage}
              onRenameStage={renameStage}
              onReorderStages={reorderStages}
              onToggleMinimize={toggleMinimize}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDeleteConnection={deleteConnection}
            />
          }
          desktopCanvas={
            <WorkflowCanvas 
              workflow={workflow}
              selectedNode={selectedNode}
              connectingFrom={connectingFrom}
              layoutId="desktop"
              onSelectNode={setSelectedNode}
              onAddAgent={addAgent}
              onAddNode={addNode}
              onDeleteAgent={deleteAgent}
              onDeleteStage={deleteStage}
              onRenameStage={renameStage}
              onReorderStages={reorderStages}
              onToggleMinimize={toggleMinimize}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDeleteConnection={deleteConnection}
            />
          }
          properties={
            <PropertiesPanel
              selectedAgent={selectedAgent}
              selectedNode={selectedNodeData}
              onUpdateAgent={updateAgent}
              onUpdateNode={updateNode}
              onAddToolInstance={addToolInstance}
              onUpdateToolInstance={updateToolInstance}
              onRemoveToolInstance={removeToolInstance}
              onDeselectAgent={() => setSelectedNode(null)}
              onRunAgent={runSingleAgent}
              onRunFunction={runSingleFunction}
            />
          }
          onAddStage={addStage}
          onRun={runWorkflow}
          onSave={saveWorkflow}
          onLoad={loadWorkflow}
          onClear={clearWorkflow}
          hasSelectedAgent={!!selectedNodeData}
        />
        
        <OutputLog logs={logs} />
      </div>
    </div>
  );
};

export default Stage;