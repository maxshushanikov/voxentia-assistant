import { Plus, Paperclip, Mic, Send } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useTranslation } from '../i18n/context';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatInputProps {
  inputText: string;
  setInputText: (t: string) => void;
  onSend: () => void;
  onMicClick: () => void;
  onFileClick: () => void;
  onNewChat: () => void;
  isRecording: boolean;
  isThinking: boolean;
}

export default function ChatInput({
  inputText, setInputText,
  onSend, onMicClick, onFileClick, onNewChat,
  isRecording, isThinking,
}: ChatInputProps) {
  const { t } = useTranslation();
  return (
    <div className="p-6 bg-[#0b0e14]/50 backdrop-blur-md">
      <div className={cn(
        "bg-[#161821]/80 border border-white/10 rounded-[8px] p-2 flex flex-col shadow-2xl transition-all",
        isRecording ? "border-red-500/50 ring-1 ring-red-500/20" : "focus-within:border-[#2979ff55]"
      )}>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={isRecording ? t.listening : t.placeholder}
          className="w-full bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-0 resize-none min-h-[40px] text-sm py-2 px-3"
          rows={1}
        />
        <div className="flex items-center justify-between px-2 pb-1">
           <div className="flex items-center space-x-1">
             <button 
                onClick={onNewChat}
                className="p-2 text-gray-500 hover:text-white transition-colors"
             >
                <Plus className="w-4 h-4" />
             </button>
             <button 
                onClick={onFileClick}
                className="p-2 text-gray-500 hover:text-white transition-colors"
             >
                <Paperclip className="w-4 h-4" />
             </button>
           </div>
           <div className="flex items-center space-x-2">
             <button 
               onClick={onMicClick}
               className={cn(
                 "p-2 transition-colors relative",
                 isRecording ? "text-red-500" : "text-gray-500 hover:text-[#2979ff]"
               )}
             >
               <Mic className="w-4 h-4" />
               {isRecording && <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />}
             </button>
             <button 
                onClick={onSend} 
                disabled={isThinking}
                className="p-2 text-gray-500 hover:text-[#2979ff] transition-colors disabled:opacity-50"
             >
                <Send className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
