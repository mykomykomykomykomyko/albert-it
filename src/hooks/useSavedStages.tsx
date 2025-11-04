import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SavedStage {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  stage_data: any;
  created_at: string;
  updated_at: string;
}

export const useSavedStages = () => {
  const [savedStages, setSavedStages] = useState<SavedStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedStages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_stages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedStages(data || []);
    } catch (error) {
      console.error('Error fetching saved stages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved stages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStage = async (name: string, description: string, stageData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_stages')
        .insert({
          user_id: user.id,
          name,
          description,
          stage_data: stageData,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage saved successfully',
      });

      await fetchSavedStages();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to save stage',
        variant: 'destructive',
      });
    }
  };

  const updateStage = async (id: string, name: string, description: string, stageData: any) => {
    try {
      const { error } = await supabase
        .from('saved_stages')
        .update({
          name,
          description,
          stage_data: stageData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage updated successfully',
      });

      await fetchSavedStages();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stage',
        variant: 'destructive',
      });
    }
  };

  const deleteStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stage deleted successfully',
      });

      await fetchSavedStages();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete stage',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSavedStages();
  }, []);

  return {
    savedStages,
    loading,
    saveStage,
    updateStage,
    deleteStage,
    refreshStages: fetchSavedStages,
  };
};