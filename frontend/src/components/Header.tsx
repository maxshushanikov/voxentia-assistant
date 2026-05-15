import { Menu } from 'lucide-react';
import SettingsDropdown from './SettingsDropdown';
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
  return (
    <div className="h-14 border-b border-white/5 bg-[#0d1117] flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center space-x-3">
         <div className="w-6 h-6 rounded bg-[#2979ff] flex items-center justify-center text-white text-[10px] font-bold">V</div>
         <span className="font-bold uppercase tracking-[0.2em] text-[11px] text-white">Voxentia</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <SettingsDropdown 
          language={language} setLanguage={setLanguage}
          speaker={speaker} setSpeaker={setSpeaker}
          personality={personality} setPersonality={setPersonality}
          isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen}
        />

        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
