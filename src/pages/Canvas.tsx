import { ChatHeader } from "@/components/ChatHeader";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Play, Save, Upload, Trash2, Settings, Store } from "lucide-react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start' },
    position: { x: 250, y: 50 },
  },
];

const initialEdges: Edge[] = [];

interface CustomNodeData {
  label: string;
  nodeType: string;
  agentType?: string;
  systemPrompt?: string;
  userPrompt?: string;
  config?: Record<string, any>;
}

const Canvas = () => {
  const navigate = useNavigate();
  const { agents: savedAgents } = useAgents();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [globalInput, setGlobalInput] = useState("");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addAgentNode = (agentType: string) => {
    const agent = savedAgents.find(a => a.id === agentType);
    if (!agent) return;

    const newNode: Node<CustomNodeData> = {
      id: `agent-${nodes.length + 1}`,
      type: 'default',
      data: { 
        label: agent.name,
        nodeType: 'agent',
        agentType: agent.id,
        systemPrompt: agent.system_prompt || '',
        userPrompt: '',
      },
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      style: {
        background: 'hsl(var(--primary))',
        color: 'white',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '180px',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${agent.name} added to canvas`);
  };

  const addFunctionNode = (functionType: string) => {
    const functionNames: Record<string, string> = {
      'transform': 'Data Transform',
      'filter': 'Filter',
      'merge': 'Merge',
      'split': 'Split',
    };

    const newNode: Node<CustomNodeData> = {
      id: `function-${nodes.length + 1}`,
      type: 'default',
      data: { 
        label: functionNames[functionType] || functionType,
        nodeType: 'function',
        config: {},
      },
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      style: {
        background: 'hsl(var(--accent))',
        color: 'hsl(var(--accent-foreground))',
        border: '2px solid hsl(var(--accent))',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${functionNames[functionType]} added to canvas`);
  };

  const handleRun = async () => {
    toast.success("Executing workflow...");
    
    try {
      // Sort nodes by their position (simple execution order based on Y position)
      const sortedNodeIds = [...nodes]
        .sort((a, b) => a.position.y - b.position.y)
        .map(n => n.id);

      for (const nodeId of sortedNodeIds) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type === 'input') continue;

        const nodeData = node.data as CustomNodeData;
        
        if (nodeData.nodeType === 'agent') {
          // Get input from connected nodes
          const inputEdges = edges.filter(e => e.target === nodeId);
          let input = globalInput;
          
          if (inputEdges.length > 0) {
            const sourceNode = nodes.find(n => n.id === inputEdges[0].source);
            if (sourceNode && (sourceNode.data as any).output) {
              input = (sourceNode.data as any).output;
            }
          }

          // Execute agent
          const { data, error } = await supabase.functions.invoke('run-agent', {
            body: {
              systemPrompt: nodeData.systemPrompt || '',
              userPrompt: nodeData.userPrompt || input,
              tools: []
            }
          });

          if (error) throw error;
          
          // Store output in node data
          setNodes(nds => nds.map(n => 
            n.id === nodeId 
              ? { ...n, data: { ...n.data, output: data.output } }
              : n
          ));
          
          toast.success(`${nodeData.label} completed`);
        }
      }
      
      toast.success("Workflow execution complete");
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast.error("Workflow execution failed");
    }
  };

  const handleSave = () => {
    const workflow = { 
      name: workflowName,
      nodes, 
      edges,
      globalInput 
    };
    localStorage.setItem('canvas-workflow', JSON.stringify(workflow));
    toast.success("Workflow saved!");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('canvas-workflow');
    if (saved) {
      const workflow = JSON.parse(saved);
      setWorkflowName(workflow.name || "Untitled Workflow");
      setNodes(workflow.nodes || initialNodes);
      setEdges(workflow.edges || initialEdges);
      setGlobalInput(workflow.globalInput || "");
      toast.success("Workflow loaded!");
    } else {
      toast.error("No saved workflow found");
    }
  };

  const handleClear = () => {
    if (confirm("Clear the entire canvas?")) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setSelectedNode(null);
      setGlobalInput("");
      setWorkflowName("Untitled Workflow");
      toast.success("Canvas cleared!");
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateSelectedNodeData = (updates: Partial<CustomNodeData>) => {
    if (!selectedNode) return;
    
    setNodes(nds => nds.map(n => 
      n.id === selectedNode.id 
        ? { ...n, data: { ...n.data, ...updates } }
        : n
    ));
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, ...updates } } : null);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      {/* Toolbar */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-48 h-9"
            placeholder="Workflow name"
          />
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={handleLoad}>
            <Upload className="h-4 w-4 mr-2" />
            Load
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/workflow-marketplace')}>
            <Store className="h-4 w-4 mr-2" />
            Marketplace
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-primary-hover"
          onClick={handleRun}
        >
          <Play className="h-4 w-4" />
          Run Workflow
        </Button>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Card className="w-72 m-4 flex flex-col gap-4 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">GLOBAL INPUT</h3>
            <Textarea
              value={globalInput}
              onChange={(e) => setGlobalInput(e.target.value)}
              placeholder="Enter global workflow input..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">ADD AGENTS</h3>
              <div className="space-y-2">
                {savedAgents.slice(0, 5).map((agent) => (
                  <Button
                    key={agent.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => addAgentNode(agent.id)}
                  >
                    <div className="w-3 h-3 rounded bg-primary" />
                    {agent.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">ADD FUNCTIONS</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => addFunctionNode('transform')}
                >
                  <div className="w-3 h-3 rounded bg-accent" />
                  Data Transform
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => addFunctionNode('filter')}
                >
                  <div className="w-3 h-3 rounded bg-accent" />
                  Filter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => addFunctionNode('merge')}
                >
                  <div className="w-3 h-3 rounded bg-accent" />
                  Merge
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Canvas */}
        <div className="flex-1 flex gap-4 p-4">
          <div className="flex-1 relative bg-card rounded-lg border">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  const data = node.data as CustomNodeData;
                  return data.nodeType === 'agent' ? 'hsl(var(--primary))' : 'hsl(var(--accent))';
                }}
              />
            </ReactFlow>
          </div>

          {/* Properties Panel */}
          {selectedNode && (selectedNode.data as CustomNodeData).nodeType === 'agent' && (
            <Card className="w-80 p-4 space-y-4 overflow-y-auto">
              <div>
                <h3 className="font-semibold mb-2">Node Properties</h3>
                <p className="text-sm text-muted-foreground">{(selectedNode.data as CustomNodeData).label}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">System Prompt</label>
                <Textarea
                  value={(selectedNode.data as CustomNodeData).systemPrompt || ''}
                  onChange={(e) => updateSelectedNodeData({ systemPrompt: e.target.value })}
                  placeholder="System prompt for this agent..."
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">User Prompt</label>
                <Textarea
                  value={(selectedNode.data as CustomNodeData).userPrompt || ''}
                  onChange={(e) => updateSelectedNodeData({ userPrompt: e.target.value })}
                  placeholder="User prompt (or use connected input)..."
                  className="min-h-[120px]"
                />
              </div>

              {(selectedNode.data as any).output && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Output</label>
                  <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto">
                    {(selectedNode.data as any).output}
                  </div>
                </div>
              )}

              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                  setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNode(null);
                  toast.success("Node deleted");
                }}
              >
                Delete Node
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
