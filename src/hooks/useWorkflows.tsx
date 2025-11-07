import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  workflow_data: any;
  visibility?: 'private' | 'shared' | 'public';
  version?: number;
  parent_workflow_id?: string;
  is_template?: boolean;
  tags?: string[];
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowShare {
  id: string;
  workflow_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: 'view' | 'edit' | 'execute';
  created_at: string;
}

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data || []) as Workflow[]);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async (workflow: Omit<Workflow, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Workflow | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          ...workflow,
        })
        .select()
        .single();

      if (error) throw error;

      setWorkflows(prev => [data as Workflow, ...prev]);
      toast.success('Workflow created successfully');
      return data as Workflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow');
      return null;
    }
  };

  const updateWorkflow = async (id: string, updates: Partial<Workflow>, showToast = true): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.map(wf =>
        wf.id === id ? { ...wf, ...updates } : wf
      ));
      
      // Only show toast if explicitly requested (for manual user actions)
      if (showToast) {
        toast.success('Workflow updated successfully');
      }
      return true;
    } catch (error) {
      console.error('Error updating workflow:', error);
      if (showToast) {
        toast.error('Failed to update workflow');
      }
      return false;
    }
  };

  const deleteWorkflow = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.filter(wf => wf.id !== id));
      toast.success('Workflow deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
      return false;
    }
  };

  const shareWorkflow = async (workflowId: string, userEmail: string, permission: 'view' | 'edit' | 'execute' = 'view'): Promise<boolean> => {
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
        .from('workflow_shares')
        .insert({
          workflow_id: workflowId,
          shared_with_user_id: targetUser.id,
          shared_by_user_id: user.id,
          permission
        });

      if (error) throw error;

      // Update workflow visibility (without showing toast to avoid spam)
      await updateWorkflow(workflowId, { visibility: 'shared' }, false);

      toast.success('Workflow shared successfully');
      return true;
    } catch (error) {
      console.error('Error sharing workflow:', error);
      toast.error('Failed to share workflow');
      return false;
    }
  };

  const loadPublicWorkflows = async (): Promise<Workflow[]> => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Workflow[];
    } catch (error) {
      console.error('Error loading public workflows:', error);
      return [];
    }
  };

  const cloneWorkflow = async (workflowId: string): Promise<Workflow | null> => {
    try {
      const { data: originalWorkflow, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (fetchError || !originalWorkflow) throw new Error('Workflow not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: `${originalWorkflow.name} (Copy)`,
          description: originalWorkflow.description,
          workflow_data: originalWorkflow.workflow_data,
          parent_workflow_id: workflowId,
          tags: originalWorkflow.tags,
          category: originalWorkflow.category,
        })
        .select()
        .single();

      if (error) throw error;

      setWorkflows(prev => [data as Workflow, ...prev]);
      toast.success('Workflow cloned successfully');
      return data as Workflow;
    } catch (error) {
      console.error('Error cloning workflow:', error);
      toast.error('Failed to clone workflow');
      return null;
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflows'
        },
        (payload) => {
          console.log('Workflow change detected:', payload);
          if (payload.eventType === 'INSERT') {
            setWorkflows(prev => [payload.new as Workflow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setWorkflows(prev => prev.map(wf =>
              wf.id === payload.new.id ? payload.new as Workflow : wf
            ));
          } else if (payload.eventType === 'DELETE') {
            setWorkflows(prev => prev.filter(wf => wf.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    workflows,
    loading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    shareWorkflow,
    loadPublicWorkflows,
    cloneWorkflow,
    refreshWorkflows: loadWorkflows,
  };
};
