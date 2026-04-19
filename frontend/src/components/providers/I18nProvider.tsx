import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { getLanguageDirection } from '@/lib/i18n';

function applyDocumentLanguage(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = getLanguageDirection(lang);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

    const handleLanguageChanged = (lang: string) => {
      applyDocumentLanguage(lang);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
