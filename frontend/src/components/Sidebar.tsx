import { type ReactNode, useEffect, useState } from 'react';
import { X, Settings, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { translations } from '../translations';
import type { Language } from '../types';
import { plugins } from '../plugins/registry';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SessionSummary {
  session_id: string;
  title: string;
  timestamp: string;
}

interface HistoryGroup {
  label: string;
  sessions: SessionSummary[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  activePlugin: string | null;
  setActivePlugin: (p: string | null) => void;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
  historyRefreshKey: number;
}

function groupSessions(sessions: SessionSummary[], t: any): HistoryGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const start7Days = new Date(startOfToday.getTime() - 6 * 86400000);
  const start30Days = new Date(startOfToday.getTime() - 29 * 86400000);

  const groups: HistoryGroup[] = [
    { label: t.today, sessions: [] },
    { label: t.yesterday, sessions: [] },
    { label: t.last7Days, sessions: [] },
    { label: t.last30Days, sessions: [] },
  ];

  for (const session of sessions) {
    const ts = new Date(session.timestamp);
    if (ts >= startOfToday) {
      groups[0].sessions.push(session);
    } else if (ts >= startOfYesterday) {
      groups[1].sessions.push(session);
    } else if (ts >= start7Days) {
      groups[2].sessions.push(session);
    } else if (ts >= start30Days) {
      groups[3].sessions.push(session);
    }
  }

  return groups.filter(g => g.sessions.length > 0);
}

export default function Sidebar({
  isOpen, onClose, language, activePlugin, setActivePlugin,
  onNewChat, onLoadSession, historyRefreshKey
}: SidebarProps) {
  const t = translations[language];
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (!response.ok) return;
        const data = await response.json();
        const grouped = groupSessions(data.sessions || [], t);
        setHistoryGroups(grouped);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    fetchSessions();
  }, [historyRefreshKey, language]);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-transform duration-300 z-50 w-[260px] flex flex-col h-screen bg-[#0d1117] border-r border-white/5 shrink-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 flex items-center justify-between lg:hidden border-b border-white/5 mb-4">
        <span className="font-bold uppercase tracking-widest text-xs text-gray-500">Menu</span>
        <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full mb-8 flex items-center justify-center space-x-2 py-3 bg-white/5 border border-white/10 rounded-[4px] text-xs font-bold text-gray-400 hover:text-[#2979ff] hover:border-[#2979ff33] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="uppercase tracking-widest">New Chat</span>
        </button>

        {/* Plugins */}
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

        {/* History */}
        <div className="mb-8">
          <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">{t.history}</h2>
          {historyGroups.length === 0 ? (
            <p className="text-[10px] text-gray-700 px-4 italic">No history yet.</p>
          ) : (
            <div className="space-y-5">
              {historyGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-[9px] font-bold text-gray-700 uppercase tracking-widest mb-2 ml-2">
                    {group.label}
                  </h3>
                  <nav className="space-y-0.5">
                    {group.sessions.map((session) => (
                      <button
                        key={session.session_id}
                        onClick={() => onLoadSession(session.session_id)}
                        className="w-full text-left px-4 py-2 text-[11px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors truncate rounded-[4px]"
                        title={session.title}
                      >
                        {session.title}
                      </button>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
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
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Voxentia v1.0</span>
          <span className="text-[10px] text-[#2979ff] font-bold uppercase tracking-widest">Pro</span>
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
      <span className={cn("mr-4", active ? "text-white" : "text-gray-600 group-hover:text-gray-400")}>
        {icon}
      </span>
      <span className="uppercase tracking-widest">{label}</span>
    </button>
  );
}
