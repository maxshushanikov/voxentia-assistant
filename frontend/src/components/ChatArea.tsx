import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, MessageSquare, Zap, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { translations } from '../translations';
import type { Message, Language } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatAreaProps {
  messages: Message[];
  isThinking: boolean;
  language: Language;
}

export default function ChatArea({ messages, isThinking, language }: ChatAreaProps) {
  const t = translations[language];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
         <p className="text-gray-500 text-center max-w-md mb-12">
            How can I assist you today? Start a new conversation or explore your plugins.
         </p>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            <WelcomeTile icon={<Zap className="w-4 h-4 text-amber-500" />} title="Quick Analysis" desc="Analyze complex data instantly." />
            <WelcomeTile icon={<MessageSquare className="w-4 h-4 text-[#2979ff]" />} title="Creative Writing" desc="Draft emails or articles." />
            <WelcomeTile icon={<Shield className="w-4 h-4 text-emerald-500" />} title="Private & Secure" desc="Running on your local hardware." />
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col mb-8",
            msg.role === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "max-w-[85%] rounded-[12px] p-4 text-[15px] leading-relaxed",
              msg.role === 'user' 
                ? "bg-[#2979ff11] border border-[#2979ff22] text-blue-50 shadow-sm" 
                : "bg-white/5 border border-white/10 text-gray-300"
            )}>
              <ReactMarkdown 
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  code: ({ children }) => <code className="bg-white/10 px-1 rounded text-xs">{children}</code>
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
               <span className="text-[10px] uppercase font-bold text-gray-500">{t.thinking}</span>
               <div className="w-1 h-1 bg-[#2979ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
               <div className="w-1 h-1 bg-[#2979ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
               <div className="w-1 h-1 bg-[#2979ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function WelcomeTile({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="glass-card rounded-[8px] p-4 border border-white/5 hover:border-[#2979ff33] transition-all cursor-pointer group">
       <div className="mb-3">{icon}</div>
       <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-[#2979ff] transition-colors">{title}</h4>
       <p className="text-[11px] text-gray-600 leading-tight">{desc}</p>
    </div>
  );
}
