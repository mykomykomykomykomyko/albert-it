import { ChatHeader } from "@/components/ChatHeader";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toolbar } from "@/components/workflow/stage/Toolbar";
import { ResponsiveLayout } from "@/components/workflow/stage/ResponsiveLayout";
import { WorkflowCanvas } from "@/components/workflow/stage/WorkflowCanvas";
import { Sidebar } from "@/components/workflow/stage/Sidebar";
import { PropertiesPanel } from "@/components/workflow/stage/PropertiesPanel";
import { OutputLog, LogEntry } from "@/components/workflow/stage/OutputLog";
import { SaveWorkflowDialog } from "@/components/workflow/SaveWorkflowDialog";
import { LoadWorkflowDialog } from "@/components/workflow/LoadWorkflowDialog";
import type { Workflow, Stage as StageType, AgentNode, FunctionNode, Connection } from "@/types/workflow";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const Stage = () => {
  const navigate = useNavigate();
  const { agents: savedAgents } = useAgents();
  
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
    // Check auth and listen for changes
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
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
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-open properties panel when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setPropertiesPanelOpen(true);
    }
  }, [selectedNode]);

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

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const handleSave = () => {
    setSaveDialogOpen(true);
  };

  const handleLoad = (data: any) => {
    if (data.workflow) {
      setWorkflow(data.workflow);
      setWorkflowName(data.workflowName || "");
      setCustomAgents(data.customAgents || []);
      setUserInput(data.userInput || "");
      addLog("success", "Workflow loaded");
    }
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

  // Helper to get input for a node based on connections
  const getNodeInput = (nodeId: string): string => {
    // Find incoming connections to this node
    const incomingConnections = workflow.connections.filter(c => c.toNodeId === nodeId);
    
    if (incomingConnections.length === 0) {
      // No incoming connections, use the global user input
      return userInput;
    }
    
    // Get outputs from connected nodes
    const inputs: string[] = [];
    for (const conn of incomingConnections) {
      const sourceNode = workflow.stages
        .flatMap(s => s.nodes)
        .find(n => n.id === conn.fromNodeId);
      
      if (sourceNode?.output) {
        inputs.push(sourceNode.output);
      }
    }
    
    // Join multiple inputs with newlines
    return inputs.join('\n\n');
  };

  // Helper to substitute variables in prompts
  const substituteVariables = (text: string, nodeId: string): string => {
    if (!text) return text;
    
    let result = text;
    
    // Always replace {prompt} with the global prompt
    result = result.replace(/\{prompt\}/g, userInput);
    
    // Replace {input} with the node's input
    const nodeInput = getNodeInput(nodeId);
    result = result.replace(/\{input\}/g, nodeInput);
    
    return result;
  };

  const handleRun = async () => {
    addLog("running", "Starting workflow execution...");
    
    try {
      // Execute stages in sequence
      for (const stage of workflow.stages) {
        addLog("info", `Executing stage: ${stage.name}`);
        
        // Execute nodes in parallel within each stage
        await Promise.all(stage.nodes.map(async (node) => {
          if (node.nodeType === 'agent') {
            await handleRunAgent(node.id);
          } else if (node.nodeType === 'function') {
            await handleRunFunction(node.id);
          }
        }));
      }
      
      addLog("success", "Workflow execution complete");
      toast.success("Workflow execution complete");
    } catch (error) {
      console.error('Workflow execution error:', error);
      addLog("error", `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Workflow execution failed");
    }
  };

  const handleRunAgent = async (agentId: string, customInput?: string) => {
    const node = workflow.stages.flatMap(s => s.nodes).find(n => n.id === agentId);
    if (!node || node.nodeType !== 'agent') return;

    handleUpdateNode(agentId, { status: 'running' });
    addLog("running", `Running ${node.name}...`);
    
    try {
      const agentNode = node as any;
      
      // Substitute variables in prompts
      const processedSystemPrompt = substituteVariables(agentNode.systemPrompt || '', agentId);
      const processedUserPrompt = customInput || substituteVariables(agentNode.userPrompt || '', agentId);
      
      const { data, error } = await supabase.functions.invoke('run-agent', {
        body: {
          systemPrompt: processedSystemPrompt,
          userPrompt: processedUserPrompt,
          tools: agentNode.tools || []
        }
      });

      if (error) throw error;
      
      handleUpdateNode(agentId, { 
        status: 'complete',
        output: data.output 
      });
      addLog("success", `${node.name} completed`);
    } catch (error) {
      console.error('Agent execution error:', error);
      handleUpdateNode(agentId, { status: 'error' });
      addLog("error", `${node.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRunFunction = async (functionId: string, customInput?: string) => {
    const node = workflow.stages.flatMap(s => s.nodes).find(n => n.id === functionId);
    if (!node || node.nodeType !== 'function') return;

    handleUpdateNode(functionId, { status: 'running' });
    addLog("running", `Executing ${node.name}...`);
    
    try {
      const functionNode = node as any;
      const { FunctionExecutor } = await import('@/lib/functionExecutor');
      
      // Get input for this function (either custom or from connections)
      const functionInput = customInput || getNodeInput(functionId);
      
      const result = await FunctionExecutor.execute(functionNode, functionInput);
      
      if (result.success) {
        handleUpdateNode(functionId, { 
          status: 'complete',
          output: JSON.stringify(result.outputs)
        });
        addLog("success", `${node.name} completed`);
      } else {
        throw new Error(result.error || 'Function execution failed');
      }
    } catch (error) {
      console.error('Function execution error:', error);
      handleUpdateNode(functionId, { status: 'error' });
      addLog("error", `${node.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <Toolbar
        onAddStage={addStage}
        onSave={handleSave}
        onLoad={() => setLoadDialogOpen(true)}
        onClear={handleClear}
      />
      
      <SaveWorkflowDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        workflowData={{ workflow, workflowName, customAgents, userInput }}
        currentName={workflowName}
      />
      
      <LoadWorkflowDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        onLoad={handleLoad}
      />
      
      {/* Floating Run Button */}
      <Button
        onClick={handleRun}
        className="fixed right-6 top-20 z-50 gap-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 shadow-lg"
        size="lg"
      >
        <Play className="h-5 w-5" />
        <span className="hidden lg:inline">Run Workflow</span>
        <span className="lg:hidden">Run</span>
      </Button>
      
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
              savedAgents={savedAgents}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
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
              onClosePanel={() => setPropertiesPanelOpen(false)}
            />
          }
          propertiesPanelOpen={propertiesPanelOpen}
          sidebarCollapsed={sidebarCollapsed}
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