# Voxentia Frontend

React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Three.js (React Three Fiber).

## Structure

```text
frontend/src/
├── App.tsx              # Main layout, chat flow, TanStack Query
├── components/
│   ├── Avatar.tsx       # 3D avatar (Bounds/Center auto-fit)
│   ├── Sidebar.tsx      # Plugins, history (preview + show all), delete
│   ├── ChatArea.tsx
│   └── ...
├── hooks/
│   ├── useAudioManager.ts   # Web Audio playback + lip-sync analyser
│   └── useChatApi.ts        # React Query mutations
├── api/
│   ├── client.ts        # fetch wrapper + X-Request-ID
│   ├── chat.ts          # API functions
│   └── schema.d.ts      # Generated from OpenAPI
├── i18n/index.ts        # Loads JSON from ../../i18n/locales
└── plugins/             # Plugin UI panels + registry
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (proxies `/api` → :8000) |
| `npm run build` | Production build → `dist/` |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run generate:api` | Regenerate `src/api/schema.d.ts` |

## i18n

UI strings live in **`/i18n/locales/{en,de,ru}/ui.json`** (single source of truth).  
Vite alias: `@i18n` → `../i18n/locales`.

## 3D Avatar

- Models: `/assets/avatar_feminine.glb`, `/assets/avatar_masculine.glb` (served by backend/nginx).
- `@react-three/drei` **Bounds** + **Center** auto-frame the model in the canvas.
- Lip-sync via morph targets (`mouthOpen`, `jawOpen`, etc.) driven by `useAudioManager`.

## History UI

- Sidebar shows up to **8** recent chats by default.
- **Show all** / **Alle anzeigen** expands the full list.
- Hover a chat → trash icon → `DELETE /api/sessions/{id}`.
- When expanded: **Delete all** clears every session.

## Docker build

Uses `deployment/docker/frontend.Dockerfile` (Node **22** — required by Vite 8):

- Copies `frontend/.npmrc` (legacy-peer-deps) before `npm ci`
- Copies `i18n/` for locale JSON imports
- Nginx serves `dist/` on port 80

## Local development

```bash
npm install
npm run dev
```

Ensure the backend is running on port 8000 (or adjust `vite.config.ts` proxy).
