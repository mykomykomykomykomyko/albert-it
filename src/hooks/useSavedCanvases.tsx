import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SavedCanvas {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  canvas_data: any;
  created_at: string;
  updated_at: string;
}

export const useSavedCanvases = () => {
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvas[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedCanvases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_canvases')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedCanvases(data || []);
    } catch (error) {
      console.error('Error fetching saved canvases:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved canvases',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCanvas = async (name: string, description: string, canvasData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_canvases')
        .insert({
          user_id: user.id,
          name,
          description,
          canvas_data: canvasData,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Canvas saved successfully',
      });

      await fetchSavedCanvases();
    } catch (error) {
      console.error('Error saving canvas:', error);
      toast({
        title: 'Error',
        description: 'Failed to save canvas',
        variant: 'destructive',
      });
    }
  };

  const updateCanvas = async (id: string, name: string, description: string, canvasData: any) => {
    try {
      const { error } = await supabase
        .from('saved_canvases')
        .update({
          name,
          description,
          canvas_data: canvasData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Canvas updated successfully',
      });

      await fetchSavedCanvases();
    } catch (error) {
      console.error('Error updating canvas:', error);
      toast({
        title: 'Error',
        description: 'Failed to update canvas',
        variant: 'destructive',
      });
    }
  };

  const deleteCanvas = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_canvases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Canvas deleted successfully',
      });

      await fetchSavedCanvases();
    } catch (error) {
      console.error('Error deleting canvas:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete canvas',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSavedCanvases();
  }, []);

  return {
    savedCanvases,
    loading,
    saveCanvas,
    updateCanvas,
    deleteCanvas,
    refreshCanvases: fetchSavedCanvases,
  };
};