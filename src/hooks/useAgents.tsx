import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  description?: string;
  system_prompt: string;
  user_prompt: string;
  icon_name: string;
  created_at: string;
  updated_at: string;
  metadata_tags?: string[];
  profile_picture_url?: string;
  visibility?: 'private' | 'shared' | 'pending_review' | 'published';
  submitted_at?: string;
  reviewed_at?: string;
  reviewer_id?: string;
  is_template?: boolean;
  usage_count?: number;
  rating?: number;
  category?: string;
}

export interface AgentShare {
  id: string;
  agent_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface AgentTemplate {
  name: string;
  type: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  icon_name: string;
  metadata_tags?: string[];
  profile_picture_url?: string;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents((data || []) as Agent[]);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (template: AgentTemplate): Promise<Agent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          ...template,
        })
        .select()
        .single();

      if (error) throw error;
      
      setAgents(prev => [data as Agent, ...prev]);
      toast.success('Agent created successfully');
      return data as Agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
      return null;
    }
  };

  const updateAgent = async (id: string, updates: Partial<Agent>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setAgents(prev => prev.map(agent => 
        agent.id === id ? { ...agent, ...updates } : agent
      ));
      toast.success('Agent updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
      return false;
    }
  };

  const deleteAgent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAgents(prev => prev.filter(agent => agent.id !== id));
      toast.success('Agent deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
      return false;
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const shareAgent = async (agentId: string, userEmail: string, permission: 'view' | 'edit' = 'view'): Promise<boolean> => {
    try {
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !targetUser) {
        toast.error('User not found');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('agent_shares')
        .insert({
          agent_id: agentId,
          shared_with_user_id: targetUser.id,
          shared_by_user_id: user.id,
          permission
        });

      if (error) throw error;

      toast.success('Agent shared successfully');
      return true;
    } catch (error) {
      console.error('Error sharing agent:', error);
      toast.error('Failed to share agent');
      return false;
    }
  };

  const submitForReview = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          visibility: 'pending_review',
          submitted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadAgents();
      toast.success('Agent submitted for review');
      return true;
    } catch (error) {
      console.error('Error submitting agent:', error);
      toast.error('Failed to submit agent');
      return false;
    }
  };

  const loadMarketplaceAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('visibility', 'published')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data || []) as Agent[];
    } catch (error) {
      console.error('Error loading marketplace agents:', error);
      return [];
    }
  };

  return {
    agents,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents: loadAgents,
    shareAgent,
    submitForReview,
    loadMarketplaceAgents,
  };
};
