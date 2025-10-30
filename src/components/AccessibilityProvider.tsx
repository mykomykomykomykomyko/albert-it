import { ReactNode, useEffect } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider = ({ children }: AccessibilityProviderProps) => {
  const { preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;

    // Apply data attributes for preferences
    root.setAttribute('data-text-size', preferences.text_size);
    root.setAttribute('data-font-family', preferences.font_family);
    root.setAttribute('data-line-spacing', preferences.line_spacing);
    root.setAttribute('data-contrast-theme', preferences.contrast_theme);
    root.setAttribute('data-enhance-inputs', preferences.enhance_inputs.toString());

    // Inline CSS variable overrides for contrast themes (highest precedence)
    const themeVarsMap: Record<string, Record<string, string>> = {
      'high-contrast': {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
        '--card': '0 0% 5%',
        '--card-foreground': '0 0% 100%',
        '--primary': '0 0% 100%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '0 0% 90%',
        '--border': '0 0% 30%'
      },
      'yellow-black': {
        '--background': '60 100% 50%',
        '--foreground': '0 0% 0%',
        '--card': '60 100% 45%',
        '--card-foreground': '0 0% 0%',
        '--primary': '0 0% 0%',
        '--primary-foreground': '60 100% 50%',
        '--muted': '60 100% 40%',
        '--muted-foreground': '0 0% 20%',
        '--border': '0 0% 20%'
      },
      'black-yellow': {
        '--background': '0 0% 0%',
        '--foreground': '60 100% 50%',
        '--card': '0 0% 5%',
        '--card-foreground': '60 100% 50%',
        '--primary': '60 100% 50%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '60 100% 40%',
        '--border': '60 100% 30%'
      },
      'white-black': {
        '--background': '0 0% 100%',
        '--foreground': '0 0% 0%',
        '--card': '0 0% 98%',
        '--card-foreground': '0 0% 0%',
        '--primary': '0 0% 0%',
        '--primary-foreground': '0 0% 100%',
        '--muted': '0 0% 95%',
        '--muted-foreground': '0 0% 30%',
        '--border': '0 0% 80%'
      },
      'black-white': {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
        '--card': '0 0% 5%',
        '--card-foreground': '0 0% 100%',
        '--primary': '0 0% 100%',
        '--primary-foreground': '0 0% 0%',
        '--muted': '0 0% 10%',
        '--muted-foreground': '0 0% 80%',
        '--border': '0 0% 30%'
      }
    };

    const applyThemeVars = (vars?: Record<string, string>) => {
      const keys = ['--background','--foreground','--card','--card-foreground','--primary','--primary-foreground','--muted','--muted-foreground','--border'];
      if (vars) {
        keys.forEach((k) => vars[k] && root.style.setProperty(k, vars[k]!));
      } else {
        keys.forEach((k) => root.style.removeProperty(k));
      }
    };

    if (preferences.contrast_theme && preferences.contrast_theme !== 'default') {
      applyThemeVars(themeVarsMap[preferences.contrast_theme]);
      root.classList.add('custom-contrast');
    } else {
      applyThemeVars(undefined);
      root.classList.remove('custom-contrast');
    }
  }, [preferences, isLoading]);

  return <>{children}</>;
};
