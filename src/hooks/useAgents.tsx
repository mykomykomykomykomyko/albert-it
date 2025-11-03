/**
 * useAgents Hook - Agent Management and Operations
 * 
 * This hook provides comprehensive agent management functionality including
 * CRUD operations, sharing, marketplace interactions, and template management.
 * 
 * Features:
 * - Create, read, update, delete agents
 * - Share agents with other users
 * - Submit agents to marketplace
 * - Clone marketplace agents
 * - Manage agent templates
 * - Track agent usage and ratings
 * 
 * Agent System Overview:
 * 
 * An "Agent" in Albert is a customizable AI persona with:
 * - Unique personality and behavior (system prompt)
 * - Specific capabilities and tools
 * - Custom profile picture
 * - Metadata tags for categorization
 * - Visibility settings (private, shared, published)
 * 
 * Agent Lifecycle:
 * 1. Created by user (private by default)
 * 2. Can be shared with specific users
 * 3. Can be submitted for marketplace review (pending_review)
 * 4. Once approved, becomes published in marketplace
 * 5. Other users can clone published agents
 * 
 * Usage:
 * ```tsx
 * const {
 *   agents,
 *   loading,
 *   createAgent,
 *   updateAgent,
 *   deleteAgent,
 *   shareAgent,
 *   submitToMarketplace
 * } = useAgents();
 * ```
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Agent entity structure
 */
export interface Agent {
  id: string;
  user_id: string; // Owner of the agent
  name: string; // Display name
  type: string; // Agent type/category
  description?: string; // Human-readable description
  system_prompt: string; // Instructions for AI behavior
  user_prompt: string; // Default user-facing prompt
  icon_name: string; // Lucide icon name
  created_at: string;
  updated_at: string;
  metadata_tags?: string[]; // Categorization tags
  profile_picture_url?: string; // AI-generated or custom profile image
  visibility?: 'private' | 'shared' | 'pending_review' | 'published'; // Access control
  submitted_at?: string; // When submitted to marketplace
  reviewed_at?: string; // When marketplace review completed
  reviewer_id?: string; // Who reviewed the submission
  is_template?: boolean; // Whether this is a system template
  usage_count?: number; // How many times agent has been used
  rating?: number; // Average user rating (0-5)
  category?: string; // Primary category
}

/**
 * Agent sharing structure
 * Allows agents to be shared with specific users
 */
export interface AgentShare {
  id: string;
  agent_id: string; // Agent being shared
  shared_with_user_id: string; // Recipient user
  shared_by_user_id: string; // Sharing user
  permission: 'view' | 'edit'; // Access level
  created_at: string;
}

/**
 * Agent template structure
 * Used for creating pre-configured agent templates
 */
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
      // Use RPC function to look up user by email (bypasses RLS)
      const { data: targetUserId, error: userError } = await supabase
        .rpc('get_user_id_by_email', { _email: userEmail });

      if (userError || !targetUserId) {
        toast.error('User not found. Make sure the email is registered.');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if already shared
      const { data: existingShare } = await supabase
        .from('agent_shares')
        .select('id')
        .eq('agent_id', agentId)
        .eq('shared_with_user_id', targetUserId)
        .maybeSingle();

      if (existingShare) {
        toast.error('Agent already shared with this user');
        return false;
      }

      // Update agent visibility to 'shared' if it's not already
      const { error: visibilityError } = await supabase
        .from('agents')
        .update({ visibility: 'shared' })
        .eq('id', agentId)
        .eq('user_id', user.id);

      if (visibilityError) throw visibilityError;

      // Create the share record
      const { error } = await supabase
        .from('agent_shares')
        .insert({
          agent_id: agentId,
          shared_with_user_id: targetUserId,
          shared_by_user_id: user.id,
          permission
        });

      if (error) throw error;

      // Refresh agents to show updated visibility
      await loadAgents();

      toast.success('Agent shared successfully');
      return true;
    } catch (error: any) {
      console.error('Error sharing agent:', error);
      toast.error(error.message || 'Failed to share agent');
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
