import { 
  Clock, Cloud, Code, Search, Globe, Sparkles, 
  FileText, Github, Archive, Brain, Database,
  FileDown, Mail, MessageSquare, Lightbulb,
  Eye, Calculator, ListChecks, BookOpen
} from "lucide-react";

export interface ToolConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'textarea' | 'select';
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    default?: any;
    min?: number;
    max?: number;
    options?: Array<{ value: string; label: string }>;
  };
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  category: 'search' | 'web' | 'memory' | 'reasoning' | 'files' | 'github' | 'export' | 'communication' | 'utility';
  configurable: boolean;
  requiresConfig?: boolean;
  requiresApiKey?: boolean;
  configSchema?: ToolConfigSchema;
}

export const toolDefinitions: ToolDefinition[] = [
  // === SEARCH TOOLS ===
  {
    id: "google_search",
    name: "Google Search",
    description: "Search the web using Google",
    icon: Search,
    color: "bg-green-500/10 text-green-500",
    category: "search",
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
    category: "search",
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
    category: "search",
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
        type: 'select',
        label: 'Model',
        description: 'Perplexity model to use',
        default: 'sonar',
        options: [
          { value: 'sonar', label: 'Sonar (Fast & Cost-Effective)' },
          { value: 'sonar-pro', label: 'Sonar Pro (Advanced Search)' },
          { value: 'sonar-reasoning', label: 'Sonar Reasoning (Complex Tasks)' },
          { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (DeepSeek-R1)' },
          { value: 'sonar-deep-research', label: 'Sonar Deep Research (Comprehensive)' },
        ],
      },
    },
  },

  // === WEB TOOLS ===
  {
    id: "web_scrape",
    name: "Web Scrape",
    description: "Extract content from web pages",
    icon: Globe,
    color: "bg-purple-500/10 text-purple-500",
    category: "web",
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
    category: "web",
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

  // === UTILITY TOOLS ===
  {
    id: "time",
    name: "Time",
    description: "Get current date and time information",
    icon: Clock,
    color: "bg-blue-500/10 text-blue-500",
    category: "utility",
    configurable: false,
    requiresApiKey: false,
  },
  {
    id: "weather",
    name: "Weather",
    description: "Get weather information for any location",
    icon: Cloud,
    color: "bg-sky-500/10 text-sky-500",
    category: "utility",
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

  // === GITHUB TOOLS ===
  {
    id: "github_read_repo",
    name: "Read GitHub Repo",
    description: "Read file tree and contents from a GitHub repository",
    icon: Github,
    color: "bg-gray-500/10 text-gray-500",
    category: "github",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      repoUrl: {
        type: 'string',
        label: 'Repository URL',
        description: 'Full GitHub repository URL',
        placeholder: 'https://github.com/owner/repo',
        required: true,
      },
      branch: {
        type: 'string',
        label: 'Branch',
        description: 'Branch to read from',
        default: 'main',
        placeholder: 'main',
      },
      path: {
        type: 'string',
        label: 'Path',
        description: 'Specific path within the repo (optional)',
        placeholder: 'src/components',
      },
    },
  },
  {
    id: "github_read_file",
    name: "Read GitHub File",
    description: "Read a specific file from a GitHub repository",
    icon: Github,
    color: "bg-gray-500/10 text-gray-500",
    category: "github",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      repoUrl: {
        type: 'string',
        label: 'Repository URL',
        description: 'Full GitHub repository URL',
        placeholder: 'https://github.com/owner/repo',
        required: true,
      },
      filePath: {
        type: 'string',
        label: 'File Path',
        description: 'Path to the file',
        placeholder: 'src/index.ts',
        required: true,
      },
      branch: {
        type: 'string',
        label: 'Branch',
        description: 'Branch to read from',
        default: 'main',
        placeholder: 'main',
      },
    },
  },
  {
    id: "github_commits",
    name: "GitHub Commits",
    description: "Get recent commits from a GitHub repository",
    icon: Github,
    color: "bg-gray-500/10 text-gray-500",
    category: "github",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      repoUrl: {
        type: 'string',
        label: 'Repository URL',
        description: 'Full GitHub repository URL',
        placeholder: 'https://github.com/owner/repo',
        required: true,
      },
      count: {
        type: 'number',
        label: 'Number of Commits',
        description: 'How many commits to fetch',
        default: 10,
        min: 1,
        max: 100,
      },
    },
  },

  // === FILE TOOLS ===
  {
    id: "pdf_extract",
    name: "PDF Extract",
    description: "Extract text and metadata from PDF files",
    icon: FileText,
    color: "bg-red-500/10 text-red-500",
    category: "files",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      pdfUrl: {
        type: 'string',
        label: 'PDF URL or Base64',
        description: 'URL to PDF file or base64 encoded data',
        placeholder: 'https://example.com/document.pdf',
        required: true,
      },
      pages: {
        type: 'string',
        label: 'Pages',
        description: 'Page range (e.g., "1-5" or "all")',
        default: 'all',
        placeholder: 'all',
      },
    },
  },
  {
    id: "ocr_image",
    name: "OCR Image",
    description: "Extract text from images using OCR",
    icon: Eye,
    color: "bg-indigo-500/10 text-indigo-500",
    category: "files",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      imageUrl: {
        type: 'string',
        label: 'Image URL or Base64',
        description: 'URL to image or base64 encoded data',
        placeholder: 'https://example.com/image.png',
        required: true,
      },
      language: {
        type: 'select',
        label: 'Language',
        description: 'Primary language in the image',
        default: 'en',
        options: [
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'French' },
          { value: 'es', label: 'Spanish' },
          { value: 'de', label: 'German' },
          { value: 'auto', label: 'Auto-detect' },
        ],
      },
    },
  },
  {
    id: "zip_read",
    name: "Read ZIP Contents",
    description: "List and extract files from ZIP archives",
    icon: Archive,
    color: "bg-yellow-500/10 text-yellow-500",
    category: "files",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      zipUrl: {
        type: 'string',
        label: 'ZIP URL or Base64',
        description: 'URL to ZIP file or base64 encoded data',
        placeholder: 'https://example.com/archive.zip',
        required: true,
      },
      extractPath: {
        type: 'string',
        label: 'Extract Path',
        description: 'Specific file to extract (optional)',
        placeholder: 'folder/file.txt',
      },
    },
  },

  // === REASONING TOOLS ===
  {
    id: "think",
    name: "Think",
    description: "Extended thinking space for complex reasoning",
    icon: Brain,
    color: "bg-pink-500/10 text-pink-500",
    category: "reasoning",
    configurable: false,
    requiresApiKey: false,
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Create concise summaries of content",
    icon: ListChecks,
    color: "bg-teal-500/10 text-teal-500",
    category: "reasoning",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      content: {
        type: 'textarea',
        label: 'Content',
        description: 'Text to summarize',
        placeholder: 'Enter text to summarize...',
        required: true,
      },
      style: {
        type: 'select',
        label: 'Summary Style',
        description: 'How to format the summary',
        default: 'brief',
        options: [
          { value: 'brief', label: 'Brief (1-2 sentences)' },
          { value: 'detailed', label: 'Detailed (paragraph)' },
          { value: 'bullet_points', label: 'Bullet Points' },
        ],
      },
    },
  },
  {
    id: "analyze",
    name: "Analyze",
    description: "Perform detailed analysis of content",
    icon: Lightbulb,
    color: "bg-amber-500/10 text-amber-500",
    category: "reasoning",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      content: {
        type: 'textarea',
        label: 'Content',
        description: 'Text to analyze',
        placeholder: 'Enter text to analyze...',
        required: true,
      },
      analysisType: {
        type: 'select',
        label: 'Analysis Type',
        description: 'Type of analysis to perform',
        default: 'general',
        options: [
          { value: 'general', label: 'General Analysis' },
          { value: 'sentiment', label: 'Sentiment Analysis' },
          { value: 'entities', label: 'Entity Extraction' },
          { value: 'structure', label: 'Structure Analysis' },
        ],
      },
    },
  },
  {
    id: "calculate",
    name: "Calculate",
    description: "Perform mathematical calculations",
    icon: Calculator,
    color: "bg-cyan-500/10 text-cyan-500",
    category: "reasoning",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      expression: {
        type: 'string',
        label: 'Expression',
        description: 'Mathematical expression to evaluate',
        placeholder: '2 + 2 * 3',
        required: true,
      },
    },
  },

  // === MEMORY TOOLS (for Free Agent) ===
  {
    id: "write_blackboard",
    name: "Write to Blackboard",
    description: "Write observations, insights, or decisions to the blackboard",
    icon: BookOpen,
    color: "bg-emerald-500/10 text-emerald-500",
    category: "memory",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      type: {
        type: 'select',
        label: 'Entry Type',
        description: 'Type of blackboard entry',
        default: 'observation',
        options: [
          { value: 'observation', label: 'Observation' },
          { value: 'insight', label: 'Insight' },
          { value: 'plan', label: 'Plan' },
          { value: 'decision', label: 'Decision' },
          { value: 'progress', label: 'Progress' },
        ],
      },
      content: {
        type: 'textarea',
        label: 'Content',
        description: 'What to write to the blackboard',
        placeholder: 'Enter your observation or insight...',
        required: true,
      },
    },
  },
  {
    id: "read_blackboard",
    name: "Read Blackboard",
    description: "Read entries from the blackboard memory",
    icon: BookOpen,
    color: "bg-emerald-500/10 text-emerald-500",
    category: "memory",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      filter: {
        type: 'select',
        label: 'Filter By Type',
        description: 'Filter entries by type',
        default: 'all',
        options: [
          { value: 'all', label: 'All Entries' },
          { value: 'observation', label: 'Observations' },
          { value: 'insight', label: 'Insights' },
          { value: 'plan', label: 'Plans' },
          { value: 'decision', label: 'Decisions' },
        ],
      },
      count: {
        type: 'number',
        label: 'Number of Entries',
        description: 'How many entries to read',
        default: 10,
        min: 1,
        max: 50,
      },
    },
  },
  {
    id: "update_scratchpad",
    name: "Update Scratchpad",
    description: "Update the working scratchpad with notes",
    icon: MessageSquare,
    color: "bg-violet-500/10 text-violet-500",
    category: "memory",
    configurable: true,
    requiresConfig: false,
    requiresApiKey: false,
    configSchema: {
      content: {
        type: 'textarea',
        label: 'Content',
        description: 'New scratchpad content',
        placeholder: 'Working notes...',
        required: true,
      },
    },
  },

  // === EXPORT TOOLS ===
  {
    id: "export_markdown",
    name: "Export Markdown",
    description: "Export content as a Markdown document",
    icon: FileDown,
    color: "bg-slate-500/10 text-slate-500",
    category: "export",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      content: {
        type: 'textarea',
        label: 'Content',
        description: 'Content to export',
        placeholder: 'Enter markdown content...',
        required: true,
      },
      filename: {
        type: 'string',
        label: 'Filename',
        description: 'Name for the exported file',
        default: 'document.md',
        placeholder: 'document.md',
      },
    },
  },
  {
    id: "export_json",
    name: "Export JSON",
    description: "Export data as a JSON file",
    icon: FileDown,
    color: "bg-slate-500/10 text-slate-500",
    category: "export",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      data: {
        type: 'textarea',
        label: 'Data',
        description: 'JSON data to export',
        placeholder: '{"key": "value"}',
        required: true,
      },
      filename: {
        type: 'string',
        label: 'Filename',
        description: 'Name for the exported file',
        default: 'data.json',
        placeholder: 'data.json',
      },
    },
  },

  // === COMMUNICATION TOOLS ===
  {
    id: "send_email",
    name: "Send Email",
    description: "Send an email message",
    icon: Mail,
    color: "bg-rose-500/10 text-rose-500",
    category: "communication",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: true,
    configSchema: {
      to: {
        type: 'string',
        label: 'To',
        description: 'Recipient email address',
        placeholder: 'recipient@example.com',
        required: true,
      },
      subject: {
        type: 'string',
        label: 'Subject',
        description: 'Email subject line',
        placeholder: 'Subject...',
        required: true,
      },
      body: {
        type: 'textarea',
        label: 'Body',
        description: 'Email body content',
        placeholder: 'Email content...',
        required: true,
      },
    },
  },

  // === DATABASE TOOLS ===
  {
    id: "query_database",
    name: "Query Database",
    description: "Execute read-only queries against the database",
    icon: Database,
    color: "bg-blue-600/10 text-blue-600",
    category: "utility",
    configurable: true,
    requiresConfig: true,
    requiresApiKey: false,
    configSchema: {
      table: {
        type: 'string',
        label: 'Table Name',
        description: 'Name of the table to query',
        placeholder: 'users',
        required: true,
      },
      columns: {
        type: 'string',
        label: 'Columns',
        description: 'Columns to select (comma-separated, or * for all)',
        default: '*',
        placeholder: 'id, name, email',
      },
      limit: {
        type: 'number',
        label: 'Limit',
        description: 'Maximum number of rows to return',
        default: 10,
        min: 1,
        max: 100,
      },
    },
  },
];

// Helper functions
export const getToolById = (toolId: string): ToolDefinition | undefined => {
  return toolDefinitions.find(t => t.id === toolId);
};

export const getToolsByIds = (toolIds: string[]): ToolDefinition[] => {
  return toolIds
    .map(id => getToolById(id))
    .filter((t): t is ToolDefinition => t !== undefined);
};

export const getToolsByCategory = (category: ToolDefinition['category']): ToolDefinition[] => {
  return toolDefinitions.filter(t => t.category === category);
};

export const getToolCategories = (): ToolDefinition['category'][] => {
  return [...new Set(toolDefinitions.map(t => t.category))];
};

export const getCategoryLabel = (category: ToolDefinition['category']): string => {
  const labels: Record<ToolDefinition['category'], string> = {
    search: 'Search',
    web: 'Web',
    memory: 'Memory',
    reasoning: 'Reasoning',
    files: 'Files',
    github: 'GitHub',
    export: 'Export',
    communication: 'Communication',
    utility: 'Utility',
  };
  return labels[category];
};

export const getCategoryColor = (category: ToolDefinition['category']): string => {
  const colors: Record<ToolDefinition['category'], string> = {
    search: 'bg-green-500/10 text-green-500',
    web: 'bg-purple-500/10 text-purple-500',
    memory: 'bg-emerald-500/10 text-emerald-500',
    reasoning: 'bg-pink-500/10 text-pink-500',
    files: 'bg-red-500/10 text-red-500',
    github: 'bg-gray-500/10 text-gray-500',
    export: 'bg-slate-500/10 text-slate-500',
    communication: 'bg-rose-500/10 text-rose-500',
    utility: 'bg-blue-500/10 text-blue-500',
  };
  return colors[category];
};
