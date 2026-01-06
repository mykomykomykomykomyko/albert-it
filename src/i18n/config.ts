import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files - English
import enCommon from '@/data/locales/en/common.json';
import enLanding from '@/data/locales/en/landing.json';
import enAuth from '@/data/locales/en/auth.json';
import enChat from '@/data/locales/en/chat.json';
import enAgents from '@/data/locales/en/agents.json';
import enStage from '@/data/locales/en/stage.json';
import enImage from '@/data/locales/en/image.json';
import enVoice from '@/data/locales/en/voice.json';
import enTranscripts from '@/data/locales/en/transcripts.json';
import enCanvas from '@/data/locales/en/canvas.json';
import enMarketplace from '@/data/locales/en/marketplace.json';
import enPrompts from '@/data/locales/en/prompts.json';
import enFramework from '@/data/locales/en/framework.json';
import enSavedWork from '@/data/locales/en/savedWork.json';
import enFiles from '@/data/locales/en/files.json';
import enDocs from '@/data/locales/en/docs.json';
import enAdmin from '@/data/locales/en/admin.json';
import enHelper from '@/data/locales/en/helper.json';
import enFreeAgent from '@/data/locales/en/freeAgent.json';

// Import translation files - French
import frCommon from '@/data/locales/fr/common.json';
import frLanding from '@/data/locales/fr/landing.json';
import frAuth from '@/data/locales/fr/auth.json';
import frChat from '@/data/locales/fr/chat.json';
import frAgents from '@/data/locales/fr/agents.json';
import frStage from '@/data/locales/fr/stage.json';
import frImage from '@/data/locales/fr/image.json';
import frVoice from '@/data/locales/fr/voice.json';
import frTranscripts from '@/data/locales/fr/transcripts.json';
import frCanvas from '@/data/locales/fr/canvas.json';
import frMarketplace from '@/data/locales/fr/marketplace.json';
import frPrompts from '@/data/locales/fr/prompts.json';
import frFramework from '@/data/locales/fr/framework.json';
import frSavedWork from '@/data/locales/fr/savedWork.json';
import frFiles from '@/data/locales/fr/files.json';
import frDocs from '@/data/locales/fr/docs.json';
import frAdmin from '@/data/locales/fr/admin.json';
import frHelper from '@/data/locales/fr/helper.json';
import frFreeAgent from '@/data/locales/fr/freeAgent.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    chat: enChat,
    agents: enAgents,
    stage: enStage,
    image: enImage,
    voice: enVoice,
    transcripts: enTranscripts,
    canvas: enCanvas,
    marketplace: enMarketplace,
    prompts: enPrompts,
    framework: enFramework,
    savedWork: enSavedWork,
    files: enFiles,
    docs: enDocs,
    admin: enAdmin,
    helper: enHelper,
    freeAgent: enFreeAgent,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
    auth: frAuth,
    chat: frChat,
    agents: frAgents,
    stage: frStage,
    image: frImage,
    voice: frVoice,
    transcripts: frTranscripts,
    canvas: frCanvas,
    marketplace: frMarketplace,
    prompts: frPrompts,
    framework: frFramework,
    savedWork: frSavedWork,
    files: frFiles,
    docs: frDocs,
    admin: frAdmin,
    helper: frHelper,
    freeAgent: frFreeAgent,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'chat', 'agents', 'stage', 'image', 'voice', 'transcripts', 'canvas', 'marketplace', 'prompts', 'framework', 'savedWork', 'files', 'docs', 'admin', 'helper', 'freeAgent'],
    
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
