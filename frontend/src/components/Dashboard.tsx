import { Activity, Compass, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { apiFetch } from '../api/client';
import { listPlugins } from '../api/chat';
import { useTranslation } from '../i18n/context';
import { plugins } from '../plugins/registry';
import { useAppStore } from '../store/appStore';

interface HealthResponse {
  status: string;
  version: string;
  services: Record<string, { status: string }>;
}

interface RemotePlugin {
  id: string;
  name: string;
  status: string;
  description?: string;
}

interface DashboardProps {
  onContinueSession: () => void;
  onOpenPlugin: (id: string) => void;
}

function greetingForHour(hour: number, lang: string): string {
  if (lang === 'de') {
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }
  if (lang === 'ru') {
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  }
  if (lang === 'fr' || lang === 'fr-FR') {
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }
  if (lang === 'es' || lang === 'es-ES') {
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ onContinueSession, onOpenPlugin }: DashboardProps) {
  const { t, language } = useTranslation();
  const messages = useAppStore((s) => s.messages);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [discover, setDiscover] = useState<RemotePlugin[]>([]);

  useEffect(() => {
    apiFetch<HealthResponse>('/health')
      .then(setHealth)
      .catch(() => setHealth(null));
    listPlugins()
      .then((data) => setDiscover(data.plugins.filter((p) => p.status === 'disabled')))
      .catch(() => setDiscover([]));
  }, []);

  const greet = greetingForHour(new Date().getHours(), language);

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>
            {greet} — <span className="text-[var(--accent)]">Voxentia</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {(t as unknown as Record<string, string>).dashboard_subtitle ?? 'Your control center'}
          </p>
        </header>

        <section className="glass-card rounded-[8px] p-6 border border-black/5 dark:border-white/5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Getting started</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Start a new chat, ask your first question, or explore the sidebar plugins to get the most from Voxentia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <button
              type="button"
              onClick={() => onContinueSession()}
              className="rounded-[8px] border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 text-left hover:cursor-pointer"
              aria-label="New chat"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--text-secondary)]">New chat</p>
              </div>
              <p className="text-xs text-[var(--text-primary)]">Ask anything — from summaries to planning and code help.</p>
            </button>

            <button
              type="button"
              onClick={() => document.querySelector('input[type=file]')?.dispatchEvent(new MouseEvent('click'))}
              className="rounded-[8px] border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 text-left hover:cursor-pointer"
              aria-label="Upload docs"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--text-secondary)]">Upload docs</p>
              </div>
              <p className="text-xs text-[var(--text-primary)]">Attach PDFs to let Voxentia answer from your own content.</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenPlugin('docs')}
              className="rounded-[8px] border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 text-left hover:cursor-pointer"
              aria-label="Explore plugins"
            >
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-4 h-4 text-[var(--accent)]" />
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--text-secondary)]">Explore plugins</p>
              </div>
              <p className="text-xs text-[var(--text-primary)]">Open a plugin from the sidebar for specialized workflows.</p>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            label="Ollama"
            status={health ? (health.services?.ollama?.status ?? 'down') : 'checking'}
            icon={<Zap className="w-4 h-4 text-[var(--accent)]" />}
            language={language}
          />
          <StatusCard
            label="TTS"
            status={health ? (health.services?.tts?.status ?? 'down') : 'checking'}
            icon={<Activity className="w-4 h-4 text-[var(--accent)]" />}
            language={language}
          />
          <StatusCard
            label="Whisper"
            status={health ? (health.services?.whisper?.status ?? 'down') : 'checking'}
            icon={<MessageSquare className="w-4 h-4 text-[var(--accent)]" />}
            language={language}
          />
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onContinueSession}
            className="w-full glass-card rounded-lg p-4 border border-[var(--accent)]/30 text-left hover:bg-[var(--accent)]/10 transition-colors"
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {(t as unknown as Record<string, string>).dashboard_continue ?? 'Continue last session'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {messages.length} messages
            </p>
          </button>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            {(t as unknown as Record<string, string>).dashboard_plugins ?? 'Quick actions'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plugins.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPlugin(p.id)}
                className="glass-card p-4 rounded-lg border border-white/5 hover:border-[var(--accent)]/40 transition-all text-left group flex items-center gap-3"
              >
                <span className="mb-2">{p.icon}</span>
                <div>
                  <p className="text-sm group-hover:text-[var(--accent)] transition-colors text-[var(--text-primary)]">
                    {(t as unknown as Record<string, string>)[`plugin_${p.nameKey}`] ?? p.nameKey}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {discover.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-[var(--text-secondary)]">
              <Compass className="w-4 h-4 text-[var(--accent)]" />
              {(t as unknown as Record<string, string>).dashboard_discover ?? 'Discover plugins'}
            </h2>
            <div className="space-y-2">
              {discover.map((p) => (
                  <div
                    key={p.id}
                    className="glass-card rounded-lg p-4 border border-dashed border-white/10 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{p.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {p.description ?? p.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await apiFetch(`/api/v1/plugins/install/${p.id}`, { method: 'POST' });
                            setDiscover((prev) => prev.filter((x) => x.id !== p.id));
                          } catch {
                            // ignore
                          }
                        }}
                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded bg-[var(--accent)]/10 text-[var(--accent)]"
                      >
                        Enable
                      </button>
                      <span className="text-[9px] uppercase font-bold text-[var(--warning)] tracking-widest">disabled</span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  status,
  icon,
  language,
}: {
  label: string;
  status: string;
  icon: ReactNode;
  language: string;
}) {
  let displayStatus: string;
  let colorClass: string;
  let pulseClass: string;

  if (status === 'healthy' || status === 'up') {
    displayStatus = language === 'de' ? 'Online' : language === 'ru' ? 'В сети' : 'Online';
    colorClass = 'text-[var(--success)]';
    pulseClass = 'bg-[var(--success)]';
  } else if (status === 'starting' || status === 'initializing') {
    displayStatus = language === 'de' ? 'Initialisiert...' : language === 'ru' ? 'Запуск...' : 'Initializing...';
    colorClass = 'text-[var(--warning)]';
    pulseClass = 'bg-[var(--warning)]';
  } else if (status === 'disabled') {
    displayStatus = language === 'de' ? 'Deaktiviert' : language === 'ru' ? 'Отключен' : 'Disabled';
    colorClass = 'text-[var(--text-muted)]';
    pulseClass = 'bg-[var(--text-muted)]';
  } else if (status === 'checking') {
    displayStatus = language === 'de' ? 'Verbindet...' : language === 'ru' ? 'Проверка...' : 'Connecting...';
    colorClass = 'text-[var(--accent)]';
    pulseClass = 'bg-[var(--accent)]';
  } else {
    displayStatus = language === 'de' ? 'Offline' : language === 'ru' ? 'Не в сети' : 'Offline';
    colorClass = 'text-[var(--danger)]';
    pulseClass = 'bg-[var(--danger)]';
  }

  return (
    <div
      onClick={() => window.open(`/api/v1/health?service=${label.toLowerCase()}`, '_blank')}
      role="button"
      className="glass-card rounded-lg p-4 border border-white/5 flex flex-col justify-between h-24 hover:border-white/10 hover:bg-white/5 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center justify-between text-[var(--text-secondary)]">
        <div className="p-1.5 rounded bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex items-center space-x-2">
          {status !== 'disabled' && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseClass}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseClass}`}></span>
            </span>
          )}
          <span className={`text-[9px] uppercase font-bold tracking-widest ${colorClass}`}>
            {displayStatus}
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] mt-3">{label}</p>
    </div>
  );
}
