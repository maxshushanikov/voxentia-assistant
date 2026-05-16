import { useState } from 'react';
import {
  Brain,
  FileText,
  Languages,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Mic,
  Globe,
  Briefcase,
  Award,
} from 'lucide-react';

import { useTranslation } from '../i18n/context';
import PluginPlaceholder from './PluginPlaceholder';

type LearnMode = 'dashboard' | 'flashcards' | 'summarize' | 'speaking';

export default function LearnView() {
  const [mode, setMode] = useState<LearnMode>('dashboard');

  const renderContent = () => {
    switch (mode) {
      case 'dashboard': return <Dashboard onSelect={setMode} />;
      case 'speaking': return <LanguageTraining onBack={() => setMode('dashboard')} />;
      default:
        return <PluginPlaceholder onBack={() => setMode('dashboard')} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] overflow-hidden">
       {renderContent()}
    </div>
  );
}

function Dashboard({ onSelect }: { onSelect: (m: LearnMode) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-3xl font-light text-white mb-2">{t.learn_title}</h1>
        <p className="text-gray-500 text-sm">{t.learn_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <LearnTile
          icon={<Brain className="w-6 h-6" />}
          title={t.learn_flashcards}
          description={t.learn_flashcardsDesc}
          buttonLabel={t.common_create}
          onClick={() => onSelect('flashcards')}
        />
        <LearnTile
          icon={<FileText className="w-6 h-6" />}
          title={t.learn_summarize}
          description={t.learn_summarizeDesc}
          buttonLabel={t.learn_summarize}
          onClick={() => onSelect('summarize')}
        />
        <LearnTile
          icon={<Languages className="w-6 h-6" />}
          title={t.learn_speaking}
          description={t.learn_speakingDesc}
          buttonLabel={t.job_startSimulation}
          onClick={() => onSelect('speaking')}
          highlight
        />
      </div>

      <section>
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-6">Learning Stats</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
           <StatsBox label="WORDS LEARNED" value="1,248" color="#2979ff" />
           <StatsBox label="SIMULATIONS" value="42" color="#10b981" />
           <StatsBox label="ACCURACY" value="94%" color="#fbbf24" />
           <StatsBox label="STREAK" value="12 Days" color="#f43f5e" />
        </div>
      </section>
    </div>
  );
}

function LearnTile({ icon, title, description, buttonLabel, onClick, highlight = false }: { icon: any, title: string, description: string, buttonLabel: string, onClick: () => void, highlight?: boolean }) {
  return (
    <div className={`glass-card rounded-[12px] p-8 border transition-all group flex flex-col h-full
      ${highlight ? 'border-[#2979ff]/30 bg-[#2979ff]/5' : 'border-white/5 hover:border-white/10'}
    `}>
       <div className="w-12 h-12 bg-white/5 rounded-[4px] flex items-center justify-center text-[#2979ff] mb-8 group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <h3 className="text-xl text-white font-medium mb-3">{title}</h3>
       <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">{description}</p>
       <button 
         onClick={onClick}
         className={`w-full py-3 rounded-[4px] text-xs font-bold uppercase tracking-widest transition-all
           ${highlight ? 'bg-[#2979ff] text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
         `}
       >
          {buttonLabel}
       </button>
    </div>
  );
}

function StatsBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="glass-card rounded-[8px] p-6 border border-white/5 bg-white/2">
       <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-2">{label}</p>
       <p className="text-2xl font-light text-white" style={{ color }}>{value}</p>
    </div>
  );
}

function LanguageTraining({ onBack }: { onBack: () => void }) {
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const trainingModes = [
    { id: 'smalltalk', icon: <MessageCircle className="w-5 h-5" />, label: 'Small Talk', desc: 'Everyday casual conversation.' },
    { id: 'business', icon: <Briefcase className="w-5 h-5" />, label: 'Business Meeting', desc: 'Professional office scenarios.' },
    { id: 'interview', icon: <Award className="w-4 h-4" />, label: 'Job Interview', desc: 'Practice answering HR questions.' },
    { id: 'travel', icon: <Globe className="w-5 h-5" />, label: 'Travel & Daily', desc: 'Airport, hotel, and shopping.' }
  ];

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
       <div className="flex items-center justify-between mb-12">
          <button onClick={onBack} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center">
             &lt; Exit Training
          </button>
          <div className="flex items-center space-x-2">
             <Sparkles className="w-4 h-4 text-[#2979ff]" />
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Powered by Voxentia AI</span>
          </div>
       </div>

       <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-16">
             <h2 className="text-4xl font-light text-white mb-4">Speaking Simulation</h2>
             <p className="text-gray-500 max-w-xl mx-auto italic">"Practice makes perfect. Choose a scenario and let's start talking."</p>
          </div>

          {!activeMode ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8">
                {trainingModes.map(mode => (
                   <div 
                     key={mode.id}
                     onClick={() => setActiveMode(mode.id)}
                     className="glass-card rounded-[8px] p-6 border border-white/5 hover:border-[#2979ff33] hover:bg-[#2979ff]/5 cursor-pointer transition-all group"
                   >
                      <div className="flex items-center space-x-6">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#2979ff] group-hover:bg-white/10 transition-all">
                            {mode.icon}
                         </div>
                         <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{mode.label}</h4>
                            <p className="text-gray-500 text-xs">{mode.desc}</p>
                         </div>
                         <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-[#2979ff] transition-colors" />
                      </div>
                   </div>
                ))}
             </div>
          ) : (
             <div className="text-center animate-in zoom-in-95">
                <div className="w-32 h-32 relative mx-auto mb-12">
                   <div className="absolute inset-0 bg-[#2979ff]/20 rounded-full animate-ping"></div>
                   <div className="relative w-full h-full bg-[#161821] rounded-full border-2 border-[#2979ff] flex items-center justify-center">
                      <Mic className="w-12 h-12 text-[#2979ff]" />
                   </div>
                </div>
                <h3 className="text-2xl text-white mb-4">Listening for your response...</h3>
                <p className="text-gray-500 mb-12 uppercase tracking-widest text-[10px] font-bold">Scenario: {trainingModes.find(m => m.id === activeMode)?.label}</p>
                <div className="flex justify-center space-x-1 mb-12 h-8 items-center">
                   {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-1 bg-[#2979ff] rounded-full" style={{ height: `${Math.random() * 100}%`, transition: 'height 0.2s ease' }}></div>
                   ))}
                </div>
                <button 
                  onClick={() => setActiveMode(null)}
                  className="px-8 py-2 border border-white/10 text-gray-500 rounded-[4px] text-[10px] font-bold hover:text-white transition-all uppercase tracking-widest"
                >
                   Change Scenario
                </button>
             </div>
          )}
       </div>
    </div>
  );
}

