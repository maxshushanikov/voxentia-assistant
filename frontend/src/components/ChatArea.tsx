import { useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Zap, Shield, Copy, Pencil, RefreshCw, Cpu, GitBranch } from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';
import type { ReactNode } from 'react';

import { useTranslation } from '../i18n/context';
import { cn } from '../utils/cn';
import type { Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
  onTileClick?: (prompt: string) => void;
  onEditMessage?: (id: string, content: string) => void;
  onRegenerate?: (id: string) => void;
}

export default function ChatArea({ messages, isThinking, onTileClick, onEditMessage, onRegenerate }: ChatAreaProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStreaming = messages.some((m) => m.streaming);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'greeting')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-primary)]">
        <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <Sparkles className="w-8 h-8 text-[var(--accent)]" />
        </div>
        <h1 className="text-4xl font-light text-[var(--text-primary)] mb-4 tracking-tight text-center">
          {t.greeting.split(',')[0]}
        </h1>
        <p className="text-[var(--text-secondary)] text-center max-w-md mb-12">{t.chat_welcomeSubtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          <WelcomeTile
            icon={<Zap className="w-4 h-4 text-[var(--warning)]" />}
            title={t.chat_quickAnalysis}
            desc={t.chat_quickAnalysisDesc}
            onClick={() => onTileClick?.((t as unknown as Record<string, string>).chat_quickAnalysisPrompt || t.chat_quickAnalysis)}
          />
          <WelcomeTile
            icon={<MessageSquare className="w-4 h-4 text-[var(--accent)]" />}
            title={t.chat_creativeWriting}
            desc={t.chat_creativeWritingDesc}
            onClick={() => onTileClick?.((t as unknown as Record<string, string>).chat_creativeWritingPrompt || t.chat_creativeWriting)}
          />
          <WelcomeTile
            icon={<Shield className="w-4 h-4 text-[var(--success)]" />}
            title={t.chat_privateSecure}
            desc={t.chat_privateSecureDesc}
            onClick={() => onTileClick?.((t as unknown as Record<string, string>).chat_privateSecurePrompt || t.chat_privateSecure)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex flex-col mb-8', msg.role === 'user' ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-[12px] p-4 text-[15px] leading-relaxed relative group',
                msg.role === 'user'
                  ? 'bg-[var(--accent)]/8 border border-[var(--accent)]/20 text-[var(--text-primary)] shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--text-primary)]',
              )}
            >
              {msg.role === 'assistant' && (
                <div className="absolute -right-8 top-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
                    title="Copy message"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRegenerate?.(msg.id)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
                    title="Andere Antwort generieren (Branch)"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRegenerate?.(msg.id)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
                    title="Antwort neu generieren"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="absolute -left-8 top-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => onEditMessage?.(msg.id, msg.content)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
                    title="Edit message"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {msg.comparison ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-[60vw]">
                  <div className="flex flex-col border-r border-black/10 dark:border-white/10 pr-6 last:border-r-0 last:pr-0">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-black/5 dark:border-b-white/5">
                      <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {msg.comparison.modelA}
                      </span>
                      {msg.comparison.streamingA && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                      )}
                      {msg.comparison.latencyA != null && !msg.comparison.streamingA && (
                        <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
                          {msg.comparison.latencyA} ms
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-x-auto min-w-0">
                      <MarkdownMessage content={msg.comparison.contentA} />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-black/5 dark:border-b-white/5">
                      <Cpu className="w-3.5 h-3.5 text-[var(--warning)]" />
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {msg.comparison.modelB}
                      </span>
                      {msg.comparison.streamingB && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-ping" />
                      )}
                      {msg.comparison.latencyB != null && !msg.comparison.streamingB && (
                        <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
                          {msg.comparison.latencyB} ms
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-x-auto min-w-0">
                      <MarkdownMessage content={msg.comparison.contentB} />
                    </div>
                  </div>
                </div>
              ) : (
                <MarkdownMessage content={msg.content} />
              )}
              {msg.role === 'assistant' && msg.intentConfidence != null && msg.intentConfidence < 0.6 && (
                <p className="mt-2 text-[11px] text-[var(--warning)] italic">
                  Ich bin mir bei der Interpretation unsicher — meintest du das so?
                </p>
              )}
              {msg.role === 'assistant' && msg.ragSources && msg.ragSources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                  {msg.ragSources.map((src, i) => (
                    <p key={`${src.filename}-${src.chunk_index}-${i}`} className="text-[11px] text-[var(--text-secondary)]">
                      📄 {src.filename}
                      {src.page != null ? `, Seite ${src.page}` : ''}
                      {' '}
                      <span className="opacity-60">({Math.round(src.score * 100)}%)</span>
                    </p>
                  ))}
                </div>
              )}
              {msg.timestamp && (
                <div className={cn("text-[10px] mt-2 opacity-40 select-none", msg.role === 'user' ? "text-right" : "text-left")}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {msg.streaming && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-[var(--accent)] animate-pulse"
                  aria-hidden
                />
              )}
            </div>
          </div>
        ))}
        {isThinking && !hasStreaming && (
          <div className="flex justify-start">
            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full px-4 py-2 flex space-x-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-[var(--text-secondary)] ml-2">{t.thinking}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function WelcomeTile({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string, onClick?: () => void }) {
  return (
    <div onClick={onClick} className="glass-card rounded-[8px] p-4 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
    </div>
  );
}
