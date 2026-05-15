import { User, Shield, Bell, Volume2, Moon } from 'lucide-react';
import type { Language, Speaker, Personality } from '../types';
import { translations } from '../translations';

interface SettingsViewProps {
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
}

export default function SettingsView({
  language, setLanguage,
  speaker, setSpeaker,
  personality, setPersonality
}: SettingsViewProps) {
  const t = translations[language];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-white mb-2">{t.settings}</h1>
        <p className="text-gray-500 text-sm">Customize your Voxentia experience.</p>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Profile & Identity */}
        <section className="glass-card rounded-[8px] p-8 border border-white/5">
           <div className="flex items-center mb-6">
              <User className="w-5 h-5 text-[#2979ff] mr-3" />
              <h3 className="text-lg font-medium text-white">Identity & Voice</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.language}</label>
                 <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
                 >
                    <option value="en" className="bg-[#161821]">English</option>
                    <option value="de" className="bg-[#161821]">Deutsch</option>
                    <option value="ru" className="bg-[#161821]">Русский</option>
                 </select>
              </div>

              <div className="space-y-4">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.voice}</label>
                 <select 
                    value={speaker} 
                    onChange={(e) => setSpeaker(e.target.value as Speaker)}
                    className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
                 >
                    <option value="baya" className="bg-[#161821]">Baya (Feminine)</option>
                    <option value="xenia" className="bg-[#161821]">Xenia (Feminine)</option>
                    <option value="eugene" className="bg-[#161821]">Eugene (Masculine)</option>
                 </select>
              </div>

              <div className="space-y-4">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.personality}</label>
                 <select 
                    value={personality} 
                    onChange={(e) => setPersonality(e.target.value as Personality)}
                    className="w-full bg-white/5 border border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2979ff] transition-colors"
                 >
                    <option value="professional" className="bg-[#161821]">Professional</option>
                    <option value="friendly" className="bg-[#161821]">Friendly</option>
                    <option value="creative" className="bg-[#161821]">Creative</option>
                 </select>
              </div>
           </div>
        </section>

        {/* System Settings */}
        <section className="glass-card rounded-[8px] p-8 border border-white/5">
           <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-emerald-500 mr-3" />
              <h3 className="text-lg font-medium text-white">Security & Privacy</h3>
           </div>
           
           <div className="space-y-4">
              <ToggleSetting icon={<Bell className="w-4 h-4" />} label="Desktop Notifications" description="Receive alerts for upcoming events and task reminders." defaultChecked={true} />
              <ToggleSetting icon={<Volume2 className="w-4 h-4" />} label="Audio Output" description="Enable spoken responses from the AI assistant." defaultChecked={true} />
              <ToggleSetting icon={<Moon className="w-4 h-4" />} label="Dark Mode" description="Automatically adjust UI based on system theme." defaultChecked={true} />
           </div>
        </section>

        <div className="flex justify-end pt-4">
           <button className="px-8 py-3 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
              SAVE CHANGES
           </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ icon, label, description, defaultChecked }: { icon: any, label: string, description: string, defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-[4px] hover:bg-white/2 transition-colors">
       <div className="flex items-start space-x-4">
          <div className="p-2 bg-white/5 rounded-[4px] text-gray-400 mt-1">{icon}</div>
          <div>
             <p className="text-white text-sm font-medium">{label}</p>
             <p className="text-gray-500 text-xs">{description}</p>
          </div>
       </div>
       <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${defaultChecked ? 'bg-[#2979ff]' : 'bg-white/10'}`}>
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${defaultChecked ? 'left-6' : 'left-1'}`}></div>
       </div>
    </div>
  );
}
