import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, MessageSquare, Zap, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslation } from '../i18n/context';
import { cn } from '../utils/cn';
import type { Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
}

export default function ChatArea({ messages, isThinking }: ChatAreaProps) {
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
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            title={t.chat_quickAnalysis}
            desc={t.chat_quickAnalysisDesc}
          />
          <WelcomeTile
            icon={<MessageSquare className="w-4 h-4 text-[var(--accent)]" />}
            title={t.chat_creativeWriting}
            desc={t.chat_creativeWritingDesc}
          />
          <WelcomeTile
            icon={<Shield className="w-4 h-4 text-emerald-500" />}
            title={t.chat_privateSecure}
            desc={t.chat_privateSecureDesc}
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
                'max-w-[85%] rounded-[12px] p-4 text-[15px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--accent)]/8 border border-[var(--accent)]/20 text-[var(--text-primary)] shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[var(--text-primary)]',
              )}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  code: ({ children }) => (
                    <code className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs">{children}</code>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
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

function WelcomeTile({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="glass-card rounded-[8px] p-4 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 transition-all cursor-pointer group">
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
