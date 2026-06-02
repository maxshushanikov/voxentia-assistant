import { Plus, Paperclip, Mic, Send, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

import { useTranslation } from '../i18n/context';
import { cn } from '../utils/cn';
import MarkdownMessage from './MarkdownMessage';

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
  inputText,
  setInputText,
  onSend,
  onMicClick,
  onFileClick,
  onNewChat,
  isRecording,
  isThinking,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (showPreview) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [inputText, showPreview]);

  const handleSendAndClosePreview = () => {
    onSend();
    setShowPreview(false);
  };

  return (
    <div className="px-6 pb-6 pt-2 bg-transparent relative z-20 w-full shrink-0">
      <div
        className={cn(
          'max-w-4xl mx-auto w-full bg-[rgba(20,24,38,0.72)] border border-[rgba(255,255,255,0.08)] rounded-[26px] p-3 flex flex-col shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300',
          isRecording
            ? 'border-[var(--danger)]/50 ring-1 ring-[var(--danger)]/20'
            : 'focus-within:border-[var(--accent)]/55 focus-within:shadow-[0_24px_70px_rgba(41,121,255,0.15)]',
        )}
      >
        {showPreview ? (
          <div className="w-full bg-black/20 dark:bg-white/3 border border-white/5 text-[var(--text-primary)] min-h-[48px] max-h-[220px] overflow-y-auto text-sm py-3 px-4 rounded-[16px] transition-all scrollbar-hide">
            {inputText.trim() ? (
              <MarkdownMessage content={inputText} />
            ) : (
              <span className="text-[var(--text-secondary)]/40 italic">Nothing to preview yet. Start typing below...</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendAndClosePreview();
              }
            }}
            placeholder={isRecording ? t.listening : t.placeholder}
            className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-0 resize-none min-h-[48px] max-h-[220px] text-sm py-3 px-4 rounded-[14px] transition-all duration-200 ease-out"
            rows={1}
            aria-label={t.send_message}
          />
        )}

        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[var(--text-secondary)] border-t border-white/5 mt-1.5">
          <span className="opacity-60">
            {t.common_shortcutHint || 'Enter to send, Shift+Enter for newline'}
          </span>
          {showPreview && (
            <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider">
              Markdown Preview Active
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onNewChat}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-white/5"
              title={t.newChat}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onFileClick}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-white/5"
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
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'p-2 transition-all rounded-lg',
                showPreview ? 'text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
              )}
              title={showPreview ? 'Write Mode' : 'Markdown Preview'}
              aria-label={showPreview ? 'Write Mode' : 'Markdown Preview'}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onMicClick}
              className={cn(
                'p-2 transition-all rounded-lg relative',
                isRecording ? 'text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-white/5',
              )}
              title={isRecording ? t.stop_recording : t.start_recording}
              aria-label={isRecording ? t.stop_recording : t.start_recording}
              role="button"
            >
              <Mic className="w-4 h-4" />
              {isRecording && <span className="absolute inset-0 rounded-lg animate-ping bg-[var(--danger)]/20" />}
            </button>

            <button
              type="button"
              onClick={handleSendAndClosePreview}
              disabled={isThinking}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-white/5 transition-all rounded-lg disabled:opacity-50"
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
