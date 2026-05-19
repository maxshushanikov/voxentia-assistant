import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { X, Settings, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { plugins } from '../plugins/registry';
import { deleteAllSessions, deleteSession, getSessions } from '../api/chat';
import { cn } from '../utils/cn';

const SIDEBAR_HISTORY_PREVIEW_LIMIT = 8;

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
  activePlugin: string | null;
  setActivePlugin: (p: string | null) => void;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
  onSessionDeleted: (sessionId: string) => void;
  activeSessionId: string;
  historyRefreshKey: number;
}

function groupSessions(sessions: SessionSummary[], t: Record<string, string>): HistoryGroup[] {
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

  return groups.filter((g) => g.sessions.length > 0);
}

function countSessions(groups: HistoryGroup[]): number {
  return groups.reduce((sum, g) => sum + g.sessions.length, 0);
}

function limitHistoryGroups(
  groups: HistoryGroup[],
  limit: number,
): { groups: HistoryGroup[]; truncated: boolean } {
  const total = countSessions(groups);
  if (total <= limit) {
    return { groups, truncated: false };
  }

  let remaining = limit;
  const limited: HistoryGroup[] = [];

  for (const group of groups) {
    if (remaining <= 0) break;
    const slice = group.sessions.slice(0, remaining);
    if (slice.length > 0) {
      limited.push({ label: group.label, sessions: slice });
      remaining -= slice.length;
    }
  }

  return { groups: limited, truncated: true };
}

export default function Sidebar({
  isOpen,
  onClose,
  activePlugin,
  setActivePlugin,
  onNewChat,
  onLoadSession,
  onSessionDeleted,
  activeSessionId,
  historyRefreshKey,
}: SidebarProps) {
  const { t } = useTranslation();
  const [allGroups, setAllGroups] = useState<HistoryGroup[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setAllGroups(groupSessions(data.sessions || [], (t as any)));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [t]);

  useEffect(() => {
    loadSessions();
  }, [historyRefreshKey, loadSessions]);

  const totalSessions = useMemo(() => countSessions(allGroups), [allGroups]);

  const visibleGroups = useMemo(() => {
    if (showAllHistory) {
      return allGroups;
    }
    return limitHistoryGroups(allGroups, SIDEBAR_HISTORY_PREVIEW_LIMIT).groups;
  }, [allGroups, showAllHistory]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(t.confirmDeleteChat);
    if (!confirmed) return;

    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setAllGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            sessions: g.sessions.filter((s) => s.session_id !== sessionId),
          }))
          .filter((g) => g.sessions.length > 0),
      );
      onSessionDeleted(sessionId);
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(t.confirmDeleteAllChats);
    if (!confirmed) return;

    try {
      await deleteAllSessions();
      setAllGroups([]);
      setShowAllHistory(false);
      onSessionDeleted('*');
    } catch (err) {
      console.error('Failed to delete all sessions:', err);
    }
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-transform duration-300 z-50 w-[260px] flex flex-col h-screen bg-[var(--bg-secondary)] border-r border-black/5 dark:border-white/5 shrink-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="p-4 flex items-center justify-between lg:hidden border-b border-black/5 dark:border-white/5 mb-4">
        <span className="font-bold uppercase tracking-widest text-xs text-[var(--text-secondary)]">{t.menu}</span>
        <button type="button" onClick={onClose} className="p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full mb-8 flex items-center justify-center space-x-2 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[4px] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="uppercase tracking-widest">{t.newChat}</span>
        </button>

        <div className="mb-8">
          <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">
            {t.plugins}
          </h2>
          <nav className="space-y-1">
            {plugins.map((plugin) => (
              <SidebarButton
                key={plugin.id}
                icon={plugin.icon}
                label={(t[plugin.nameKey as keyof typeof t] as string) || plugin.id}
                active={activePlugin === plugin.id}
                onClick={() => setActivePlugin(plugin.id)}
              />
            ))}
          </nav>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold text-gray-600 tracking-[0.1em] uppercase">
              {t.history}
            </h2>
            {totalSessions > 0 && showAllHistory && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="text-[9px] text-red-400/80 hover:text-red-400 uppercase tracking-wider"
                title={t.deleteAllChats}
              >
                {t.deleteAllChats}
              </button>
            )}
          </div>

          {visibleGroups.length === 0 ? (
            <p className="text-[10px] text-gray-700 px-4 italic">{t.noHistory}</p>
          ) : (
            <>
              <div className="space-y-5">
                {visibleGroups.map((group) => (
                  <div key={group.label}>
                    <h3 className="text-[9px] font-bold text-gray-700 uppercase tracking-widest mb-2 ml-2">
                      {group.label}
                    </h3>
                    <nav className="space-y-0.5">
                      {group.sessions.map((session) => (
                        <div
                          key={session.session_id}
                          className={cn(
                            'group flex items-center rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5',
                            activeSessionId === session.session_id && 'bg-black/5 dark:bg-white/5',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onLoadSession(session.session_id)}
                            className="flex-1 min-w-0 text-left px-4 py-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors truncate"
                            title={session.title}
                          >
                            {session.title}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(session.session_id, e)}
                            disabled={deletingId === session.session_id}
                            className="p-2 mr-1 text-[var(--text-secondary)]/60 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all disabled:opacity-40"
                            title={t.deleteChat}
                            aria-label={t.deleteChat}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>

              {totalSessions > SIDEBAR_HISTORY_PREVIEW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="mt-4 w-full text-center text-[10px] font-bold text-[#2979ff] hover:text-[#5c9aff] uppercase tracking-widest py-2"
                >
                  {showAllHistory ? t.showLessHistory : t.showAllHistory}
                </button>
              )}
            </>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-[10px] font-bold text-gray-600 mb-3 tracking-[0.1em] uppercase">
            {t.settings.toUpperCase()}
          </h2>
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

      <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20">
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] text-[var(--text-secondary)]/50 font-bold uppercase tracking-widest">
            Voxentia v3.2
          </span>
          <span className="text-[10px] text-[#2979ff] font-bold uppercase tracking-widest">Pro</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center px-4 py-2.5 text-xs font-bold rounded-[4px] transition-all duration-200 group text-left',
        active
          ? 'bg-[#2979ff] text-white shadow-lg shadow-blue-900/20'
          : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]',
      )}
    >
      <span className={cn('mr-4', active ? 'text-white' : 'text-[var(--text-secondary)]/60 group-hover:text-[var(--text-primary)]/80')}>
        {icon}
      </span>
      <span className="uppercase tracking-widest">{label}</span>
    </button>
  );
}
