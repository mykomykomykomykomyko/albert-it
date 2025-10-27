import { ChatHeader } from "@/components/ChatHeader";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Plus, Play, Save, Upload, Trash2, Store, Sparkles, Zap, Database, X } from "lucide-react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { CustomNode, CustomNodeData } from "@/components/canvas/CustomNode";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const Canvas = () => {
  const navigate = useNavigate();
  const { agents: savedAgents } = useAgents();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [globalInput, setGlobalInput] = useState("");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [editingNode, setEditingNode] = useState<{
    systemPrompt: string;
    userPrompt: string;
    config: Record<string, any>;
  } | null>(null);

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

  useEffect(() => {
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode.id);
      if (node && node.data) {
        const data = node.data;
        setEditingNode({
          systemPrompt: (data as any).systemPrompt || '',
          userPrompt: (data as any).userPrompt || '',
          config: (data as any).config || {},
        });
      }
    } else {
      setEditingNode(null);
    }
  }, [selectedNode, nodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const addNode = (type: 'agent' | 'function' | 'trigger', template: any) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'custom',
      position: { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: {
        label: template.name,
        nodeType: type,
        status: 'idle',
        description: template.description,
        systemPrompt: template.systemPrompt || '',
        userPrompt: '',
        config: {},
        onEdit: () => {
          const node = nodes.find(n => n.id === id);
          if (node) setSelectedNode(node);
        },
        onRun: () => handleRunNode(id),
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${template.name} added`);
  };

  const handleRunNode = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Update node status to running
    setNodes(nds => nds.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, status: 'running' } }
        : n
    ));

    try {
      const nodeData = node.data as any;
      
      if (nodeData.nodeType === 'agent') {
        // Get input from connected nodes or global input
        const incomingEdges = edges.filter(e => e.target === nodeId);
        let input = globalInput;
        
        if (incomingEdges.length > 0) {
          const sourceNode = nodes.find(n => n.id === incomingEdges[0].source);
          if (sourceNode && (sourceNode.data as any).output) {
            input = (sourceNode.data as any).output;
          }
        }

        const { data, error } = await supabase.functions.invoke('run-agent', {
          body: {
            systemPrompt: nodeData.systemPrompt || '',
            userPrompt: nodeData.userPrompt || input,
            tools: []
          }
        });

        if (error) throw error;
        
        // Update node with output and success status
        setNodes(nds => nds.map(n => 
          n.id === nodeId 
            ? { ...n, data: { ...n.data, status: 'success', output: data.output } }
            : n
        ));
        
        toast.success(`${nodeData.label} completed`);
      }
    } catch (error) {
      console.error('Node execution error:', error);
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'error' } }
          : n
      ));
      toast.error(`Node execution failed`);
    }
  };

  const handleRunWorkflow = async () => {
    toast.success("Executing workflow...");
    
    try {
      // Sort nodes by position (top to bottom)
      const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);

      for (const node of sortedNodes) {
        const nodeData = node.data;
        if (nodeData && nodeData.nodeType !== 'trigger') {
          await handleRunNode(node.id);
          // Wait a bit between nodes
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast.success("Workflow complete");
    } catch (error) {
      console.error('Workflow error:', error);
      toast.error("Workflow failed");
    }
  };

  const updateNodeData = (updates: Partial<CustomNodeData>) => {
    if (!selectedNode) return;
    
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        const currentData = n.data;
        return {
          ...n,
          data: {
            ...currentData,
            ...updates,
            onEdit: currentData?.onEdit,
            onRun: currentData?.onRun,
          }
        };
      }
      return n;
    }));
  };

  const handleSave = () => {
    const workflow = { 
      name: workflowName,
      nodes, 
      edges,
      globalInput 
    };
    localStorage.setItem('canvas-workflow', JSON.stringify(workflow));
    toast.success("Workflow saved");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('canvas-workflow');
    if (saved) {
      const workflow = JSON.parse(saved);
      setWorkflowName(workflow.name || "Untitled Workflow");
      
      // Restore nodes with callbacks
      const restoredNodes = (workflow.nodes || []).map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: () => setSelectedNode(node),
          onRun: () => handleRunNode(node.id),
        }
      }));
      
      setNodes(restoredNodes);
      setEdges(workflow.edges || []);
      setGlobalInput(workflow.globalInput || "");
      toast.success("Workflow loaded");
    } else {
      toast.error("No saved workflow");
    }
  };

  const handleClear = () => {
    if (confirm("Clear canvas?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setGlobalInput("");
      setWorkflowName("Untitled Workflow");
      toast.success("Canvas cleared");
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      {/* Toolbar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-44 h-8 text-sm"
            placeholder="Workflow name"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={handleLoad}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Load
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/workflow-marketplace')}>
            <Store className="h-3.5 w-3.5 mr-1.5" />
            Marketplace
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          onClick={handleRunWorkflow}
        >
          <Play className="h-3.5 w-3.5" />
          Run Workflow
        </Button>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node Library */}
        <Card className="w-64 m-3 flex flex-col border-2">
          <div className="p-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Node Library</h3>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              <Accordion type="single" collapsible defaultValue="agents" className="w-full">
                <AccordionItem value="triggers">
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Triggers
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => addNode('trigger', { name: 'Manual Trigger', description: 'Start workflow manually' })}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Manual Trigger
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => addNode('trigger', { name: 'Webhook', description: 'Trigger via webhook' })}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Webhook
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="agents">
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Agents
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-1">
                    {savedAgents.slice(0, 6).map((agent) => (
                      <Button
                        key={agent.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() => addNode('agent', { 
                          name: agent.name, 
                          description: agent.description || 'AI Agent',
                          systemPrompt: agent.system_prompt 
                        })}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        {agent.name}
                      </Button>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="functions">
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Functions
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => addNode('function', { name: 'Transform', description: 'Transform data' })}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Transform Data
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => addNode('function', { name: 'Filter', description: 'Filter results' })}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Filter
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => addNode('function', { name: 'Merge', description: 'Merge data' })}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Merge Data
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-4 pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Global Input</Label>
                <Textarea
                  value={globalInput}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  placeholder="Enter workflow input..."
                  className="min-h-[80px] text-xs"
                />
              </div>
            </div>
          </ScrollArea>
        </Card>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              className="bg-background"
            />
            <Controls className="bg-card border border-border rounded-lg" />
            <MiniMap 
              className="bg-card border border-border rounded-lg"
              nodeColor={(node) => {
                const data = node.data as CustomNodeData;
                return data.nodeType === 'agent' 
                  ? 'hsl(var(--primary))' 
                  : data.nodeType === 'function'
                  ? 'hsl(var(--accent))'
                  : 'hsl(var(--secondary))';
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Properties Panel */}
        {selectedNode && (
          <Card className="w-80 m-3 flex flex-col border-2">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Node Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs">Node Name</Label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData({ label: e.target.value })}
                    className="mt-1.5 h-8 text-sm"
                  />
                </div>

                {selectedNode.data.nodeType === 'agent' && editingNode && (
                  <>
                    <div>
                      <Label className="text-xs">System Prompt</Label>
                      <Textarea
                        value={editingNode.systemPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, systemPrompt: e.target.value });
                          updateNodeData({ systemPrompt: e.target.value } as any);
                        }}
                        placeholder="System instructions..."
                        className="mt-1.5 min-h-[100px] text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">User Prompt</Label>
                      <Textarea
                        value={editingNode.userPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, userPrompt: e.target.value });
                          updateNodeData({ userPrompt: e.target.value } as any);
                        }}
                        placeholder="User message or use connected input..."
                        className="mt-1.5 min-h-[100px] text-xs"
                      />
                    </div>
                  </>
                )}

                {selectedNode.data.output && (
                  <div>
                    <Label className="text-xs">Output</Label>
                    <div className="mt-1.5 p-3 bg-muted rounded-md text-xs max-h-[200px] overflow-y-auto font-mono">
                      {selectedNode.data.output}
                    </div>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => handleRunNode(selectedNode.id)}
                    disabled={selectedNode.data.status === 'running'}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Test Node
                  </Button>
                  
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
                </div>
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Canvas;
