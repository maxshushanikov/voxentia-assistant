import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, MessageSquare, Zap, Shield, Copy, Pencil, RefreshCw, Cpu } from 'lucide-react';
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
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            title={t.chat_quickAnalysis}
            desc={t.chat_quickAnalysisDesc}
            onClick={() => onTileClick?.((t as any).chat_quickAnalysisPrompt || t.chat_quickAnalysis)}
          />
          <WelcomeTile
            icon={<MessageSquare className="w-4 h-4 text-[var(--accent)]" />}
            title={t.chat_creativeWriting}
            desc={t.chat_creativeWritingDesc}
            onClick={() => onTileClick?.((t as any).chat_creativeWritingPrompt || t.chat_creativeWriting)}
          />
          <WelcomeTile
            icon={<Shield className="w-4 h-4 text-emerald-500" />}
            title={t.chat_privateSecure}
            desc={t.chat_privateSecureDesc}
            onClick={() => onTileClick?.((t as any).chat_privateSecurePrompt || t.chat_privateSecure)}
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
                    title="Regenerate message"
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
                      <Cpu className="w-3.5 h-3.5 text-[#2979ff]" />
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {msg.comparison.modelA}
                      </span>
                      {msg.comparison.streamingA && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2979ff] animate-ping" />
                      )}
                    </div>
                    <div className="flex-1 overflow-x-auto min-w-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          code: (props) => {
                            const { children, className, node, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <div className="relative group/code mt-2 mb-4">
                                <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                    className="bg-black/30 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded border border-white/10"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <code className={cn("block bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 p-4 rounded text-xs overflow-x-auto", className)} {...rest}>
                                  {children}
                                </code>
                              </div>
                            ) : (
                              <code className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/5 px-1.5 py-0.5 rounded text-[13px]" {...rest}>
                                {children}
                              </code>
                            )
                          },
                        }}
                      >
                        {msg.comparison.contentA}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-black/5 dark:border-b-white/5">
                      <Cpu className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {msg.comparison.modelB}
                      </span>
                      {msg.comparison.streamingB && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </div>
                    <div className="flex-1 overflow-x-auto min-w-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          code: (props) => {
                            const { children, className, node, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <div className="relative group/code mt-2 mb-4">
                                <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                    className="bg-black/30 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded border border-white/10"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <code className={cn("block bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 p-4 rounded text-xs overflow-x-auto", className)} {...rest}>
                                  {children}
                                </code>
                              </div>
                            ) : (
                              <code className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/5 px-1.5 py-0.5 rounded text-[13px]" {...rest}>
                                {children}
                              </code>
                            )
                          },
                        }}
                      >
                        {msg.comparison.contentB}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: (props) => {
                      const { children, className, node, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <div className="relative group/code mt-2 mb-4">
                          <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                              className="bg-black/30 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20 text-white text-[10px] px-2 py-1 rounded border border-white/10"
                            >
                              Copy
                            </button>
                          </div>
                          <code className={cn("block bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 p-4 rounded text-xs overflow-x-auto", className)} {...rest}>
                            {children}
                          </code>
                        </div>
                      ) : (
                        <code className="bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/5 px-1.5 py-0.5 rounded text-[13px]" {...rest}>
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
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
