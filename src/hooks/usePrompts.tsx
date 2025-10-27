import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Prompt {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  prompt_text: string;
  category?: string;
  tags?: string[];
  is_public: boolean;
  is_template: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromptExecution {
  id: string;
  prompt_id: string;
  user_id: string;
  input_variables?: Record<string, any>;
  output?: string;
  execution_time_ms?: number;
  created_at: string;
}

export const usePrompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const createPrompt = async (prompt: Omit<Prompt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<Prompt | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          ...prompt,
        })
        .select()
        .single();

      if (error) throw error;
      
      setPrompts(prev => [data, ...prev]);
      toast.success('Prompt created successfully');
      return data;
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt');
      return null;
    }
  };

  const updatePrompt = async (id: string, updates: Partial<Prompt>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('prompts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setPrompts(prev => prev.map(prompt => 
        prompt.id === id ? { ...prompt, ...updates } : prompt
      ));
      toast.success('Prompt updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
      return false;
    }
  };

  const deletePrompt = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrompts(prev => prev.filter(prompt => prompt.id !== id));
      toast.success('Prompt deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
      return false;
    }
  };

  const executePrompt = async (promptId: string, inputVariables?: Record<string, any>): Promise<string | null> => {
    try {
      const startTime = Date.now();
      const prompt = prompts.find(p => p.id === promptId);
      if (!prompt) throw new Error('Prompt not found');

      // Here you would integrate with your LLM API
      // For now, return the prompt text with variables replaced
      let processedPrompt = prompt.prompt_text;
      if (inputVariables) {
        Object.entries(inputVariables).forEach(([key, value]) => {
          processedPrompt = processedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      }

      const executionTime = Date.now() - startTime;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('prompt_executions').insert({
          prompt_id: promptId,
          user_id: user.id,
          input_variables: inputVariables,
          output: processedPrompt,
          execution_time_ms: executionTime
        });

        // Increment usage count
        await supabase
          .from('prompts')
          .update({ usage_count: (prompt.usage_count || 0) + 1 })
          .eq('id', promptId);
      }

      return processedPrompt;
    } catch (error) {
      console.error('Error executing prompt:', error);
      toast.error('Failed to execute prompt');
      return null;
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  return {
    prompts,
    loading,
    createPrompt,
    updatePrompt,
    deletePrompt,
    executePrompt,
    refreshPrompts: loadPrompts,
  };
};
