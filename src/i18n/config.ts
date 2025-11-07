import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '@/data/locales/en/common.json';
import enLanding from '@/data/locales/en/landing.json';
import enAuth from '@/data/locales/en/auth.json';
import enChat from '@/data/locales/en/chat.json';
import frCommon from '@/data/locales/fr/common.json';
import frLanding from '@/data/locales/fr/landing.json';
import frAuth from '@/data/locales/fr/auth.json';
import frChat from '@/data/locales/fr/chat.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    chat: enChat,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
    auth: frAuth,
    chat: frChat,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'chat'],
    
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
