import { Plus, Paperclip, Mic, Send } from 'lucide-react';
import { useRef, useEffect } from 'react';

import { useTranslation } from '../i18n/context';
import { cn } from '../utils/cn';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [inputText]);

  return (
    <div className="p-6 bg-[var(--bg-primary)]/50 backdrop-blur-md">
      <div className={cn(
        'bg-[var(--bg-secondary)]/80 border border-black/10 dark:border-white/10 rounded-[8px] p-2 flex flex-col shadow-2xl transition-all',
        isRecording ? 'border-red-500/50 ring-1 ring-red-500/20' : 'focus-within:border-[var(--accent)]/55',
      )}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={isRecording ? t.listening : t.placeholder}
          className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none focus:ring-0 resize-none min-h-[40px] text-sm py-2 px-3"
          rows={1}
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onNewChat}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onFileClick}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onMicClick}
              className={cn(
                'p-2 transition-colors relative',
                isRecording ? 'text-red-500' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]',
              )}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Mic className="w-4 h-4" />
              {isRecording && <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />}
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={isThinking}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
