import { Clock, Cloud, Code, Search, Globe } from "lucide-react";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  configurable: boolean;
  requiresConfig?: boolean;
  requiresApiKey?: boolean; // Compatibility with existing code
}

export const toolDefinitions: ToolDefinition[] = [
  {
    id: "time",
    name: "Time",
    description: "Get current date and time information",
    icon: Clock,
    color: "bg-blue-500/10 text-blue-500",
    configurable: false,
    requiresApiKey: false,
  },
  {
    id: "weather",
    name: "Weather",
    description: "Get weather information for any location",
    icon: Cloud,
    color: "bg-sky-500/10 text-sky-500",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: true,
  },
  {
    id: "google_search",
    name: "Google Search",
    description: "Search the web using Google",
    icon: Search,
    color: "bg-green-500/10 text-green-500",
    configurable: true,
    requiresConfig: false, // Can work with env vars
    requiresApiKey: true,
  },
  {
    id: "brave_search",
    name: "Brave Search",
    description: "Search the web using Brave",
    icon: Search,
    color: "bg-orange-500/10 text-orange-500",
    configurable: true,
    requiresConfig: false, // Can work with env vars
    requiresApiKey: true,
  },
  {
    id: "web_scrape",
    name: "Web Scrape",
    description: "Extract content from web pages",
    icon: Globe,
    color: "bg-purple-500/10 text-purple-500",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
  },
  {
    id: "api_call",
    name: "API Call",
    description: "Make HTTP requests to external APIs",
    icon: Code,
    color: "bg-orange-500/10 text-orange-500",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: true,
  },
];

export const getToolById = (toolId: string): ToolDefinition | undefined => {
  return toolDefinitions.find(t => t.id === toolId);
};

export const getToolsByIds = (toolIds: string[]): ToolDefinition[] => {
  return toolIds
    .map(id => getToolById(id))
    .filter((t): t is ToolDefinition => t !== undefined);
};
