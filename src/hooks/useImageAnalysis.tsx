import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImageAnalysisSession {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ImageAnalysisImage {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  resize_enabled: boolean;
  selected: boolean;
  created_at: string;
}

export interface ImageAnalysisPrompt {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  content: string;
  is_custom: boolean;
  created_at: string;
}

export interface ImageAnalysisResult {
  id: string;
  session_id: string;
  user_id: string;
  image_id: string;
  prompt_id: string;
  content: string;
  status: string;
  processing_time?: number;
  created_at: string;
}

export const useImageAnalysis = (sessionId?: string) => {
  const [session, setSession] = useState<ImageAnalysisSession | null>(null);
  const [images, setImages] = useState<ImageAnalysisImage[]>([]);
  const [prompts, setPrompts] = useState<ImageAnalysisPrompt[]>([]);
  const [results, setResults] = useState<ImageAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSession = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('image_analysis_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const createSession = async (name: string = 'Untitled Analysis'): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('image_analysis_sessions')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
      return null;
    }
  };

  const loadImages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('image_analysis_images')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const loadPrompts = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('image_analysis_prompts')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const loadResults = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('image_analysis_results')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      Promise.all([
        loadSession(sessionId),
        loadImages(sessionId),
        loadPrompts(sessionId),
        loadResults(sessionId),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    session,
    images,
    prompts,
    results,
    loading,
    createSession,
    loadImages,
    loadPrompts,
    loadResults,
  };
};
