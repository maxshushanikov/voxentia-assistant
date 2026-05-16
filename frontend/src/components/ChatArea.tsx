import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, MessageSquare, Zap, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useTranslation } from '../i18n/context';
import type { Message } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
}

export default function ChatArea({ messages, isThinking }: ChatAreaProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'greeting')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0e14]">
        <div className="w-16 h-16 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <Sparkles className="w-8 h-8 text-[#2979ff]" />
        </div>
        <h1 className="text-4xl font-light text-white mb-4 tracking-tight text-center">
          {t.greeting.split(',')[0]}
        </h1>
        <p className="text-gray-500 text-center max-w-md mb-12">{t.chat_welcomeSubtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          <WelcomeTile
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            title={t.chat_quickAnalysis}
            desc={t.chat_quickAnalysisDesc}
          />
          <WelcomeTile
            icon={<MessageSquare className="w-4 h-4 text-[#2979ff]" />}
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
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
                  ? 'bg-[#2979ff11] border border-[#2979ff22] text-blue-50 shadow-sm'
                  : 'bg-white/5 border border-white/10 text-gray-300',
              )}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  code: ({ children }) => (
                    <code className="bg-white/10 px-1 rounded text-xs">{children}</code>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex space-x-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-[#2979ff] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[#2979ff] rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-[#2979ff] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-gray-500 ml-2">{t.thinking}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function WelcomeTile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-card rounded-[8px] p-4 border border-white/5 hover:border-[#2979ff33] transition-all cursor-pointer group">
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-white group-hover:text-[#2979ff] transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}

