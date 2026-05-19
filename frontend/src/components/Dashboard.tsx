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
            {(t as any).dashboard_subtitle ?? 'Your control center'}
          </p>
        </header>

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
              {(t as any).dashboard_continue ?? 'Continue last session'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {messages.length} messages
            </p>
          </button>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            {(t as any).dashboard_plugins ?? 'Quick actions'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plugins.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPlugin(p.id)}
                className="glass-card p-4 rounded-lg border border-white/5 hover:border-[var(--accent)]/40 transition-all text-left group"
              >
                <p className="text-sm group-hover:text-[var(--accent)] transition-colors text-[var(--text-primary)]">
                  {(t as any)[`plugin_${p.nameKey}`] ?? p.nameKey}
                </p>
              </button>
            ))}
          </div>
        </section>

        {discover.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-[var(--text-secondary)]">
              <Compass className="w-4 h-4 text-[var(--accent)]" />
              {(t as any).dashboard_discover ?? 'Discover plugins'}
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
                  <span className="text-[9px] uppercase font-bold text-amber-400 tracking-widest">
                    disabled
                  </span>
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
  let displayStatus = 'Offline';
  let colorClass = 'text-red-500';
  let pulseClass = 'bg-red-500';

  if (status === 'healthy' || status === 'up') {
    displayStatus = language === 'de' ? 'Online' : language === 'ru' ? 'В сети' : 'Online';
    colorClass = 'text-emerald-400';
    pulseClass = 'bg-emerald-400';
  } else if (status === 'starting' || status === 'initializing') {
    displayStatus = language === 'de' ? 'Initialisiert...' : language === 'ru' ? 'Запуск...' : 'Initializing...';
    colorClass = 'text-amber-400';
    pulseClass = 'bg-amber-400';
  } else if (status === 'disabled') {
    displayStatus = language === 'de' ? 'Deaktiviert' : language === 'ru' ? 'Отключен' : 'Disabled';
    colorClass = 'text-gray-500';
    pulseClass = 'bg-gray-500';
  } else if (status === 'checking') {
    displayStatus = language === 'de' ? 'Verbindet...' : language === 'ru' ? 'Проверка...' : 'Connecting...';
    colorClass = 'text-blue-400';
    pulseClass = 'bg-blue-400';
  } else {
    displayStatus = language === 'de' ? 'Offline' : language === 'ru' ? 'Не в сети' : 'Offline';
    colorClass = 'text-red-500';
    pulseClass = 'bg-red-500';
  }

  return (
    <div className="glass-card rounded-lg p-4 border border-white/5 flex flex-col justify-between h-24 hover:border-white/10 hover:bg-white/5 transition-all duration-300">
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
