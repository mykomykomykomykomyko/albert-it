import type { LucideIcon } from "lucide-react";

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  color: string;
  inputs: {
    label: string;
    description: string;
  };
  outputs: string[];
  configSchema?: Record<string, ConfigField>;
}

export interface ConfigField {
  type: "string" | "number" | "boolean" | "select" | "textarea" | "json";
  label: string;
  description: string;
  required?: boolean;
  default?: any;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface FunctionExecutionResult {
  success: boolean;
  outputs: Record<string, string>;
  error?: string;
}

export interface MemoryEntry {
  timestamp: number;
  input: string;
  output: string;
  runId: string;
}
