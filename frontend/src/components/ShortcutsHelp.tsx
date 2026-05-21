import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { useAppStore } from '../store/appStore';

const SHORTCUTS = [
  { keys: 'Ctrl+K / Cmd+K', desc: 'Command Bar öffnen' },
  { keys: 'Ctrl+Shift+N', desc: 'Neue Session' },
  { keys: 'Ctrl+/', desc: 'Tastenkürzel-Übersicht' },
  { keys: 'Alt+1 … Alt+8', desc: 'Plugin-Views direkt öffnen' },
  { keys: 'Esc', desc: 'Modals schließen' },
];

export default function ShortcutsHelp() {
  const open = useAppStore((s) => s.shortcutsHelpOpen);
  const setOpen = useAppStore((s) => s.setShortcutsHelpOpen);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-card max-w-md w-full rounded-[12px] border border-black/10 dark:border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Tastenkürzel</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="space-y-3">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex justify-between gap-4 text-sm">
              <kbd className="text-[var(--accent)] font-mono text-xs shrink-0">{s.keys}</kbd>
              <span className="text-[var(--text-secondary)] text-right">{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
