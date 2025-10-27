import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Framework {
  id: string;
  name: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const useFrameworks = () => {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFrameworks = async () => {
    try {
      const { data, error } = await supabase
        .from('frameworks')
        .select('*')
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFrameworks(data || []);
    } catch (error) {
      console.error('Error loading frameworks:', error);
      toast.error('Failed to load frameworks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrameworks();
  }, []);

  return {
    frameworks,
    loading,
    refreshFrameworks: loadFrameworks,
  };
};
