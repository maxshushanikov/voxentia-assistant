import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Language } from '../types';
import { getTranslations, type TranslationType } from './index';

interface I18nContextValue {
  language: Language;
  t: TranslationType;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      language,
      t: getTranslations(language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return ctx;
}
