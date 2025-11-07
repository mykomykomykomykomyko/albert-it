import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'fr';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  
  const currentLanguage = (i18n.language || 'en').split('-')[0] as Language;
  
  const changeLanguage = async (language: Language) => {
    await i18n.changeLanguage(language);
  };
  
  const toggleLanguage = async () => {
    const newLanguage = currentLanguage === 'en' ? 'fr' : 'en';
    await changeLanguage(newLanguage);
  };
  
  return {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    isEnglish: currentLanguage === 'en',
    isFrench: currentLanguage === 'fr',
  };
};
