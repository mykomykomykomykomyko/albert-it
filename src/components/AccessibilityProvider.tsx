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

    // Apply text size
    root.setAttribute('data-text-size', preferences.text_size);

    // Apply font family
    root.setAttribute('data-font-family', preferences.font_family);

    // Apply line spacing
    root.setAttribute('data-line-spacing', preferences.line_spacing);

    // Apply contrast theme
    root.setAttribute('data-contrast-theme', preferences.contrast_theme);

    // Apply enhance inputs
    root.setAttribute('data-enhance-inputs', preferences.enhance_inputs.toString());

    // Apply contrast theme classes
    if (preferences.contrast_theme !== 'default') {
      root.classList.add('custom-contrast');
    } else {
      root.classList.remove('custom-contrast');
    }
  }, [preferences, isLoading]);

  return <>{children}</>;
};
