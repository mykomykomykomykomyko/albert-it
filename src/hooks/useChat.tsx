/**
 * useChat Hook - Chat State and Message Management
 * 
 * This hook manages all chat-related functionality including messages, loading state,
 * and interaction with the Gemini AI API through Supabase Edge Functions.
 * 
 * Features:
 * - Message state management
 * - Chat history persistence
 * - Streaming AI responses
 * - File attachments (images, documents)
 * - Audio message support
 * - Agent-specific conversations
 * 
 * Architecture:
 * - Uses Supabase for message persistence
 * - Calls gemini-chat-with-images edge function for AI responses
 * - Handles streaming responses via Server-Sent Events (SSE)
 * - Manages multimodal inputs (text, images, files)
 * 
 * Data Flow:
 * 1. User sends message → Hook adds to local state
 * 2. Hook calls Supabase edge function with message + attachments
 * 3. Edge function streams AI response token by token
 * 4. Hook updates UI as tokens arrive
 * 5. Final message saved to Supabase database
 * 
 * Usage:
 * ```tsx
 * const {
 *   messages,
 *   loading,
 *   isLoadingHistory,
 *   sendMessage,
 *   clearChat
 * } = useChat();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: ImageAttachment[];
  files?: FileAttachment[];
  generatedImage?: string; // Base64 image data for generated images
}

/**
 * Image attachment structure
 * Supports images directly uploaded or extracted from PDFs
 */
export interface ImageAttachment {
  name: string;
  dataUrl: string; // Base64 encoded image data
  size: number; // File size in bytes
  source?: string; // Source type (e.g., 'pdf', 'upload')
  pageNumber?: number; // For PDF-extracted images
}

/**
 * File attachment structure
 * Supports text documents, PDFs, Excel files
 */
export interface FileAttachment {
  filename: string;
  content: string; // Extracted text content
  pageCount?: number; // For PDFs
  totalSheets?: number; // For Excel files
  totalRows?: number; // For Excel files
  type?: string; // MIME type
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { user } = useAuth();

  // Load chat history on mount
  useEffect(() => {
    if (user?.email) {
      loadChatHistory();
    }
  }, [user?.email]);

  const loadChatHistory = async () => {
    if (!user?.email) return;
    
    try {
      console.log('📚 Loading chat history for:', user.email);
      setIsLoadingHistory(true);
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: true });

      console.log('📚 Chat history response:', { data, error });
      
      if (error) {
        console.error('❌ Database error loading chat history:', error);
        throw error;
      }

      const formattedMessages = data?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
        images: msg.images ? JSON.parse(String(msg.images)) : undefined,
        files: msg.files ? JSON.parse(String(msg.files)) : undefined,
      })) || [];

      console.log('✅ Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('💥 Error loading chat history:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const resetChat = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_email', user.email);

      if (error) throw error;

      setMessages([]);
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const saveMessageToHistory = async (message: ChatMessage) => {
    if (!user?.email) return;

    try {
      const { error } = await supabase
        .from('chat_history')
        .insert({
          id: message.id,
          user_email: user.email,
          role: message.role,
          content: message.content,
          images: message.images ? JSON.stringify(message.images) : null,
          files: message.files ? JSON.stringify(message.files) : null,
          created_at: message.timestamp
        });

      if (error) {
        console.error('Error saving message to history:', error);
      }
    } catch (error) {
      console.error('Error saving message to history:', error);
    }
  };

  const sendMessage = useCallback(async (
    message: string,
    images: ImageAttachment[] = [],
    files: FileAttachment[] = []
  ) => {
    if (!user?.email || loading) return;

    console.log('🚀 Starting sendMessage with:', { message, userEmail: user.email, images: images.length, files: files.length });
    setLoading(true);
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      images: images.length > 0 ? images : undefined,
      files: files.length > 0 ? files : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to history
    await saveMessageToHistory(userMessage);

    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please sign in again.');
      }

      // Prepare the request payload
      const requestPayload: any = {
        message,
        userEmail: user.email,
        messageHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // Add images if present
      if (images.length > 0) {
        requestPayload.images = images.map(img => img.dataUrl);
      }

      // Add file content to message if present
      if (files.length > 0) {
        const fileContent = files.map(file => {
          let content = `\n\n=== ${file.filename} ===\n\n${file.content}`;
          if (file.pageCount) {
            content = `\n\n=== ${file.filename} (${file.pageCount} pages) ===\n\n${file.content}`;
          } else if (file.totalSheets) {
            content = `\n\n=== ${file.filename} (${file.totalSheets} sheets, ${file.totalRows} rows) ===\n\n${file.content}`;
          }
          return content;
        }).join('\n\n');
        
        requestPayload.message = message + fileContent;
      }

      console.log('📡 Making request to gemini-chat...');
      
      // Call the appropriate endpoint based on whether we have images
      const endpoint = images.length > 0 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat-with-images`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📡 Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response failed:', response.status, errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6).trim();
                  if (jsonStr) {
                    const data = JSON.parse(jsonStr);
                    if (data.text) {
                      accumulatedContent += data.text;
                      
                      setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      ));
                    } else if (data.error) {
                      throw new Error(data.error);
                    }
                  }
                } catch (e: any) {
                  if (e.message && !e.message.includes('JSON')) {
                    throw e;
                  }
                  console.error('Error parsing streaming data:', e);
                }
              }
            }
          }
        } catch (streamError: any) {
          console.error('Streaming error:', streamError);
          throw streamError;
        }
      }

      // Save final assistant message
      await saveMessageToHistory({
        ...assistantMessage,
        content: accumulatedContent
      });

    } catch (error: any) {
      console.error('💥 sendMessage error:', error);
      
      // Remove the last assistant message if it failed
      setMessages(prev => prev.filter(msg => msg.id !== `assistant-${Date.now()}`));
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, messages, loading]);

  const generateImage = useCallback(async (prompt: string) => {
    if (!user?.email || loading) return;

    console.log('🎨 Starting generateImage with:', { prompt, userEmail: user.email });
    setLoading(true);
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Generate an image: ${prompt}`,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessageToHistory(userMessage);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please sign in again.');
      }

      console.log('📡 Calling generate-image function...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate image: ${response.status}`);
      }

      const { imageUrl, description } = await response.json();

      // Create assistant message with generated image
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: description,
        timestamp: new Date().toISOString(),
        generatedImage: imageUrl,
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessageToHistory(assistantMessage);

    } catch (error: any) {
      console.error('💥 generateImage error:', error);
      toast.error(error.message || 'Failed to generate image');
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't generate that image. ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  return {
    messages,
    loading,
    isLoadingHistory,
    sendMessage,
    resetChat,
    generateImage,
  };
}
