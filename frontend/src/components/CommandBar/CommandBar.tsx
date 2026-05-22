import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

import { useTranslation } from '../../i18n/context';
import { cn } from '../../utils/cn';
import { fuzzyMatch } from '../../utils/parseEmotion';
import { useAppStore } from '../../store/appStore';
import { useCommandRegistry, type Command } from './useCommandRegistry';

const CATEGORY_ORDER = ['plugin', 'personality', 'session', 'ui', 'model'] as const;

function categoryLabel(
  category: Command['category'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const map: Record<Command['category'], string> = {
    plugin: t.command_category_plugin,
    ui: t.command_category_ui,
    session: t.command_category_session,
    personality: t.command_category_personality,
    model: 'Model',
  };
  return map[category] ?? category;
}

export default function CommandBar() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.commandBarOpen);
  const setOpen = useAppStore((s) => s.setCommandBarOpen);
  const commands = useCommandRegistry();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((cmd) => ({
        cmd,
        score: Math.max(
          fuzzyMatch(query, cmd.keywords),
          fuzzyMatch(query, [cmd.label]),
        ),
      }))
      .filter((x) => x.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.cmd);
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups: { category: Command['category']; items: Command[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((c) => c.category === cat);
      if (items.length) groups.push({ category: cat, items });
    }
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flatFiltered.length - 1)));
  }, [flatFiltered.length]);

  if (!open) return null;

  const runActive = () => {
    const cmd = flatFiltered[activeIndex];
    if (cmd) cmd.action();
  };

  let rowIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl glass-card rounded-[12px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5">
          <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runActive();
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder={t.command_search_placeholder}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
          />
          <kbd className="text-[10px] text-[var(--text-secondary)] border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[320px] overflow-y-auto custom-scrollbar py-2">
          {flatFiltered.length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--text-secondary)] text-center">
              {t.command_no_results}
            </li>
          ) : (
            grouped.map((group) => (
              <li key={group.category}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {categoryLabel(group.category, t)}
                </p>
                {group.items.map((cmd) => {
                  const idx = rowIndex++;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => cmd.action()}
                      className={cn(
                        'w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors',
                        idx === activeIndex
                          ? 'bg-[var(--accent)]/15 text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5',
                      )}
                    >
                      <span>{cmd.label}</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-60">
                        {cmd.shortcut ?? cmd.category}
                      </span>
                    </button>
                  );
                })}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
