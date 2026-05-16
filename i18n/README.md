# Internationalization (i18n)

All UI strings live in `locales/{en,de,ru}/ui.json`. The frontend loads them via `frontend/src/i18n/index.ts` (Vite alias `@i18n`).

When adding a string:

1. Add the key to `locales/en/ui.json`
2. Mirror the key in `de/ui.json` and `ru/ui.json`
3. Run `npm run test` in `frontend/` (the i18n test checks key parity)
