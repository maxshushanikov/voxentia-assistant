import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { LayoutGrid } from 'lucide-react';
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
           <LayoutGrid className="w-16 h-16 mb-4" />
           <p className="text-sm font-bold uppercase tracking-widest text-center">{t.myChats}</p>
        </div>
      ) : messages.length === 1 && messages[0].id === 'greeting' ? (
        <div className="h-full flex items-center justify-center">
           <h1 className="text-3xl lg:text-5xl font-light text-white tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
             {messages[0].content}
           </h1>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col space-y-2",
            msg.role === 'user' ? "items-end" : "items-start"
          )}>
            {msg.id !== 'greeting' && (
              <div className={cn(
                "max-w-[85%] rounded-[8px] p-4 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-[#2979ff11] border border-[#2979ff33] text-blue-50" 
                  : "bg-white/5 border border-white/10 text-gray-300"
              )}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))
      )}
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
  );
}
