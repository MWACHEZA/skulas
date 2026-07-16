import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { en, fr, es, nd, sn } from './locales';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  nd: { translation: nd },
  sn: { translation: sn }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
