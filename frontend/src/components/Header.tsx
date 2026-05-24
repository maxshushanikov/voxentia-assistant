import { Command, Menu } from 'lucide-react';

import { useAppStore } from '../store/appStore';

import ExportMenu from './ExportMenu';
import ModelSelect from './ModelSelect';
import SettingsDropdown from './SettingsDropdown';
import ThemeSwitcher from './ThemeSwitcher';
import type { Language, Speaker, Personality } from '../types';

interface HeaderProps {
  onOpenSidebar: () => void;
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (o: boolean) => void;
}

export default function Header({
  onOpenSidebar,
  language, setLanguage,
  speaker, setSpeaker,
  personality, setPersonality,
  isSettingsOpen, setIsSettingsOpen
}: HeaderProps) {
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen);

  return (
    <div className="app-header h-14 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center space-x-3">
         <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center text-[var(--text-on-accent)] text-[10px] font-bold">V</div>
         <span className="font-bold uppercase tracking-[0.2em] text-[11px] text-[var(--text-primary)]">Voxentia</span>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setCommandBarOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border border-black/10 dark:border-white/10 rounded-[4px] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] transition-colors"
          title="Command Bar (Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5" />
          <span>Ctrl+K</span>
        </button>
        <ModelSelect />
        <ThemeSwitcher />
        <ExportMenu />
        <SettingsDropdown 
          language={language} setLanguage={setLanguage}
          speaker={speaker} setSpeaker={setSpeaker}
          personality={personality} setPersonality={setPersonality}
          isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen}
        />

        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
