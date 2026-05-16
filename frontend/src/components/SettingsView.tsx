import { User, Shield, Bell, Volume2, Moon } from 'lucide-react';
import type { Language, Speaker, Personality } from '../types';
import { useTranslation } from '../i18n/context';

interface SettingsViewProps {
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
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

export default function SettingsView({
  language,
  setLanguage,
  speaker,
  setSpeaker,
  personality,
  setPersonality,
}: SettingsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-white mb-2">{t.settings}</h1>
        <p className="text-gray-500 text-sm">{t.settings_customize}</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <section className="glass-card rounded-[8px] p-8 border border-white/5">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 text-[#2979ff] mr-3" />
            <h3 className="text-lg font-medium text-white">{t.settings_identityVoice}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {t.language}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
              >
                {LANG_OPTIONS.map(({ value, key }) => (
                  <option key={value} value={value} className="bg-[#161821]">
                    {t[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {t.voice}
              </label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value as Speaker)}
                className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
              >
                {SPEAKER_OPTIONS.map(({ value, key }) => (
                  <option key={value} value={value} className="bg-[#161821]">
                    {t[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {t.personality}
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value as Personality)}
                className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
              >
                {PERSONALITY_OPTIONS.map((pers) => (
                  <option key={pers} value={pers} className="bg-[#161821]">
                    {t[`pers_${pers}` as keyof typeof t] as string}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[8px] p-8 border border-white/5">
          <div className="flex items-center mb-6">
            <Shield className="w-5 h-5 text-emerald-500 mr-3" />
            <h3 className="text-lg font-medium text-white">{t.settings_securityPrivacy}</h3>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              icon={<Bell className="w-4 h-4" />}
              label={t.settings_notifications}
              description={t.settings_notificationsDesc}
              defaultChecked
            />
            <ToggleSetting
              icon={<Volume2 className="w-4 h-4" />}
              label={t.settings_audioOutput}
              description={t.settings_audioOutputDesc}
              defaultChecked
            />
            <ToggleSetting
              icon={<Moon className="w-4 h-4" />}
              label={t.settings_darkMode}
              description={t.settings_darkModeDesc}
              defaultChecked
            />
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            className="px-8 py-3 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 uppercase tracking-widest"
          >
            {t.common_saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  icon,
  label,
  description,
  defaultChecked,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/2 rounded-[4px] border border-white/5">
      <div className="flex items-center space-x-4">
        <div className="text-gray-500">{icon}</div>
        <div>
          <p className="text-sm text-white font-medium">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#2979ff] focus:ring-[#2979ff]"
      />
    </div>
  );
}
