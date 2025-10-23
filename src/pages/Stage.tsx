import { ChatHeader } from "@/components/ChatHeader";
import { useState } from "react";
import { Toolbar } from "@/components/workflow/stage/Toolbar";
import { ResponsiveLayout } from "@/components/workflow/stage/ResponsiveLayout";
import { WorkflowCanvas } from "@/components/workflow/stage/WorkflowCanvas";
import { Sidebar } from "@/components/workflow/stage/Sidebar";
import { PropertiesPanel } from "@/components/workflow/stage/PropertiesPanel";
import { OutputLog, LogEntry } from "@/components/workflow/stage/OutputLog";
import type { Workflow, Stage as StageType, AgentNode, FunctionNode, Connection } from "@/types/workflow";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";

const Stage = () => {
  const { agents: savedAgents } = useAgents();
  
  const [workflow, setWorkflow] = useState<Workflow>({
    stages: [],
    connections: [],
  });
  const [workflowName, setWorkflowName] = useState("");
  const [userInput, setUserInput] = useState("");
  const [customAgents, setCustomAgents] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const selectedAgent = selectedNode 
    ? workflow.stages.flatMap(s => s.nodes).find(n => n.id === selectedNode && n.nodeType === "agent") as AgentNode | undefined
    : undefined;

  const selectedNodeData = selectedNode
    ? workflow.stages.flatMap(s => s.nodes).find(n => n.id === selectedNode)
    : undefined;

  const addStage = () => {
    const newStage: StageType = {
      id: `stage-${Date.now()}`,
      name: `Stage ${workflow.stages.length + 1}`,
      nodes: [],
    };
    setWorkflow((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
    addLog("info", `Added ${newStage.name}`);
  };

  const addLog = (type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, type, message }]);
  };

  const handleAddAgent = (stageId: string, template: any) => {
    const newNode: AgentNode = {
      id: `agent-${Date.now()}`,
      nodeType: "agent",
      name: template.name,
      type: template.id,
      systemPrompt: template.defaultSystemPrompt,
      userPrompt: template.defaultUserPrompt,
      tools: [],
      status: "idle",
    };

    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, nodes: [...stage.nodes, newNode] }
          : stage
      ),
    }));
    addLog("success", `Added agent: ${template.name}`);
  };

  const handleAddNode = (stageId: string, template: any, nodeType: "agent" | "function" | "tool") => {
    if (nodeType === "function") {
      const newNode: FunctionNode = {
        id: `function-${Date.now()}`,
        nodeType: "function",
        name: template.name,
        functionType: template.id,
        config: {},
        outputPorts: template.outputs || ["output"],
        status: "idle",
      };

      setWorkflow((prev) => ({
        ...prev,
        stages: prev.stages.map((stage) =>
          stage.id === stageId
            ? { ...stage, nodes: [...stage.nodes, newNode] }
            : stage
        ),
      }));
      addLog("success", `Added function: ${template.name}`);
    }
  };

  const handleDeleteAgent = (nodeId: string) => {
    const node = workflow.stages.flatMap(s => s.nodes).find(n => n.id === nodeId);
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.filter((n) => n.id !== nodeId),
      })),
      connections: prev.connections.filter(
        (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
      ),
    }));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    addLog("warning", `Deleted ${node?.nodeType}: ${node?.name}`);
  };

  const handleDeleteStage = (stageId: string) => {
    const stage = workflow.stages.find(s => s.id === stageId);
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== stageId),
    }));
    addLog("warning", `Deleted stage: ${stage?.name}`);
  };

  const handleRenameStage = (stageId: string, name: string) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((s) =>
        s.id === stageId ? { ...s, name } : s
      ),
    }));
  };

  const handleReorderStages = (fromIndex: number, toIndex: number) => {
    setWorkflow((prev) => {
      const newStages = [...prev.stages];
      const [moved] = newStages.splice(fromIndex, 1);
      newStages.splice(toIndex, 0, moved);
      return { ...prev, stages: newStages };
    });
  };

  const handleToggleMinimize = (nodeId: string) => {
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

  const handleStartConnection = (nodeId: string | null, outputPort?: string) => {
    setConnectingFrom(nodeId);
  };

  const handleCompleteConnection = (fromNodeId: string, toNodeId: string, fromOutputPort?: string) => {
    const connection: Connection = {
      id: `conn-${Date.now()}`,
      fromNodeId,
      toNodeId,
      fromOutputPort,
    };
    setWorkflow((prev) => ({
      ...prev,
      connections: [...prev.connections, connection],
    }));
    setConnectingFrom(null);
    addLog("success", "Connected nodes");
  };

  const handleDeleteConnection = (connectionId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId),
    }));
    addLog("warning", "Deleted connection");
  };

  const handleUpdateAgent = (agentId: string, updates: Partial<AgentNode>) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) =>
          node.id === agentId ? { ...node, ...updates } : node
        ),
      })),
    }));
  };

  const handleUpdateNode = (nodeId: string, updates: any) => {
    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => ({
        ...stage,
        nodes: stage.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node
        ),
      })),
    }));
  };

  const handleSave = () => {
    const json = JSON.stringify({ workflow, workflowName, customAgents, userInput }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName || 'workflow'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Workflow saved successfully");
    addLog("success", "Workflow saved");
  };

  const handleLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.workflow) {
          setWorkflow(data.workflow);
          setWorkflowName(data.workflowName || "");
          setCustomAgents(data.customAgents || []);
          setUserInput(data.userInput || "");
          toast.success("Workflow loaded successfully");
          addLog("success", "Workflow loaded");
        }
      } catch (error) {
        toast.error("Failed to load workflow");
        addLog("error", "Failed to load workflow");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm("Clear the entire workflow?")) {
      setWorkflow({ stages: [], connections: [] });
      setSelectedNode(null);
      setConnectingFrom(null);
      setWorkflowName("");
      setUserInput("");
      setLogs([]);
      toast.success("Workflow cleared");
    }
  };

  const handleRun = () => {
    addLog("running", "Starting workflow execution...");
    toast.info("Workflow execution coming soon!");
    setTimeout(() => {
      addLog("info", "Workflow execution complete");
    }, 1000);
  };

  const handleRunAgent = (agentId: string, customInput?: string) => {
    const node = workflow.stages.flatMap(s => s.nodes).find(n => n.id === agentId);
    addLog("running", `Running ${node?.name}...`);
    toast.info(`Running ${node?.name}...`);
  };

  const handleRunFunction = (functionId: string, customInput?: string) => {
    const node = workflow.stages.flatMap(s => s.nodes).find(n => n.id === functionId);
    addLog("running", `Executing ${node?.name}...`);
    toast.info(`Executing ${node?.name}...`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <Toolbar
        onAddStage={addStage}
        onSave={handleSave}
        onLoad={handleLoad}
        onClear={handleClear}
        onRun={handleRun}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResponsiveLayout
          sidebar={
            <Sidebar
              onAddAgent={handleAddAgent}
              onAddNode={handleAddNode}
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
              onAddAgent={handleAddAgent}
              onAddNode={handleAddNode}
              onDeleteAgent={handleDeleteAgent}
              onDeleteStage={handleDeleteStage}
              onRenameStage={handleRenameStage}
              onReorderStages={handleReorderStages}
              onToggleMinimize={handleToggleMinimize}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDeleteConnection={handleDeleteConnection}
            />
          }
          desktopCanvas={
            <WorkflowCanvas
              workflow={workflow}
              selectedNode={selectedNode}
              connectingFrom={connectingFrom}
              layoutId="desktop"
              onSelectNode={setSelectedNode}
              onAddAgent={handleAddAgent}
              onAddNode={handleAddNode}
              onDeleteAgent={handleDeleteAgent}
              onDeleteStage={handleDeleteStage}
              onRenameStage={handleRenameStage}
              onReorderStages={handleReorderStages}
              onToggleMinimize={handleToggleMinimize}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDeleteConnection={handleDeleteConnection}
            />
          }
          properties={
            <PropertiesPanel
              selectedAgent={selectedAgent}
              selectedNode={selectedNodeData}
              onUpdateAgent={handleUpdateAgent}
              onUpdateNode={handleUpdateNode}
              onAddToolInstance={() => {}}
              onUpdateToolInstance={() => {}}
              onRemoveToolInstance={() => {}}
              onDeselectAgent={() => setSelectedNode(null)}
              onRunAgent={handleRunAgent}
              onRunFunction={handleRunFunction}
            />
          }
          onAddStage={addStage}
          onRun={handleRun}
          onSave={handleSave}
          onLoad={handleLoad}
          onClear={handleClear}
          hasSelectedAgent={selectedNode !== null}
        />
        
        <OutputLog logs={logs} />
      </div>
    </div>
  );
};

export default Stage;