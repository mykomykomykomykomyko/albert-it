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

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  attachments?: FileAttachment[] | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
