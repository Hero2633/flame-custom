import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './locales/zh.json';
import en from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}

const savedLang = localStorage.getItem('flame_lang') || 'zh';

i18n.use(initReactI18next).init({
  resources: {
    zh: {
      translation: zh,
    },
    en: {
      translation: en,
    },
  },
  lng: savedLang,
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: string) => {
  localStorage.setItem('flame_lang', lang);
  i18n.changeLanguage(lang);
};

export default i18n;
