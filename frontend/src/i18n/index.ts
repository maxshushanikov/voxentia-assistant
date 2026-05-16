import dePlugins from '@i18n/de/plugins.json';
import deUi from '@i18n/de/ui.json';
import enPlugins from '@i18n/en/plugins.json';
import enUi from '@i18n/en/ui.json';
import ruPlugins from '@i18n/ru/plugins.json';
import ruUi from '@i18n/ru/ui.json';

import type { Language } from '../types';

function mergeLocale<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  ui: T,
  plugins: U,
): T & U {
  return { ...ui, ...plugins };
}

const en = mergeLocale(enUi, enPlugins);
const de = mergeLocale(deUi, dePlugins);
const ru = mergeLocale(ruUi, ruPlugins);

export const translations = { en, de, ru } as const;

export type TranslationType = (typeof translations)[Language];

export function getTranslations(language: Language): TranslationType {
  return translations[language];
}

/** Replace `{key}` placeholders in translated strings. */
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/** All locale files must expose the same keys (en is the reference). */
export const translationKeys = Object.keys(en) as (keyof TranslationType)[];
