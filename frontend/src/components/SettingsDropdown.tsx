import { Languages, User, Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { Language, Speaker, Personality } from '../types';
import { useTranslation } from '../i18n/context';
import { cn } from '../utils/cn';
import { LANG_OPTIONS, SPEAKER_OPTIONS, PERSONALITY_OPTIONS } from '../config/options';

interface SettingsDropdownProps {
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
}

export default function SettingsDropdown({
  language, setLanguage,
  speaker, setSpeaker,
  personality, setPersonality,
  isOpen, setIsOpen,
}: SettingsDropdownProps) {
  const { t } = useTranslation();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const close = () => setIsOpen(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) close();
    }
    if (isOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-[4px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Languages className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>{language}</span>
        <span className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1" />
        <User className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>{speaker}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 rounded-[4px] shadow-2xl p-2 z-50">

          {/* Personality */}
          <p className="px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
            {t.personality}
          </p>
          {PERSONALITY_OPTIONS.map((pers) => (
            <button
              key={pers}
              type="button"
              onClick={() => { setPersonality(pers); close(); }}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>{t[`pers_${pers}` as keyof typeof t] as string}</span>
              {personality === pers && <Check className="w-3 h-3 text-[var(--accent)]" />}
            </button>
          ))}

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* Language */}
          <p className="px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
            {t.language}
          </p>
          {LANG_OPTIONS.map(({ value, key }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setLanguage(value); close(); }}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>{t[key]}</span>
              {language === value && <Check className="w-3 h-3 text-[var(--accent)]" />}
            </button>
          ))}

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* Voice */}
          <p className="px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
            {t.voice}
          </p>
          {SPEAKER_OPTIONS.map(({ value, key }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSpeaker(value); close(); }}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>{t[key]}</span>
              {speaker === value && <Check className="w-3 h-3 text-[var(--accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
