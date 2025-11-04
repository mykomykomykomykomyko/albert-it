export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
  share_token?: string | null;
  retention_days?: number | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
  metadata?: {
    attachments?: Array<{
      filename: string;
      type?: string;
      pageCount?: number;
      totalSheets?: number;
      totalRows?: number;
      content?: string; // File content stored for later use
    }>;
    images?: Array<{
      name: string;
      size: number;
    }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
