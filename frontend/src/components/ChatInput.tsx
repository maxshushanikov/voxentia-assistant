import { Plus, Paperclip, Mic, Send, Loader2 } from 'lucide-react';
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
  tokenCount?: number | null;
  tokenBudget?: number;
}

export default function ChatInput({
  inputText, setInputText,
  onSend, onMicClick, onFileClick, onNewChat,
  isRecording, isThinking,
  tokenCount = 0,
  tokenBudget = 8192,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const remainingTokens = typeof tokenCount === 'number' ? Math.max(0, tokenBudget - tokenCount) : null;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [inputText]);

  return (
    <div className="p-6 bg-[var(--bg-primary)]/50 backdrop-blur-[18px] border-t border-[rgba(255,255,255,0.08)] transition-colors duration-200">
      <div className={cn(
        'bg-[var(--bg-secondary)]/88 border border-[rgba(255,255,255,0.1)] rounded-[18px] p-3 flex flex-col shadow-[0_28px_80px_-42px_rgba(15,23,42,0.75)] transition-all duration-200',
        isRecording
          ? 'border-[var(--danger)]/50 ring-1 ring-[var(--danger)]/20'
          : 'focus-within:border-[var(--accent)]/55',
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
          className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none focus:ring-0 resize-none min-h-[48px] max-h-[220px] text-sm py-3 px-4 rounded-[14px] transition-all duration-200 ease-out"
          rows={1}
          aria-label={t.send_message}
        />
        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[var(--text-secondary)]">
          <span className="opacity-70">{(t as unknown as Record<string, string>).common_shortcutHint || 'Enter to send, Shift+Enter for newline'}</span>
          <span className="text-[10px] opacity-70 text-right">{`${typeof tokenCount === 'number' ? tokenCount : '—'} tokens used · ${typeof remainingTokens === 'number' ? remainingTokens : '—'} remaining`}</span>
        </div>
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onNewChat}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={t.newChat}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onFileClick}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={t.attach_file}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {isRecording && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-[var(--danger)]/10 rounded-full border border-[var(--danger)]/20 mr-1 animate-pulse">
                <span className="text-[10px] text-[var(--danger)] font-medium uppercase tracking-wider">{t.listening}</span>
                <div className="flex items-end space-x-[2px] h-[8px]">
                  <span className="w-[1.5px] bg-[var(--danger)] rounded-full animate-[soundwave_0.8s_infinite_ease-in-out]" style={{ height: '30%', animationDelay: '0.1s', transformOrigin: 'bottom' }} />
                  <span className="w-[1.5px] bg-[var(--danger)] rounded-full animate-[soundwave_0.8s_infinite_ease-in-out]" style={{ height: '70%', animationDelay: '0.3s', transformOrigin: 'bottom' }} />
                  <span className="w-[1.5px] bg-[var(--danger)] rounded-full animate-[soundwave_0.8s_infinite_ease-in-out]" style={{ height: '100%', animationDelay: '0.5s', transformOrigin: 'bottom' }} />
                  <span className="w-[1.5px] bg-[var(--danger)] rounded-full animate-[soundwave_0.8s_infinite_ease-in-out]" style={{ height: '60%', animationDelay: '0.2s', transformOrigin: 'bottom' }} />
                  <span className="w-[1.5px] bg-[var(--danger)] rounded-full animate-[soundwave_0.8s_infinite_ease-in-out]" style={{ height: '40%', animationDelay: '0.4s', transformOrigin: 'bottom' }} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onMicClick}
              className={cn(
                'p-2 transition-colors relative',
                isRecording ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]',
              )}
              title={isRecording ? t.stop_recording : t.start_recording}
              aria-label={isRecording ? t.stop_recording : t.start_recording}
              role="button"
            >
              <Mic className="w-4 h-4" />
              {isRecording && <span className="absolute inset-0 rounded-full animate-ping bg-[var(--danger)]/20" />}
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={isThinking}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
              title={t.send_message}
              aria-label={t.send_message}
              role="button"
            >
              {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
