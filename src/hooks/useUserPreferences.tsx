import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  text_size: 'small' | 'medium' | 'large' | 'x-large';
  font_family: 'default' | 'sans' | 'serif' | 'mono' | 'dyslexic';
  line_spacing: 'compact' | 'normal' | 'relaxed' | 'loose';
  contrast_theme: 'default' | 'high-contrast' | 'yellow-black' | 'black-yellow' | 'white-black' | 'black-white';
  enhance_inputs: boolean;
  default_retention_days: number | null;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    text_size: 'medium',
    font_family: 'default',
    line_spacing: 'normal',
    contrast_theme: 'default',
    enhance_inputs: false,
    default_retention_days: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          text_size: data.text_size as UserPreferences['text_size'],
          font_family: data.font_family as UserPreferences['font_family'],
          line_spacing: data.line_spacing as UserPreferences['line_spacing'],
          contrast_theme: data.contrast_theme as UserPreferences['contrast_theme'],
          enhance_inputs: data.enhance_inputs,
          default_retention_days: data.default_retention_days,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
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
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const resetPreferences = async () => {
    const defaultPrefs: UserPreferences = {
      text_size: 'medium',
      font_family: 'default',
      line_spacing: 'normal',
      contrast_theme: 'default',
      enhance_inputs: false,
      default_retention_days: null,
    };
    await updatePreferences(defaultPrefs);
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isLoading,
  };
};
