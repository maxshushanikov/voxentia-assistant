import { Moon, Sun, Sparkles } from 'lucide-react';

import { useAppStore, type Theme } from '../store/appStore';

const THEMES: { id: Theme; icon: typeof Moon; label: string }[] = [
  { id: 'dark',  icon: Moon,     label: 'Dark'  },
  { id: 'light', icon: Sun,      label: 'Light' },
  { id: 'glass', icon: Sparkles, label: 'Glass' },
];

export default function ThemeSwitcher() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const showAvatar = useAppStore((s) => s.showAvatar);
  const setShowAvatar = useAppStore((s) => s.setShowAvatar);

  return (
    <div className="flex items-center gap-1 rounded-[18px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] p-[6px] shadow-[0_20px_60px_-40px_rgba(15,23,42,0.75)]">
      {THEMES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => setTheme(id)}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
            theme === id
              ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.1)]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
      <span className="w-px h-6 bg-[rgba(255,255,255,0.12)] mx-1" />
      <button
        type="button"
        title={showAvatar ? 'Hide 3D avatar' : 'Show 3D avatar'}
        onClick={() => setShowAvatar(!showAvatar)}
        className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] rounded-full transition-all duration-200 ${
          showAvatar
            ? 'bg-[rgba(56,189,248,0.15)] text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.1)]'
        }`}
      >
        3D
      </button>
    </div>
  );
}
