import { ReactNode, useEffect, useState } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider = ({ children }: AccessibilityProviderProps) => {
  const { preferences, isLoading } = useUserPreferences();
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Listen for preview state changes
  useEffect(() => {
    const checkPreview = () => {
      const previewStyle = document.getElementById('a11y-enhance-inputs-preview');
      setIsPreviewActive(!!previewStyle);
    };
    
    const observer = new MutationObserver(checkPreview);
    observer.observe(document.head, { childList: true });
    checkPreview();
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isLoading || isPreviewActive) return; // Don't apply if preview is active

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

    // Text size (inline so it always wins)
    const sizeMap: Record<typeof preferences.text_size, string> = {
      'small': '90%',
      'medium': '100%',
      'large': '115%',
      'x-large': '135%'
    } as const;
    root.style.fontSize = sizeMap[preferences.text_size];

    // Font family (apply to body for inheritance)
    const familyMap: Record<typeof preferences.font_family, string> = {
      'default': '',
      'sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
      'mono': '"Courier New", Courier, monospace',
      'dyslexic': '"Comic Sans MS", Arial, sans-serif'
    } as const;
    document.body.style.fontFamily = familyMap[preferences.font_family] || '';

    // Line spacing (set at body/root for broad inheritance)
    const lineMap: Record<typeof preferences.line_spacing, string> = {
      'compact': '1.3',
      'normal': '1.6',
      'relaxed': '1.9',
      'loose': '2.2'
    } as const;
    document.body.style.lineHeight = lineMap[preferences.line_spacing];
    root.style.lineHeight = lineMap[preferences.line_spacing];

    // Enhance inputs (inject dynamic style so it applies globally even if CSS order conflicts)
    const styleId = 'a11y-enhance-inputs';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    if (preferences.enhance_inputs) {
      styleEl.textContent = `
      a, button, input, select, textarea, [role="button"], [tabindex="0"] {
        outline: 2px solid hsl(var(--primary) / 0.3) !important;
        outline-offset: 2px;
      }
      a:focus, button:focus, input:focus, select:focus, textarea:focus, [role="button"]:focus, [tabindex="0"]:focus {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px;
      }`;
    } else {
      styleEl.textContent = '';
    }
  }, [preferences, isLoading, isPreviewActive]);

  return <>{children}</>;
};
