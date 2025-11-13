export interface ToolInstance {
  id: string;
  toolId: string;
  config: Record<string, any>;
}

export interface LoopExitCondition {
  type: 'max_iterations' | 'convergence' | 'value_equals' | 'custom';
  value?: any;
  threshold?: number;
}

export interface LoopMetadata {
  loopId: string;
  nodes: Set<string>;
  edges: string[];
  entryNode: string;
  exitNode: string;
  currentIteration: number;
  maxIterations: number;
  exitConditions: LoopExitCondition[];
  history: string[];
  startTime: number;
  timeoutMs?: number;
}

export interface WorkflowNode {
  id: string;
  nodeType: "agent" | "function" | "tool";
  name: string;
  status?: "idle" | "running" | "complete" | "error";
  output?: string;
  minimized?: boolean;
  config?: Record<string, any>;
  toolOutputs?: Array<{
    toolId: string;
    toolName?: string;
    output: any;
  }>;
  executionCount?: number;
  maxExecutions?: number;
  previousOutputs?: string[];
  isInLoop?: boolean;
  loopId?: string;
}

export interface AgentNode extends WorkflowNode {
  nodeType: "agent";
  type: string;
  systemPrompt: string;
  userPrompt?: string; // Optional user prompt
  tools: ToolInstance[];
  images?: string[]; // Base64 image data URLs
}

export interface FunctionNode extends WorkflowNode {
  nodeType: "function";
  functionType: string;
  config: Record<string, any>;
  outputPorts: string[];
}

export interface ToolNode extends WorkflowNode {
  nodeType: "tool";
  toolType: string;
  config: Record<string, any>;
}

export interface Stage {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromOutputPort?: string;
  isLoopEdge?: boolean;
  loopConfig?: {
    maxIterations: number;
    exitConditions: LoopExitCondition[];
    convergenceThreshold?: number;
    timeoutSeconds?: number;
  };
}

export interface Workflow {
  stages: Stage[];
  connections: Connection[];
}

export interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "warning" | "running";
  message: string;
}
