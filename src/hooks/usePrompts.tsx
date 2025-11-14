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
  is_marketplace: boolean;
  visibility?: string;
  submitted_at?: string;
  reviewed_at?: string;
  reviewer_id?: string;
  review_notes?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromptShare {
  id: string;
  prompt_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
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
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data && !error);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

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

  const loadMarketplacePrompts = async (): Promise<Prompt[]> => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('visibility', 'published')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading marketplace prompts:', error);
      toast.error('Failed to load marketplace prompts');
      return [];
    }
  };

  const loadPendingPrompts = async (): Promise<Prompt[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) return [];

      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('visibility', 'pending_review')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading pending prompts:', error);
      return [];
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

  const sharePrompt = async (promptId: string, userEmail: string, permission: 'view' | 'edit' = 'view'): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get the user ID from email
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !targetUser) {
        toast.error('User not found');
        return false;
      }

      const { error } = await supabase
        .from('prompt_shares')
        .insert({
          prompt_id: promptId,
          shared_with_user_id: targetUser.id,
          shared_by_user_id: user.id,
          permission
        });

      if (error) throw error;
      toast.success('Prompt shared successfully');
      return true;
    } catch (error) {
      console.error('Error sharing prompt:', error);
      toast.error('Failed to share prompt');
      return false;
    }
  };

  const submitToMarketplace = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ 
          visibility: 'pending_review',
          submitted_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, visibility: 'pending_review' } : prompt
      ));
      toast.success("Prompt submitted for review");
    } catch (error) {
      console.error('Error submitting to marketplace:', error);
      toast.error("Failed to submit to marketplace");
    }
  };

  const approvePrompt = async (promptId: string) => {
    try {
      if (!isAdmin) {
        toast.error("Only admins can approve prompts");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('prompts')
        .update({ 
          visibility: 'published',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id,
          review_notes: null
        })
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, visibility: 'published' } : prompt
      ));
      toast.success("Prompt approved and published to marketplace");
    } catch (error) {
      console.error('Error approving prompt:', error);
      toast.error("Failed to approve prompt");
    }
  };

  const rejectPrompt = async (promptId: string, notes?: string) => {
    try {
      if (!isAdmin) {
        toast.error("Only admins can reject prompts");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('prompts')
        .update({ 
          visibility: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id,
          review_notes: notes
        })
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, visibility: 'rejected' } : prompt
      ));
      toast.success("Prompt rejected");
    } catch (error) {
      console.error('Error rejecting prompt:', error);
      toast.error("Failed to reject prompt");
    }
  };

  const sendBackForEditing = async (promptId: string, notes: string) => {
    try {
      if (!isAdmin) {
        toast.error("Only admins can send prompts back for editing");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('prompts')
        .update({ 
          visibility: 'private',
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id,
          review_notes: notes
        })
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.map(prompt =>
        prompt.id === promptId ? { ...prompt, visibility: 'private', review_notes: notes } : prompt
      ));
      toast.success("Prompt sent back for editing");
    } catch (error) {
      console.error('Error sending prompt back:', error);
      toast.error("Failed to send prompt back");
    }
  };

  const executePrompt = async (promptId: string, inputVariables?: Record<string, any>, promptData?: Prompt): Promise<string | null> => {
    try {
      const startTime = Date.now();
      const prompt = promptData || prompts.find(p => p.id === promptId);
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

  const copyToPersonalLibrary = async (marketplacePrompt: Prompt): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if user already has this prompt
      const existingPrompt = prompts.find(
        p => p.user_id === user.id && 
        p.name === marketplacePrompt.name && 
        p.prompt_text === marketplacePrompt.prompt_text
      );

      if (existingPrompt) {
        toast.error('You already have this prompt in your library');
        return false;
      }

      // Create a copy in personal library
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          name: marketplacePrompt.name,
          description: marketplacePrompt.description,
          prompt_text: marketplacePrompt.prompt_text,
          category: marketplacePrompt.category,
          tags: marketplacePrompt.tags,
          is_public: false,
          is_template: false,
          is_marketplace: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      setPrompts(prev => [data, ...prev]);
      toast.success('Added to your personal library');
      return true;
    } catch (error) {
      console.error('Error copying to personal library:', error);
      toast.error('Failed to add to library');
      return false;
    }
  };

  useEffect(() => {
    checkAdminStatus();
    loadPrompts();
  }, []);

  return {
    prompts,
    loading,
    isAdmin,
    createPrompt,
    updatePrompt,
    deletePrompt,
    executePrompt,
    sharePrompt,
    submitToMarketplace,
    approvePrompt,
    rejectPrompt,
    sendBackForEditing,
    loadMarketplacePrompts,
    loadPendingPrompts,
    copyToPersonalLibrary,
    refreshPrompts: loadPrompts,
  };
};
