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
  createdAt: Date;
}

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
