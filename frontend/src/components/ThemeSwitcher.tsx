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
    <div className="flex items-center gap-1">
      {THEMES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => setTheme(id)}
          className={`p-2 rounded-[4px] transition-colors ${
            theme === id
              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
      <button
        type="button"
        title={showAvatar ? 'Hide 3D avatar' : 'Show 3D avatar'}
        onClick={() => setShowAvatar(!showAvatar)}
        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-[4px] transition-colors ${
          showAvatar ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        3D
      </button>
    </div>
  );
}
