import { useState } from 'react';
import { 
  Command, 
  Menu, 
  ChevronDown, 
  Smile, 
  BookOpen, 
  Code, 
  Compass, 
  Heart, 
  Shield 
} from 'lucide-react';

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

const personaConfig: Record<Personality, { label: string; icon: any; color: string }> = {
  professional: { label: 'Professional', icon: <Shield className="w-3.5 h-3.5" />, color: 'var(--accent)' },
  friendly: { label: 'Friendly', icon: <Smile className="w-3.5 h-3.5" />, color: '#10b981' },
  academic: { label: 'Academic', icon: <BookOpen className="w-3.5 h-3.5" />, color: '#3b82f6' },
  developer: { label: 'Developer', icon: <Code className="w-3.5 h-3.5" />, color: '#f59e0b' },
  teacher: { label: 'Teacher', icon: <BookOpen className="w-3.5 h-3.5" />, color: '#10b981' },
  coach: { label: 'Coach', icon: <Compass className="w-3.5 h-3.5" />, color: '#ec4899' },
  therapist: { label: 'Therapist', icon: <Heart className="w-3.5 h-3.5" />, color: '#8b5cf6' },
};

export default function Header({
  onOpenSidebar,
  language, setLanguage,
  speaker, setSpeaker,
  personality, setPersonality,
  isSettingsOpen, setIsSettingsOpen
}: HeaderProps) {
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen);
  const setActivePlugin = useAppStore((s) => s.setActivePlugin);
  const setMessages = useAppStore((s) => s.setMessages);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const activePersona = personaConfig[personality] || personaConfig.professional;

  return (
    <div className="app-header h-16 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(12,18,34,0.78)] backdrop-blur-[18px] shadow-[0_24px_80px_-52px_rgba(0,0,0,0.7)] flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center space-x-4">
        <button type="button" onClick={() => { setActivePlugin(null); setMessages(() => []); }} className="flex items-center gap-3 rounded-2xl bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.2)] px-3 py-2 transition-all hover:bg-[rgba(56,189,248,0.16)]">
          <div className="w-8 h-8 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--text-on-accent)] text-[12px] font-black">V</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] uppercase tracking-[0.3em] text-[var(--accent)]">Voxentia</span>
            <span className="text-[11px] text-[var(--text-secondary)]">Premium AI workspace</span>
          </div>
        </button>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setCommandBarOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-primary)] border border-[rgba(255,255,255,0.12)] rounded-[14px] bg-[rgba(255,255,255,0.04)] hover:border-[var(--accent)]/60 transition-all"
          title="Command Bar (Ctrl+K)"
        >
          <Command className="w-4 h-4" />
          <span>Ctrl+K</span>
        </button>

        {/* Dynamic Persona Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 border border-white/10 dark:border-white/10 rounded-[14px] bg-black/5 dark:bg-white/5 hover:border-[var(--accent)] text-xs text-[var(--text-primary)] font-medium transition-all cursor-pointer"
            title="Wähle eine Persona"
          >
            <span style={{ color: activePersona.color }}>{activePersona.icon}</span>
            <span className="hidden md:inline">{activePersona.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
          
          {personaDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-white/10 dark:border-white/10 bg-[rgba(12,18,34,0.95)] backdrop-blur-[20px] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
              {Object.entries(personaConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setPersonality(key as Personality);
                    setPersonaDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs text-left cursor-pointer transition-all
                    ${personality === key 
                      ? 'bg-[var(--accent)]/15 text-[var(--text-primary)] font-medium border-l-2 border-[var(--accent)]' 
                      : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
