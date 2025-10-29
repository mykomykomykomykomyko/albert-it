export interface ToolInstance {
  id: string;
  toolId: string;
  config: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  nodeType: "agent" | "function" | "tool";
  name: string;
  status?: "idle" | "running" | "complete" | "error";
  output?: string;
  minimized?: boolean;
  config?: Record<string, any>;
}

export interface AgentNode extends WorkflowNode {
  nodeType: "agent";
  type: string;
  systemPrompt: string;
  userPrompt: string;
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
