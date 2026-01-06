// Free Agent Memory Architecture Types

export type BlackboardEntryType = 
  | 'observation'
  | 'insight'
  | 'plan'
  | 'decision'
  | 'error'
  | 'artifact'
  | 'question'
  | 'answer'
  | 'progress'
  | 'memory';

export interface BlackboardEntry {
  id: string;
  type: BlackboardEntryType;
  content: string;
  timestamp: string;
  iteration: number;
  metadata?: Record<string, any>;
}

export interface Scratchpad {
  id: string;
  content: string;
  lastUpdated: string;
  version: number;
}

export interface NamedAttribute {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  value: any;
  timestamp: string;
  iteration: number;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'text' | 'code' | 'json' | 'markdown' | 'image' | 'file';
  content: string;
  mimeType?: string;
  createdAt: string;
  iteration: number;
  metadata?: Record<string, any>;
}

export interface ChildAgent {
  id: string;
  name: string;
  prompt: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  parentAgentId: string;
  result?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface LoopDetection {
  patternCount: number;
  lastOutputs: string[];
  isLooping: boolean;
  loopThreshold: number;
}

export type FreeAgentStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_input'
  | 'complete'
  | 'error'
  | 'stopped';

export interface FreeAgentModel {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'xai';
  modelId: string;
  isDefault?: boolean;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

export interface FreeAgentConfig {
  maxIterations: number;
  model: FreeAgentModel;
  systemPrompt: string;
  userPrompt?: string;
  enabledTools: string[];
  autoStart: boolean;
  loopDetectionThreshold: number;
  timeoutSeconds: number;
  memoryPersistence: 'session' | 'permanent' | 'none';
}

export interface FreeAgentSession {
  id: string;
  config: FreeAgentConfig;
  status: FreeAgentStatus;
  currentIteration: number;
  blackboard: BlackboardEntry[];
  scratchpad: Scratchpad | null;
  namedAttributes: NamedAttribute[];
  artifacts: Artifact[];
  childAgents: ChildAgent[];
  loopDetection: LoopDetection;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  lastError?: string;
  totalTokensUsed: number;
  estimatedCost: number;
}

export interface FreeAgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface FreeAgentResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface FreeAgentIterationResult {
  iteration: number;
  response: FreeAgentResponse;
  toolResults?: Array<{
    toolId: string;
    toolName: string;
    result: any;
    error?: string;
  }>;
  blackboardUpdates: BlackboardEntry[];
  scratchpadUpdate?: Scratchpad;
  newArtifacts?: Artifact[];
  isComplete: boolean;
  shouldStop: boolean;
  stopReason?: string;
}

// Default models available
export const DEFAULT_FREE_AGENT_MODELS: FreeAgentModel[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    modelId: 'google/gemini-2.5-flash',
    isDefault: true,
    supportsVision: true,
    supportsTools: true,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    modelId: 'google/gemini-2.5-pro',
    supportsVision: true,
    supportsTools: true,
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro (Preview)',
    provider: 'google',
    modelId: 'google/gemini-3-pro-preview',
    supportsVision: true,
    supportsTools: true,
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    modelId: 'openai/gpt-5',
    supportsVision: true,
    supportsTools: true,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    modelId: 'openai/gpt-5-mini',
    supportsVision: true,
    supportsTools: true,
  },
];

// Default configuration
export const DEFAULT_FREE_AGENT_CONFIG: Omit<FreeAgentConfig, 'systemPrompt'> = {
  maxIterations: 50,
  model: DEFAULT_FREE_AGENT_MODELS[0],
  enabledTools: [],
  autoStart: false,
  loopDetectionThreshold: 3,
  timeoutSeconds: 300,
  memoryPersistence: 'session',
};

// Helper to create a new session
export function createFreeAgentSession(
  config: FreeAgentConfig
): FreeAgentSession {
  return {
    id: crypto.randomUUID(),
    config,
    status: 'idle',
    currentIteration: 0,
    blackboard: [],
    scratchpad: null,
    namedAttributes: [],
    artifacts: [],
    childAgents: [],
    loopDetection: {
      patternCount: 0,
      lastOutputs: [],
      isLooping: false,
      loopThreshold: config.loopDetectionThreshold,
    },
    totalTokensUsed: 0,
    estimatedCost: 0,
  };
}

// Helper to add blackboard entry
export function addBlackboardEntry(
  session: FreeAgentSession,
  type: BlackboardEntryType,
  content: string,
  metadata?: Record<string, any>
): BlackboardEntry {
  const entry: BlackboardEntry = {
    id: crypto.randomUUID(),
    type,
    content,
    timestamp: new Date().toISOString(),
    iteration: session.currentIteration,
    metadata,
  };
  session.blackboard.push(entry);
  return entry;
}

// Helper to update scratchpad
export function updateScratchpad(
  session: FreeAgentSession,
  content: string
): Scratchpad {
  const scratchpad: Scratchpad = {
    id: session.scratchpad?.id || crypto.randomUUID(),
    content,
    lastUpdated: new Date().toISOString(),
    version: (session.scratchpad?.version || 0) + 1,
  };
  session.scratchpad = scratchpad;
  return scratchpad;
}

// Helper to add named attribute
export function addNamedAttribute(
  session: FreeAgentSession,
  name: string,
  toolId: string,
  toolName: string,
  value: any
): NamedAttribute {
  const attr: NamedAttribute = {
    id: crypto.randomUUID(),
    name,
    toolId,
    toolName,
    value,
    timestamp: new Date().toISOString(),
    iteration: session.currentIteration,
  };
  // Update existing or add new
  const existingIndex = session.namedAttributes.findIndex(a => a.name === name);
  if (existingIndex >= 0) {
    session.namedAttributes[existingIndex] = attr;
  } else {
    session.namedAttributes.push(attr);
  }
  return attr;
}

// Helper to check for loops
export function checkForLoop(
  session: FreeAgentSession,
  latestOutput: string
): boolean {
  const { loopDetection } = session;
  const normalizedOutput = latestOutput.toLowerCase().trim().slice(0, 500);
  
  // Check if this output matches any recent outputs
  const matchCount = loopDetection.lastOutputs.filter(
    output => output === normalizedOutput
  ).length;
  
  // Update last outputs (keep last 5)
  loopDetection.lastOutputs.push(normalizedOutput);
  if (loopDetection.lastOutputs.length > 5) {
    loopDetection.lastOutputs.shift();
  }
  
  // Detect loop if we've seen the same output too many times
  loopDetection.patternCount = matchCount + 1;
  loopDetection.isLooping = matchCount >= loopDetection.loopThreshold;
  
  return loopDetection.isLooping;
}
