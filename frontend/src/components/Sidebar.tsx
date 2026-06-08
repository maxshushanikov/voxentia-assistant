import { type DragEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { X, Settings, Plus, Trash2, GripVertical, ChevronLeft, ChevronRight, MessageSquare, Compass, FolderHeart, Search } from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { plugins } from '../plugins/registry';
import { deleteAllSessions, deleteSession, getSessions, listPlugins } from '../api/chat';
import { cn } from '../utils/cn';

const SIDEBAR_HISTORY_PREVIEW_LIMIT = 6;

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

  for (const session of groups.length ? sessions : []) {
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
  const [pluginOrder, setPluginOrder] = useState(() => plugins);
  const [pluginMetadata, setPluginMetadata] = useState<Record<string, {status: string; enabled: boolean; capabilities?: string[]; triggers?: string[]}>>({});
  const [draggingPlugin, setDraggingPlugin] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [version, setVersion] = useState<string>('...');

  // Collapsed state persistent via localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voxentia_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      localStorage.setItem('voxentia_sidebar_collapsed', (!prev).toString());
      return !prev;
    });
  };

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((d) => setVersion(d.version || '...'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listPlugins();
        const meta: Record<string, {status: string; enabled: boolean; capabilities?: string[]; triggers?: string[]}> = {};
        data.plugins.forEach((item) => {
          meta[item.id] = {
            status: item.status,
            enabled: item.enabled,
            capabilities: item.capabilities,
            triggers: item.triggers,
          };
        });
        setPluginMetadata(meta);
      } catch (error) {
        console.warn('Failed to load plugin metadata', error);
      }
    })();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setAllGroups(groupSessions(data.sessions || [], (t as unknown as Record<string, string>)));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
  }, [historyRefreshKey, loadSessions]);

  const totalSessions = useMemo(() => countSessions(allGroups), [allGroups]);

  const visibleGroups = useMemo(() => {
    let groups = allGroups;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      groups = allGroups.map(g => ({
        ...g,
        sessions: g.sessions.filter(s => s.title.toLowerCase().includes(q))
      })).filter(g => g.sessions.length > 0);
    }
    if (showAllHistory || searchQuery.trim()) {
      return groups;
    }
    return limitHistoryGroups(groups, SIDEBAR_HISTORY_PREVIEW_LIMIT).groups;
  }, [allGroups, showAllHistory, searchQuery]);

  const handleDragStart = (pluginId: string) => {
    setDraggingPlugin(pluginId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggingPlugin(null);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingPlugin || draggingPlugin === targetId) {
      setDraggingPlugin(null);
      return;
    }
    setPluginOrder((prev) => {
      const draggedIndex = prev.findIndex((item) => item.id === draggingPlugin);
      const targetIndex = prev.findIndex((item) => item.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraggingPlugin(null);
  };

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

  // Group plugins & tools according to plan
  const pluginsGroup = useMemo(() => {
    return pluginOrder.filter((p) => ['learn', 'jobs', 'project', 'knowledge', 'vision'].includes(p.id));
  }, [pluginOrder]);

  const toolsGroup = useMemo(() => {
    return pluginOrder.filter((p) => ['calendar', 'docs', 'notes', 'print'].includes(p.id));
  }, [pluginOrder]);

  const marketplacePlugin = useMemo(() => {
    return pluginOrder.find((p) => p.id === 'marketplace');
  }, [pluginOrder]);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-all duration-300 z-50 flex flex-col h-screen bg-[rgba(15,23,42,0.85)] backdrop-blur-[20px] border-r border-[rgba(255,255,255,0.08)] shadow-[0_24px_90px_-40px_rgba(0,0,0,0.65)] shrink-0',
        isCollapsed ? 'lg:w-[80px]' : 'lg:w-[288px]',
        isOpen ? 'translate-x-0 w-[288px]' : '-translate-x-full lg:translate-x-0',
      )}
    >
      {/* Sidebar Header with Collapse Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 select-none shrink-0 h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--text-on-accent)] text-sm font-black shadow-lg shadow-[var(--accent)]/25">V</div>
          {(!isCollapsed || isOpen) && (
            <span className="font-black uppercase tracking-[0.2em] text-xs text-[var(--text-primary)]">Voxentia</span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer hidden lg:block"
          title={isCollapsed ? t.sidebar_expandNavigation : t.sidebar_collapseNavigation}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onClose} className="p-1 lg:hidden text-[var(--text-secondary)] hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isCollapsed && !isOpen ? (
        /* ==================== COLLAPSED NAVIGATION RAIL ==================== */
        <div className="flex-1 py-6 overflow-y-auto scrollbar-hide flex flex-col items-center justify-between">
          <div className="w-full flex flex-col items-center space-y-4">
            {/* New Chat pill */}
            <button
              type="button"
              onClick={onNewChat}
              className="w-10 h-10 flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-full hover:bg-[var(--accent)]/20 hover:scale-105 transition-all cursor-pointer shadow-sm"
              title={t.newChat}
            >
              <Plus className="w-5 h-5" />
            </button>

            <div className="h-px bg-white/5 w-10 my-2" />

            {/* Chat button */}
            <SidebarCollapsedButton
              icon={<MessageSquare className="w-4 h-4" />}
              label={t.title_chat}
              active={activePlugin === null}
              onClick={() => setActivePlugin(null)}
            />

            <div className="h-px bg-white/5 w-10 my-2" />

            {/* Plugins list */}
            {pluginsGroup.map((p) => (
              <SidebarCollapsedButton
                key={p.id}
                icon={p.icon}
                label={(t[p.nameKey as keyof typeof t] as string) || p.id}
                active={activePlugin === p.id}
                disabled={pluginMetadata[p.id]?.enabled === false}
                onClick={() => setActivePlugin(p.id)}
                badge={pluginMetadata[p.id]?.status !== 'active' ? pluginMetadata[p.id]?.status : p.badge}
              />
            ))}

            <div className="h-px bg-white/5 w-10 my-2" />

            {/* Tools list */}
            {toolsGroup.map((p) => (
              <SidebarCollapsedButton
                key={p.id}
                icon={p.icon}
                label={(t[p.nameKey as keyof typeof t] as string) || p.id}
                active={activePlugin === p.id}
                disabled={pluginMetadata[p.id]?.enabled === false}
                onClick={() => setActivePlugin(p.id)}
                badge={pluginMetadata[p.id]?.status !== 'active' ? pluginMetadata[p.id]?.status : p.badge}
              />
            ))}
          </div>

          <div className="w-full flex flex-col items-center space-y-4">
            <div className="h-px bg-white/5 w-10 my-2" />

            {/* Marketplace */}
            {marketplacePlugin && (
              <SidebarCollapsedButton
                icon={marketplacePlugin.icon}
                label={(t[marketplacePlugin.nameKey as keyof typeof t] as string) || marketplacePlugin.id}
                active={activePlugin === marketplacePlugin.id}
                onClick={() => setActivePlugin(marketplacePlugin.id)}
                badge={marketplacePlugin.badge}
              />
            )}

            {/* Settings */}
            <SidebarCollapsedButton
              icon={<Settings className="w-4 h-4" />}
              label={t.settings}
              active={activePlugin === 'settings'}
              onClick={() => setActivePlugin('settings')}
            />
          </div>
        </div>
      ) : (
        /* ==================== EXPANDED SIDEBAR DRAWER ==================== */
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col justify-between select-none">
          <div className="space-y-6">
            {/* New Chat Button */}
            <button
              type="button"
              onClick={onNewChat}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl font-bold hover:bg-[var(--accent)]/18 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest">{t.newChat}</span>
            </button>

            {/* SECTION: CHAT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <h2 className="text-[9px] font-bold text-[var(--text-muted)] tracking-[0.15em] uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-[var(--accent)]" />
                {t.sidebar_chatWorkspace}
                </h2>
              </div>
              <SidebarButton
                icon={<MessageSquare className="w-4 h-4" />}
                label={t.title_chat}
                active={activePlugin === null}
                onClick={() => setActivePlugin(null)}
              />

              {/* Chat History Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2 ml-2">
                  <span className="text-[8px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                    {t.history} ({totalSessions})
                  </span>
                  {totalSessions > 0 && showAllHistory && (
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      className="text-[8px] text-[var(--danger)]/80 hover:text-[var(--danger)] uppercase font-semibold"
                      title={t.deleteAllChats}
                    >
                      {t.deleteAllChats}
                    </button>
                  )}
                </div>

                <div className="relative mb-3 mx-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.common_search || 'Search chats...'}
                    className="w-full bg-black/20 dark:bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 transition-colors"
                  />
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2" />
                </div>

                {visibleGroups.length === 0 ? (
                  <p className="text-[9px] text-[var(--text-muted)] px-3 italic">{t.noHistory}</p>
                ) : (
                  <div className="space-y-4 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {visibleGroups.map((group) => (
                      <div key={group.label} className="space-y-1">
                        <h3 className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-2">{group.label}</h3>
                        {group.sessions.map((session) => (
                          <div
                            key={session.session_id}
                            className={cn(
                              'group flex items-center rounded-lg hover:bg-white/5 border border-transparent',
                              activeSessionId === session.session_id && 'bg-white/5 border-white/5',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActivePlugin(null);
                                onLoadSession(session.session_id);
                              }}
                              className="flex-1 min-w-0 text-left px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors truncate"
                              title={session.title}
                            >
                              {session.title}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(session.session_id, e)}
                              disabled={deletingId === session.session_id}
                              className="p-1.5 mr-1 text-[var(--text-secondary)]/50 opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all disabled:opacity-40"
                              title={t.deleteChat}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {totalSessions > SIDEBAR_HISTORY_PREVIEW_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="w-full text-center text-[9px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest mt-2 block"
                  >
                    {showAllHistory ? t.showLessHistory : t.showAllHistory}
                  </button>
                )}
              </div>
            </div>

            {/* SECTION: PLUGINS */}
            <div className="space-y-2">
              <h2 className="text-[9px] font-bold text-[var(--text-muted)] tracking-[0.15em] uppercase flex items-center gap-1.5 ml-2">
                <Compass className="w-3 h-3 text-[var(--accent)]" />
                Plugins
              </h2>
              <nav className="space-y-1">
                {pluginsGroup.map((plugin) => {
                  const isActivePlugin = activePlugin === plugin.id;
                  const isDisabled = pluginMetadata[plugin.id]?.enabled === false;

                  return (
                    <div
                      key={plugin.id}
                      draggable
                      onDragStart={() => handleDragStart(plugin.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(plugin.id)}
                      className={cn(
                        'flex items-center rounded-xl bg-white/3 border border-transparent hover:border-white/5 transition-all duration-200',
                        isDisabled && 'opacity-60 cursor-not-allowed',
                        isActivePlugin && 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.25)] shadow-inner',
                        draggingPlugin === plugin.id && 'opacity-80',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => !isDisabled && setActivePlugin(plugin.id)}
                        disabled={isDisabled}
                        className={cn(
                        'flex-1 min-w-0 flex items-center px-3.5 py-2 text-xs font-semibold text-left w-full rounded-xl transition-all cursor-pointer',
                          isActivePlugin ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-white',
                        )}
                      >
                        <span className={cn('mr-3', isActivePlugin ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]')}>
                          {plugin.icon}
                        </span>
                          <span className="uppercase tracking-[0.1em] text-[10px] truncate max-w-full">
                          {(t[plugin.nameKey as keyof typeof t] as string) || plugin.id}
                        </span>
                      </button>

                      <div className="flex items-center pr-3 space-x-1.5">
                        {pluginMetadata[plugin.id]?.status && pluginMetadata[plugin.id]?.status !== 'active' ? (
                          <span className="plugin-badge text-[8px]">{pluginMetadata[plugin.id].status}</span>
                        ) : plugin.badge ? (
                          <span className="plugin-badge text-[8px]">{plugin.badge}</span>
                        ) : null}
                        <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 hover:opacity-80 cursor-grab active:cursor-grabbing shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* SECTION: TOOLS */}
            <div className="space-y-2">
              <h2 className="text-[9px] font-bold text-[var(--text-muted)] tracking-[0.15em] uppercase flex items-center gap-1.5 ml-2">
                <FolderHeart className="w-3 h-3 text-[var(--accent)]" />
                {t.sidebar_tools}
              </h2>
              <nav className="space-y-1">
                {toolsGroup.map((plugin) => {
                  const isActivePlugin = activePlugin === plugin.id;
                  const isDisabled = pluginMetadata[plugin.id]?.enabled === false;

                  return (
                    <div
                      key={plugin.id}
                      draggable
                      onDragStart={() => handleDragStart(plugin.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(plugin.id)}
                      className={cn(
                        'flex items-center rounded-xl bg-white/3 border border-transparent hover:border-white/5 transition-all duration-200',
                        isDisabled && 'opacity-60 cursor-not-allowed',
                        isActivePlugin && 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.25)] shadow-inner',
                        draggingPlugin === plugin.id && 'opacity-80',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => !isDisabled && setActivePlugin(plugin.id)}
                        disabled={isDisabled}
                        className={cn(
                          'flex-1 min-w-0 flex items-center px-3.5 py-2 text-xs font-semibold text-left w-full rounded-xl transition-all cursor-pointer',
                          isActivePlugin ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-white',
                        )}
                      >
                        <span className={cn('mr-3', isActivePlugin ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]')}>
                          {plugin.icon}
                        </span>
                        <span className="uppercase tracking-[0.1em] text-[10px] truncate">
                          {(t[plugin.nameKey as keyof typeof t] as string) || plugin.id}
                        </span>
                      </button>

                      <div className="flex items-center pr-3 space-x-1.5">
                        {pluginMetadata[plugin.id]?.status && pluginMetadata[plugin.id]?.status !== 'active' ? (
                          <span className="plugin-badge text-[8px]">{pluginMetadata[plugin.id].status}</span>
                        ) : plugin.badge ? (
                          <span className="plugin-badge text-[8px]">{plugin.badge}</span>
                        ) : null}
                        <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 hover:opacity-80 cursor-grab active:cursor-grabbing shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* SECTION: MARKETPLACE & SETTINGS */}
            <div className="space-y-1 border-t border-white/5 pt-4">
              {marketplacePlugin && (
                <SidebarButton
                  icon={marketplacePlugin.icon}
                  label={(t[marketplacePlugin.nameKey as keyof typeof t] as string) || marketplacePlugin.id}
                  active={activePlugin === marketplacePlugin.id}
                  onClick={() => setActivePlugin(marketplacePlugin.id)}
                />
              )}

              <SidebarButton
                icon={<Settings className="w-4 h-4" />}
                label={t.settings}
                active={activePlugin === 'settings'}
                onClick={() => setActivePlugin('settings')}
              />
            </div>
          </div>

          {/* Sidebar Footer info */}
          <div className="pt-4 border-t border-white/5 mt-6">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] text-[var(--text-secondary)]/40 font-bold uppercase tracking-widest">
                Voxentia v{version}
              </span>
              <span className="text-[8px] text-[var(--accent)] font-bold uppercase tracking-widest bg-[var(--accent)]/10 px-2 py-0.5 rounded">
                Pro Model
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* Sidebar Button Component for Expanded Drawer */
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
        'w-full flex items-center px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 group text-left border cursor-pointer border-transparent select-none',
        active
          ? 'bg-[var(--accent)]/12 border-[var(--accent)]/20 text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white',
      )}
    >
      <span className={cn('mr-4 transition-colors', active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-white')}>
        {icon}
      </span>
      <span className="uppercase text-[10px] tracking-wider truncate">{label}</span>
    </button>
  );
}

/* Sidebar Button Component for Collapsed Rail */
function SidebarCollapsedButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  badge,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <div className="relative group w-full flex flex-col items-center py-2 shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-12 h-8 rounded-full flex items-center justify-center relative transition-all duration-300 cursor-pointer focus:outline-none border border-transparent shadow-sm select-none',
          active
            ? 'bg-[var(--accent)]/15 border-[var(--accent)]/20 text-[var(--accent)] shadow-inner'
            : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 bg-[var(--accent)] text-[var(--text-on-accent)] text-[7px] font-black px-1 py-0.5 rounded-full scale-90 border border-white/5">
            {badge}
          </span>
        )}
      </button>
      <span className="text-[8px] mt-1 font-bold text-[var(--text-secondary)] tracking-widest group-hover:text-[var(--text-primary)] transition-colors select-none text-center truncate max-w-[70px] uppercase">
        {label}
      </span>

      {/* Floating Hover Tooltip */}
      <div className="absolute left-full ml-3 px-2.5 py-1 bg-[rgba(12,18,34,0.95)] border border-white/10 text-[9px] uppercase tracking-wider font-bold text-white rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
        {label}
      </div>
    </div>
  );
}
