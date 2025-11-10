import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  text_size: 'small' | 'medium' | 'large' | 'x-large';
  font_family: 'default' | 'sans' | 'serif' | 'mono' | 'dyslexic';
  line_spacing: 'compact' | 'normal' | 'relaxed' | 'loose';
  contrast_theme: 'default' | 'high-contrast' | 'yellow-black' | 'black-yellow' | 'white-black' | 'black-white';
  enhance_inputs: boolean;
  default_retention_days: number | null;
  enable_session_timeout: boolean;
}

const defaultPreferences: UserPreferences = {
  text_size: 'medium',
  font_family: 'default',
  line_spacing: 'normal',
  contrast_theme: 'default',
  enhance_inputs: false,
  default_retention_days: null,
  enable_session_timeout: true,
};

export const useUserPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences = defaultPreferences, isLoading } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      if (!user) return defaultPreferences;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          text_size: data.text_size as UserPreferences['text_size'],
          font_family: data.font_family as UserPreferences['font_family'],
          line_spacing: data.line_spacing as UserPreferences['line_spacing'],
          contrast_theme: data.contrast_theme as UserPreferences['contrast_theme'],
          enhance_inputs: data.enhance_inputs,
          default_retention_days: data.default_retention_days,
          enable_session_timeout: data.enable_session_timeout,
        };
      }

      return defaultPreferences;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      if (!user) throw new Error('No user');

      const updatedPreferences = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPreferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      return updatedPreferences;
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['user_preferences', user?.id], updatedPreferences);
    },
  });

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    await updateMutation.mutateAsync(newPreferences);
  };

  const resetPreferences = async () => {
    await updatePreferences(defaultPreferences);
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isLoading,
  };
};
