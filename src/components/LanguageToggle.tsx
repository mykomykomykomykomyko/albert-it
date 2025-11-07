import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

interface LanguageToggleProps {
  variant?: "default" | "ghost" | "outline";
  showIcon?: boolean;
  showFullText?: boolean;
}

export const LanguageToggle = ({ 
  variant = "ghost", 
  showIcon = true,
  showFullText = false 
}: LanguageToggleProps) => {
  const { currentLanguage, toggleLanguage } = useLanguage();
  const { t } = useTranslation('common');
  
  const displayText = showFullText 
    ? t(`language.${currentLanguage === 'en' ? 'fr' : 'en'}`)
    : currentLanguage.toUpperCase();
  
  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleLanguage}
      title={t('language.switchTo', { 
        language: t(`language.${currentLanguage === 'en' ? 'fr' : 'en'}`) 
      })}
      aria-label={t('common:aria.languageSelector')}
      className="hover:bg-accent text-foreground"
    >
      {showIcon ? (
        <Languages className="h-5 w-5" />
      ) : (
        <span className="text-sm font-medium">{displayText}</span>
      )}
    </Button>
  );
};
