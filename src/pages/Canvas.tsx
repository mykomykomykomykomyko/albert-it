import { ChatHeader } from "@/components/ChatHeader";
import { useEffect, useState, useCallback } from "react";
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Play, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start' },
    position: { x: 250, y: 50 },
  },
];

const initialEdges: Edge[] = [];

const nodeTypes = [
  { type: 'trigger', label: 'Trigger', color: 'bg-blue-500' },
  { type: 'action', label: 'Action', color: 'bg-green-500' },
  { type: 'logic', label: 'Logic', color: 'bg-purple-500' },
  { type: 'data', label: 'Data', color: 'bg-orange-500' },
];

const Canvas = () => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: 'default',
      data: { label: `${label} ${nodes.length}` },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      style: {
        background: type === 'trigger' ? '#3b82f6' : 
                   type === 'action' ? '#10b981' : 
                   type === 'logic' ? '#a855f7' : '#f97316',
        color: 'white',
        border: '1px solid #222',
        borderRadius: '8px',
        padding: '10px',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${label} node added`);
  };

  const handleRun = () => {
    toast.success("Workflow execution started!");
  };

  const handleSave = () => {
    const workflow = { nodes, edges };
    localStorage.setItem('canvas-workflow', JSON.stringify(workflow));
    toast.success("Workflow saved!");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('canvas-workflow');
    if (saved) {
      const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
      setNodes(savedNodes);
      setEdges(savedEdges);
      toast.success("Workflow loaded!");
    } else {
      toast.error("No saved workflow found");
    }
  };

  const handleClear = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    toast.success("Canvas cleared!");
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Card className="w-64 m-4 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">NODES</h3>
            <div className="space-y-2">
              {nodeTypes.map((node) => (
                <Button
                  key={node.type}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => addNode(node.type, node.label)}
                >
                  <div className={`w-3 h-3 rounded ${node.color}`} />
                  {node.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedNode && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">PROPERTIES</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span> {selectedNode.id}
                </div>
                <div>
                  <span className="text-muted-foreground">Label:</span> {selectedNode.data.label}
                </div>
              </div>
            </div>
          )}
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
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleLoad}>
                <Upload className="h-4 w-4 mr-2" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button size="sm" onClick={handleRun} className="bg-gradient-to-r from-primary to-primary-hover">
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
