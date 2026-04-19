import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

/**
 * i18next configuration for CrowdIQ.
 * Supports 6 languages: en, hi, es, fr, ar, pt.
 * Arabic (ar) uses RTL layout — direction is set on document.documentElement.dir
 * by the I18nProvider component when language changes.
 * Missing keys fall back to English. Raw keys never shown to users.
 */
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'es', 'fr', 'ar', 'pt'],
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'crowdiq_language',
    },
    interpolation: {
      escapeValue: false,  // React already escapes values
    },
    react: {
      useSuspense: false,  // Disable suspense — we handle loading states manually
    },
  });

export default i18n;

/**
 * Returns the CSS text direction for a given language code.
 * Used by I18nProvider to set document.documentElement.dir.
 */
export function getLanguageDirection(lang: string): 'ltr' | 'rtl' {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
}
