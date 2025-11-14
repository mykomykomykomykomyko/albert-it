export interface ProcessedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  type: string;
  size: number;
  selected: boolean;
  resizeEnabled: boolean;
  uploadedAt: Date;
}

export interface ImageAttachment {
  name: string;
  dataUrl: string;
  size: number;
  source?: string;
  pageNumber?: number;
}

export interface AnalysisPrompt {
  id: string;
  name: string;
  content: string;
  isCustom: boolean;
  createdAt: Date;
  agentId?: string;
  agentSystemPrompt?: string;
  agentKnowledgeDocuments?: any[];
}

export const PREDEFINED_PROMPTS: Omit<AnalysisPrompt, 'id' | 'createdAt'>[] = [
  {
    name: "General Description",
    content: "Provide a detailed description of this image, including all visible elements, colors, composition, and overall context.",
    isCustom: false
  },
  {
    name: "Text Extraction",
    content: "Extract and transcribe all visible text from this image, maintaining the original formatting and structure as much as possible.",
    isCustom: false
  },
  {
    name: "Document Analysis",
    content: "Analyze this document image for key information, structure, and content. Identify document type, main topics, and important details.",
    isCustom: false
  },
  {
    name: "Visual Elements",
    content: "Identify and describe all visual elements including charts, graphs, diagrams, illustrations, and their significance.",
    isCustom: false
  },
  {
    name: "Academic Content",
    content: "Analyze this image for academic content including concepts, theories, formulas, citations, and educational material.",
    isCustom: false
  },
  {
    name: "Data Extraction",
    content: "Extract structured data from this image including tables, lists, numerical values, and any organized information.",
    isCustom: false
  }
];

export interface AnalysisResult {
  id: string;
  imageId: string;
  promptId: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processingTime: number;
  createdAt: Date;
}

export interface BoundingBox {
  box_2d: [number, number, number, number];
  label: string;
}
