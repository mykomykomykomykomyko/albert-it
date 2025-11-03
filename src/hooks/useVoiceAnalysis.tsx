import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoiceAnalysisResult {
  id: string;
  user_id: string;
  original_filename: string;
  transcription?: string;
  analysis?: string;
  audio_storage_path?: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}

export const useVoiceAnalysis = () => {
  const [results, setResults] = useState<VoiceAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_analysis_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading voice results:', error);
      toast.error('Failed to load voice analysis results');
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async (
    filename: string,
    transcription: string,
    analysis: string,
    model: string,
    storagePath?: string
  ): Promise<VoiceAnalysisResult | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('voice_analysis_results')
        .insert({
          user_id: user.id,
          original_filename: filename,
          transcription,
          analysis,
          audio_storage_path: storagePath,
          model_used: model,
        })
        .select()
        .single();

      if (error) throw error;
      setResults(prev => [data, ...prev]);
      toast.success('Voice analysis saved');
      return data;
    } catch (error) {
      console.error('Error saving voice result:', error);
      toast.error('Failed to save voice analysis');
      return null;
    }
  };

  const deleteResult = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voice_analysis_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setResults(prev => prev.filter(r => r.id !== id));
      toast.success('Voice analysis deleted');
      return true;
    } catch (error) {
      console.error('Error deleting voice result:', error);
      toast.error('Failed to delete voice analysis');
      return false;
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  return {
    results,
    loading,
    saveResult,
    deleteResult,
    refreshResults: loadResults,
  };
};
