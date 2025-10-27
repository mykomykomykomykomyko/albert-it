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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Play, Save, Upload, Trash2, Store, Sparkles, X, Loader2, FileInput, FileOutput, GitMerge, Repeat, Download, Layout, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
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

// Template definitions
const TEMPLATES = {
  'simple-chat': {
    name: 'Simple AI Chat',
    description: 'Basic input → agent → output flow',
    category: 'basics',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'User Input', nodeType: 'input', inputType: 'text', userPrompt: 'Hello, how are you?', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'AI Assistant', nodeType: 'agent', systemPrompt: 'You are a helpful assistant.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Response', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'text-processing': {
    name: 'Text Processor',
    description: 'Transform text with operations',
    category: 'productivity',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Text Input', nodeType: 'input', inputType: 'text', userPrompt: 'HELLO WORLD', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'Lowercase', nodeType: 'transform', config: { operation: 'lowercase' }, status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Result', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'multi-agent': {
    name: 'Multi-Agent Pipeline',
    description: 'Chain multiple AI agents',
    category: 'ai-workflows',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Question', nodeType: 'input', inputType: 'text', userPrompt: 'What is AI?', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 350, y: 150 }, data: { label: 'Researcher', nodeType: 'agent', systemPrompt: 'Research and gather facts.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 350, y: 250 }, data: { label: 'Writer', nodeType: 'agent', systemPrompt: 'Write clearly and concisely.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 600, y: 200 }, data: { label: 'Combine', nodeType: 'join', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 850, y: 200 }, data: { label: 'Final Output', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'data-analysis': {
    name: 'Data Analysis',
    description: 'Analyze and process data',
    category: 'analytics',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Raw Data', nodeType: 'input', inputType: 'text', userPrompt: 'Sales: 100, 200, 150, 300', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'Analyzer', nodeType: 'agent', systemPrompt: 'Analyze the data and provide insights.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 150 }, data: { label: 'Summary', nodeType: 'output', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 700, y: 250 }, data: { label: 'Insights', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'content-summarizer': {
    name: 'Content Summarizer',
    description: 'Summarize long text into key points',
    category: 'productivity',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Long Content', nodeType: 'input', inputType: 'text', userPrompt: 'Enter long article or document', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'Summarizer', nodeType: 'agent', systemPrompt: 'Summarize the following text into key bullet points. Be concise and focus on main ideas.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Summary', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'sentiment-analysis': {
    name: 'Sentiment Analyzer',
    description: 'Analyze sentiment and emotions in text',
    category: 'analytics',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Customer Feedback', nodeType: 'input', inputType: 'text', userPrompt: 'The product is amazing! I love it.', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'Sentiment Analyzer', nodeType: 'agent', systemPrompt: 'Analyze the sentiment and emotions in the text. Provide: 1) Overall sentiment (positive/negative/neutral), 2) Emotion detected, 3) Confidence score.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Analysis', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'code-reviewer': {
    name: 'Code Review Assistant',
    description: 'Review code for bugs and improvements',
    category: 'developer-tools',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Code Input', nodeType: 'input', inputType: 'text', userPrompt: 'function add(a,b) { return a+b }', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 150 }, data: { label: 'Bug Checker', nodeType: 'agent', systemPrompt: 'Review code for bugs, errors, and security issues.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 400, y: 250 }, data: { label: 'Improvement Suggester', nodeType: 'agent', systemPrompt: 'Suggest improvements for code quality, performance, and readability.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Combine Reviews', nodeType: 'join', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 950, y: 200 }, data: { label: 'Final Review', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'email-composer': {
    name: 'Professional Email Writer',
    description: 'Draft professional emails from bullet points',
    category: 'productivity',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Key Points', nodeType: 'input', inputType: 'text', userPrompt: '- Meeting tomorrow\n- Need to discuss budget\n- Send report', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'Email Composer', nodeType: 'agent', systemPrompt: 'Write a professional email based on the key points provided. Use proper formatting and tone.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'Draft Email', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'translation-chain': {
    name: 'Multi-Language Translator',
    description: 'Translate text to multiple languages',
    category: 'productivity',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'English Text', nodeType: 'input', inputType: 'text', userPrompt: 'Hello, how are you?', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'To Spanish', nodeType: 'agent', systemPrompt: 'Translate the text to Spanish.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'To French', nodeType: 'agent', systemPrompt: 'Translate the text to French.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'To German', nodeType: 'agent', systemPrompt: 'Translate the text to German.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 700, y: 100 }, data: { label: 'Spanish', nodeType: 'output', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'French', nodeType: 'output', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 700, y: 300 }, data: { label: 'German', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-6', source: '3', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-7', source: '4', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
  'social-media-manager': {
    name: 'Social Media Post Generator',
    description: 'Create posts for multiple platforms',
    category: 'marketing',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 200 }, data: { label: 'Topic/Idea', nodeType: 'input', inputType: 'text', userPrompt: 'New product launch announcement', status: 'idle' } },
      { id: '2', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'Twitter Post', nodeType: 'agent', systemPrompt: 'Create a short, engaging Twitter post (280 chars max) with relevant hashtags.', status: 'idle' } },
      { id: '3', type: 'custom', position: { x: 400, y: 200 }, data: { label: 'LinkedIn Post', nodeType: 'agent', systemPrompt: 'Create a professional LinkedIn post with detailed information and business tone.', status: 'idle' } },
      { id: '4', type: 'custom', position: { x: 400, y: 300 }, data: { label: 'Instagram Caption', nodeType: 'agent', systemPrompt: 'Create an Instagram caption with emojis and relevant hashtags.', status: 'idle' } },
      { id: '5', type: 'custom', position: { x: 700, y: 100 }, data: { label: 'Twitter', nodeType: 'output', status: 'idle' } },
      { id: '6', type: 'custom', position: { x: 700, y: 200 }, data: { label: 'LinkedIn', nodeType: 'output', status: 'idle' } },
      { id: '7', type: 'custom', position: { x: 700, y: 300 }, data: { label: 'Instagram', nodeType: 'output', status: 'idle' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e3-6', source: '3', target: '6', animated: true, style: { stroke: 'hsl(var(--primary))' } },
      { id: 'e4-7', source: '4', target: '7', animated: true, style: { stroke: 'hsl(var(--primary))' } },
    ],
  },
};

const Canvas = () => {
  const navigate = useNavigate();
  const { agents: savedAgents } = useAgents();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [globalInput, setGlobalInput] = useState("");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
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

  const addNode = (type: 'input' | 'agent' | 'output' | 'join' | 'transform', template: any) => {
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
        files: [],
        config: template.config || {},
        onEdit: () => {
          setSelectedNode(newNode);
          setIsRightSidebarOpen(true);
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

    setNodes(nds => nds.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, status: 'running' } }
        : n
    ));

    try {
      const nodeData = node.data as any;
      const incomingEdges = edges.filter(e => e.target === nodeId);
      let input = globalInput;
      
      if (incomingEdges.length > 0) {
        const sourceNode = nodes.find(n => n.id === incomingEdges[0].source);
        if (sourceNode && (sourceNode.data as any).output) {
          input = (sourceNode.data as any).output;
        }
      }
      
      let output = '';
      
      switch (nodeData.nodeType) {
        case 'input':
          output = nodeData.userPrompt || globalInput || 'No input provided';
          break;
          
        case 'agent':
          const { data, error } = await supabase.functions.invoke('run-agent', {
            body: {
              systemPrompt: nodeData.systemPrompt || '',
              userPrompt: input || nodeData.userPrompt || '',
              tools: []
            }
          });
          if (error) throw error;
          output = data.output;
          break;
          
        case 'transform':
          const operation = nodeData.config?.operation || 'lowercase';
          if (operation === 'lowercase') {
            output = input.toLowerCase();
          } else if (operation === 'uppercase') {
            output = input.toUpperCase();
          } else {
            output = input;
          }
          break;
          
        case 'join':
          const joinInputs = incomingEdges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            return (source?.data as any)?.output || '';
          }).filter(Boolean);
          output = joinInputs.join('\n\n---\n\n');
          break;
          
        case 'output':
          output = input;
          break;
          
        default:
          output = input;
      }
      
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'success', output } }
          : n
      ));
      
      toast.success(`${nodeData.label} completed`);
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
      // Build execution order based on dependencies
      const executed = new Set<string>();
      const executing = new Set<string>();
      
      const canExecute = (nodeId: string): boolean => {
        // Find all incoming edges to this node
        const incomingEdges = edges.filter(e => e.target === nodeId);
        // Node can execute if all source nodes have been executed
        return incomingEdges.every(edge => executed.has(edge.source));
      };
      
      const executeNode = async (nodeId: string) => {
        if (executed.has(nodeId) || executing.has(nodeId)) return;
        executing.add(nodeId);
        await handleRunNode(nodeId);
        executing.delete(nodeId);
        executed.add(nodeId);
      };
      
      // Keep executing until all nodes are done
      while (executed.size < nodes.length) {
        const readyNodes = nodes
          .filter(n => !executed.has(n.id) && !executing.has(n.id) && canExecute(n.id));
        
        if (readyNodes.length === 0) {
          // No more nodes can execute - check if we're done or stuck
          if (executed.size < nodes.length) {
            throw new Error("Workflow has circular dependencies or disconnected nodes");
          }
          break;
        }
        
        // Execute all ready nodes in parallel
        await Promise.all(readyNodes.map(node => executeNode(node.id)));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success("Workflow complete");
    } catch (error) {
      console.error('Workflow error:', error);
      toast.error(error instanceof Error ? error.message : "Workflow failed");
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
          onEdit: () => {
            setSelectedNode(node);
            setIsRightSidebarOpen(true);
          },
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

  const loadTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (template) {
      const restoredNodes = template.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: () => {
            setSelectedNode(node as Node);
            setIsRightSidebarOpen(true);
          },
          onRun: () => handleRunNode(node.id),
        }
      }));
      setNodes(restoredNodes);
      setEdges(template.edges);
      setIsTemplatesOpen(false);
      setWorkflowName(template.name);
      toast.success(`Template "${template.name}" loaded`);
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsRightSidebarOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      {/* Toolbar */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-52 h-9 font-medium"
            placeholder="Untitled Workflow"
          />
          <div className="w-px h-7 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={() => setIsTemplatesOpen(true)}>
            <Layout className="h-4 w-4 mr-2" />
            Templates
          </Button>
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
          size="default"
          className="gap-2"
          onClick={handleRunWorkflow}
          disabled={nodes.length === 0}
        >
          <Play className="h-4 w-4" />
          Run Workflow
        </Button>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Node Library */}
        <div 
          className={`transition-all duration-300 ${isLeftSidebarOpen ? 'w-72' : 'w-0'} overflow-hidden`}
        >
          <Card className="h-full m-4 mr-0 flex flex-col shadow-md">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Add Nodes</h3>
                <p className="text-xs text-muted-foreground mt-1">Click to add to canvas</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsLeftSidebarOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <Accordion type="single" collapsible defaultValue="input" className="w-full">
                <AccordionItem value="input" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <FileInput className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Input Nodes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('input', { name: 'Text Input', description: 'Enter text data', config: { inputType: 'text' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Text Input</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('input', { name: 'File Input', description: 'Upload files', config: { inputType: 'file' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">File Input</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="agents" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">AI Agents</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    {savedAgents.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-3">No agents available. Create one first.</p>
                    ) : (
                      savedAgents.slice(0, 8).map((agent) => (
                        <Button
                          key={agent.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-9 hover:bg-muted"
                          onClick={() => addNode('agent', { 
                            name: agent.name, 
                            description: agent.description || 'AI Agent',
                            systemPrompt: agent.system_prompt 
                          })}
                        >
                          <Plus className="h-4 w-4 mr-2.5" />
                          <span className="text-sm truncate">{agent.name}</span>
                        </Button>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="processing" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <Repeat className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">Processing</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('transform', { name: 'Transform', description: 'Transform text data', config: { operation: 'lowercase' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Transform</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('join', { name: 'Join', description: 'Combine multiple inputs' })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Join</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="output" className="border-none">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <div className="flex items-center gap-2.5">
                      <FileOutput className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Output Nodes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pt-2 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('output', { name: 'Text Output', description: 'Display results', config: { format: 'text' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">Text Output</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 hover:bg-muted"
                      onClick={() => addNode('output', { name: 'JSON Output', description: 'Display as JSON', config: { format: 'json' } })}
                    >
                      <Plus className="h-4 w-4 mr-2.5" />
                      <span className="text-sm">JSON Output</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-5 pt-5 border-t">
                <Label className="text-sm font-medium mb-2.5 block">Global Input</Label>
                <Textarea
                  value={globalInput}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  placeholder="Enter initial workflow input (optional)..."
                  className="min-h-[100px] text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">This input will be available to all trigger nodes</p>
              </div>
            </div>
          </ScrollArea>
          </Card>
        </div>

        {/* Left Sidebar Toggle Button */}
        {!isLeftSidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            className="absolute left-4 top-4 z-10 shadow-md"
            onClick={() => setIsLeftSidebarOpen(true)}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Canvas */}
        <div className="flex-1 relative bg-muted/5">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center space-y-3 p-8 bg-card/80 backdrop-blur-sm rounded-lg border shadow-sm max-w-md">
                <Sparkles className="h-12 w-12 mx-auto text-primary/50" />
                <h3 className="text-lg font-semibold">Start Building Your Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Add nodes from the sidebar to create your automated workflow. Connect them to define the execution flow.
                </p>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={16} 
              size={1}
              className="bg-muted/10"
            />
            <Controls className="bg-card border shadow-md rounded-lg" />
            <MiniMap 
              className="bg-card border shadow-md rounded-lg"
              nodeColor={(node) => {
              const data = node.data as CustomNodeData;
                switch (data.nodeType) {
                  case 'input': return '#3b82f6';
                  case 'agent': return 'hsl(var(--primary))';
                  case 'output': return '#22c55e';
                  case 'join': return '#a855f7';
                  case 'transform': return '#f97316';
                  default: return 'hsl(var(--muted))';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar Toggle Button */}
        {!isRightSidebarOpen && selectedNode && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-4 z-10 shadow-md"
            onClick={() => setIsRightSidebarOpen(true)}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Right Sidebar - Properties Panel */}
        <div 
          className={`transition-all duration-300 ${selectedNode && isRightSidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}
        >
          {selectedNode && (
            <Card className="h-full m-4 ml-0 flex flex-col shadow-md">
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">Node Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure selected node</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsRightSidebarOpen(false)}
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Node Name</Label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData({ label: e.target.value })}
                    className="h-9"
                    placeholder="Enter node name"
                  />
                </div>

                {selectedNode.data.nodeType === 'input' && editingNode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Input Data</Label>
                    <Textarea
                      value={editingNode.userPrompt}
                      onChange={(e) => {
                        setEditingNode({ ...editingNode, userPrompt: e.target.value });
                        updateNodeData({ userPrompt: e.target.value } as any);
                      }}
                      placeholder="Enter your input data here..."
                      className="min-h-[150px] text-sm font-mono"
                    />
                    <p className="text-xs text-muted-foreground">This data will be passed to connected nodes</p>
                  </div>
                )}

                {selectedNode.data.nodeType === 'agent' && editingNode && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">System Prompt</Label>
                      <Textarea
                        value={editingNode.systemPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, systemPrompt: e.target.value });
                          updateNodeData({ systemPrompt: e.target.value } as any);
                        }}
                        placeholder="Define the AI agent's role and behavior..."
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Instructions for how the AI should behave</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">User Prompt (Optional)</Label>
                      <Textarea
                        value={editingNode.userPrompt}
                        onChange={(e) => {
                          setEditingNode({ ...editingNode, userPrompt: e.target.value });
                          updateNodeData({ userPrompt: e.target.value } as any);
                        }}
                        placeholder="Leave empty to use input from connected nodes..."
                        className="min-h-[100px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Custom input or leave blank to use connected node output</p>
                    </div>
                  </>
                )}

                {selectedNode.data.nodeType === 'transform' && editingNode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Transform Operation</Label>
                    <select
                      value={editingNode.config?.operation || 'lowercase'}
                      onChange={(e) => {
                        const newConfig = { ...editingNode.config, operation: e.target.value };
                        setEditingNode({ ...editingNode, config: newConfig });
                        updateNodeData({ config: newConfig } as any);
                      }}
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="lowercase">Convert to Lowercase</option>
                      <option value="uppercase">Convert to Uppercase</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Select how to transform the input text</p>
                  </div>
                )}

                {selectedNode.data.nodeType === 'output' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Export Options</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        if (selectedNode.data.output) {
                          const blob = new Blob([selectedNode.data.output], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedNode.data.label}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Output exported');
                        }
                      }}
                      disabled={!selectedNode.data.output}
                    >
                      <Download className="h-4 w-4" />
                      Export as Text
                    </Button>
                  </div>
                )}

                {selectedNode.data.output && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Latest Output</Label>
                    <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto font-mono border">
                      {selectedNode.data.output}
                    </div>
                  </div>
                )}

                <div className="pt-3 space-y-2.5 border-t">
                  <Button 
                    size="default" 
                    className="w-full gap-2"
                    onClick={() => handleRunNode(selectedNode.id)}
                    disabled={selectedNode.data.status === 'running'}
                  >
                    {selectedNode.data.status === 'running' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Test This Node
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    size="default" 
                    className="w-full gap-2"
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                      setSelectedNode(null);
                      toast.success("Node deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Node
                  </Button>
                </div>
              </div>
            </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Workflow Templates</DialogTitle>
            <p className="text-sm text-muted-foreground">Choose a template to get started quickly</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <Card 
                key={key} 
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md" 
                onClick={() => loadTemplate(key)}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      {template.nodes.length} nodes
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      {template.edges.length} connections
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Canvas;
