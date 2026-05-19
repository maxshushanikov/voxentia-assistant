import { describe, expect, it } from 'vitest';

import { translationKeys, translations } from '../i18n';

describe('i18n locales', () => {
  it('exposes de and ru with the same keys as en', () => {
    for (const locale of ['de', 'ru'] as const) {
      expect(Object.keys(translations[locale]).sort()).toEqual(translationKeys.sort());
    }
  });

  it('includes core UI strings', () => {
    expect(translations.en.placeholder).toBeTruthy();
    expect(translations.de.greeting).toBeTruthy();
    expect(translations.ru.plugins).toBeTruthy();
  });
});
