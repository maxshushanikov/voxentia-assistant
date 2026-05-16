import { Languages, User, Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Language, Speaker, Personality } from '../types';
import { useTranslation } from '../i18n/context';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

const LANG_OPTIONS: { value: Language; key: 'langName_en' | 'langName_de' | 'langName_ru' }[] = [
  { value: 'en', key: 'langName_en' },
  { value: 'de', key: 'langName_de' },
  { value: 'ru', key: 'langName_ru' },
];

const SPEAKER_OPTIONS: { value: Speaker; key: 'speaker_baya' | 'speaker_kseniya' | 'speaker_eugene' | 'speaker_aidar' }[] = [
  { value: 'baya', key: 'speaker_baya' },
  { value: 'kseniya', key: 'speaker_kseniya' },
  { value: 'eugene', key: 'speaker_eugene' },
  { value: 'aidar', key: 'speaker_aidar' },
];

const PERSONALITY_OPTIONS: Personality[] = ['professional', 'friendly', 'academic'];

export default function SettingsDropdown({
  language,
  setLanguage,
  speaker,
  setSpeaker,
  personality,
  setPersonality,
  isOpen,
  setIsOpen,
}: SettingsDropdownProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-[4px] bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
      >
        <Languages className="w-3.5 h-3.5 text-[#2979ff]" />
        <span>{language}</span>
        <span className="w-px h-3 bg-white/10 mx-1" />
        <User className="w-3.5 h-3.5 text-[#2979ff]" />
        <span>{speaker}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#161821] border border-white/10 rounded-[4px] shadow-2xl p-2 z-50">
          <div>
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
              {t.personality}
            </p>
            {PERSONALITY_OPTIONS.map((pers) => (
              <button
                key={pers}
                type="button"
                onClick={() => {
                  setPersonality(pers);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span>{t[`pers_${pers}` as keyof typeof t] as string}</span>
                {personality === pers && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div className="mb-2">
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
              {t.language}
            </p>
            {LANG_OPTIONS.map(({ value, key }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLanguage(value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span>{t[key]}</span>
                {language === value && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div>
            <p className="px-2 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
              {t.voice}
            </p>
            {SPEAKER_OPTIONS.map(({ value, key }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSpeaker(value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-[2px] hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <span>{t[key]}</span>
                {speaker === value && <Check className="w-3 h-3 text-[#2979ff]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
