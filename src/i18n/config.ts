import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '@/data/locales/en/common.json';
import enLanding from '@/data/locales/en/landing.json';
import frCommon from '@/data/locales/fr/common.json';
import frLanding from '@/data/locales/fr/landing.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
