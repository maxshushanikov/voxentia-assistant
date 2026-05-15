import { Languages, User, Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Language, Speaker, Personality } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { translations } from '../translations';

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
  isOpen, setIsOpen
}: SettingsDropdownProps) {
  const t = translations[language];
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-[4px] bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
      >
        <Languages className="w-3.5 h-3.5 text-[#2979ff]" />
        <span>{language}</span>
        <span className="w-px h-3 bg-white/10 mx-1"></span>
        <User className="w-3.5 h-3.5 text-[#2979ff]" />
        <span>{speaker}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#161821] border border-white/10 rounded-[4px] shadow-2xl p-2 z-50">
          <div>
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{t.personality}</p>
            {(['professional', 'friendly', 'academic'] as const).map((pers) => (
              <button 
                key={pers}
                onClick={() => { setPersonality(pers); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span className="capitalize">{pers}</span>
                {personality === pers && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>
          
          <div className="h-px bg-white/5 my-1"></div>
          
          <div className="mb-2">
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{t.language}</p>
            {(['en', 'de', 'ru'] as const).map((lang) => (
              <button 
                key={lang}
                onClick={() => { setLanguage(lang); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span className="uppercase">{lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : 'Russian'}</span>
                {language === lang && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/5 my-1"></div>

          <div>
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{t.voice}</p>
            {(['baya', 'kseniya', 'eugene', 'aidar'] as const).map((spk) => (
              <button 
                key={spk}
                onClick={() => { setSpeaker(spk); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span className="capitalize">{spk}</span>
                {speaker === spk && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
