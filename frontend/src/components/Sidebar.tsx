import { useState, useEffect, type ReactNode } from 'react';
import { 
  X, History, LayoutGrid, Settings 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { translations } from '../translations';
import type { Language } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  activePlugin: string | null;
  setActivePlugin: (p: string | null) => void;
  onHistoryClick: () => void;
}

import { plugins } from '../plugins/registry';

export default function Sidebar({ isOpen, onClose, language, activePlugin, setActivePlugin, onHistoryClick }: SidebarProps) {
  const t = translations[language];
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-transform duration-300 z-50 w-[260px] flex flex-col h-screen bg-[#0d1117] border-r border-white/5 shrink-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 flex items-center justify-between lg:hidden border-b border-white/5 mb-4">
         <span className="font-bold uppercase tracking-widest text-xs text-gray-500">Menu</span>
         <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
         <div className="mb-8">
           <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">{t.plugins}</h2>
           <nav className="space-y-1">
             {plugins.map((plugin) => (
               <SidebarButton 
                 key={plugin.id}
                 icon={plugin.icon} 
                 label={(t as any)[plugin.nameKey] || plugin.id} 
                 active={activePlugin === plugin.id} 
                 onClick={() => setActivePlugin(plugin.id)}
               />
             ))}
           </nav>
         </div>

         <div className="mb-8">
           <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">{t.history}</h2>
           <nav className="space-y-1">
             <div className="px-4 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest cursor-pointer" onClick={onHistoryClick}>{t.myChats}</div>
             <SidebarButton 
               icon={<History className="w-4 h-4" />} 
               label="Main Session" 
               active={activePlugin === null}
               onClick={onHistoryClick}
             />
             <SidebarButton 
               icon={<History className="w-4 h-4" />} 
               label="Review Report" 
               active={false}
             />
             <SidebarButton 
               icon={<History className="w-4 h-4" />} 
               label="Project Planning" 
               active={false}
             />
             <SidebarButton icon={<LayoutGrid className="w-4 h-4" />} label={t.myAssets} />
           </nav>
         </div>

         <div className="mb-8">
           <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">{t.settings.toUpperCase()}</h2>
           <nav className="space-y-1">
             <SidebarButton 
               icon={<Settings className="w-4 h-4" />} 
               label={t.settings} 
               active={activePlugin === 'settings'}
               onClick={() => setActivePlugin('settings')}
             />
           </nav>
         </div>
      </div>

      <div className="p-4 border-t border-white/5 bg-black/10">
         <div className="bg-[#161821] rounded-[4px] p-4 border border-white/5 shadow-inner">
            <p className="text-[#2979ff] text-[13px] font-bold mb-1 truncate">{time}</p>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600 font-bold uppercase">{t.status}</span>
              <span className="text-gray-400">{t.free}</span>
            </div>
         </div>
      </div>
    </aside>
  );
}

function SidebarButton({ icon, label, active = false, onClick }: { icon: ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all duration-200 group text-left",
        active 
          ? "bg-[#2979ff] text-white shadow-lg shadow-blue-900/20" 
          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
      )}
    >
      <span className={cn("mr-4 transition-transform", active ? "text-white" : "text-gray-600 group-hover:text-gray-400")}>
        {icon}
      </span>
      <span className="uppercase tracking-widest">{label}</span>
    </button>
  );
}
