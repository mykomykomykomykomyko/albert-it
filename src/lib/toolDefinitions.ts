import { Clock, Cloud, Code, Search, Globe, Sparkles } from "lucide-react";

export interface ToolConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'textarea';
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    default?: any;
    min?: number;
    max?: number;
  };
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  configurable: boolean;
  requiresConfig?: boolean;
  requiresApiKey?: boolean;
  configSchema?: ToolConfigSchema;
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
    configSchema: {
      location: {
        type: 'string',
        label: 'Location',
        description: 'City name or coordinates',
        placeholder: 'e.g., London, Tokyo',
        required: true,
      },
      apiKey: {
        type: 'string',
        label: 'API Key',
        description: 'OpenWeatherMap API key',
        placeholder: 'Enter your API key',
        required: true,
      },
    },
  },
  {
    id: "google_search",
    name: "Google Search",
    description: "Search the web using Google",
    icon: Search,
    color: "bg-green-500/10 text-green-500",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: true,
    configSchema: {
      query: {
        type: 'textarea',
        label: 'Search Query',
        description: 'What to search for',
        placeholder: 'Enter search query',
        required: true,
      },
      numResults: {
        type: 'number',
        label: 'Number of Results',
        description: 'How many results to return (1-100)',
        default: 10,
        min: 1,
        max: 100,
      },
      apiKey: {
        type: 'string',
        label: 'Google API Key',
        placeholder: 'Enter API key',
        required: false,
      },
      searchEngineId: {
        type: 'string',
        label: 'Search Engine ID',
        placeholder: 'Enter search engine ID',
        required: false,
      },
    },
  },
  {
    id: "brave_search",
    name: "Brave Search",
    description: "Search the web using Brave",
    icon: Search,
    color: "bg-orange-500/10 text-orange-500",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      query: {
        type: 'textarea',
        label: 'Search Query',
        description: 'What to search for',
        placeholder: 'Enter search query',
        required: true,
      },
      numResults: {
        type: 'number',
        label: 'Number of Results',
        description: 'How many results to return (1-100)',
        default: 20,
        min: 1,
        max: 100,
      },
    },
  },
  {
    id: "perplexity_search",
    name: "Perplexity Search",
    description: "AI-powered search with real-time web data",
    icon: Sparkles,
    color: "bg-purple-500/10 text-purple-500",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      query: {
        type: 'textarea',
        label: 'Search Query',
        description: 'Question or topic to search',
        placeholder: 'What would you like to know?',
        required: true,
      },
      model: {
        type: 'string',
        label: 'Model',
        description: 'Perplexity model to use',
        default: 'llama-3.1-sonar-small-128k-online',
        placeholder: 'llama-3.1-sonar-small-128k-online',
      },
    },
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
    configSchema: {
      url: {
        type: 'string',
        label: 'URL',
        description: 'Web page URL to scrape',
        placeholder: 'https://example.com',
        required: true,
      },
    },
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
    configSchema: {
      url: {
        type: 'string',
        label: 'API URL',
        description: 'Full API endpoint URL',
        placeholder: 'https://api.example.com/endpoint',
        required: true,
      },
      method: {
        type: 'string',
        label: 'HTTP Method',
        description: 'GET, POST, PUT, DELETE, etc.',
        default: 'GET',
        placeholder: 'GET',
      },
      headers: {
        type: 'textarea',
        label: 'Headers (JSON)',
        description: 'Request headers as JSON object',
        placeholder: '{"Authorization": "Bearer token"}',
      },
      body: {
        type: 'textarea',
        label: 'Request Body (JSON)',
        description: 'Request body for POST/PUT',
        placeholder: '{"key": "value"}',
      },
    },
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
