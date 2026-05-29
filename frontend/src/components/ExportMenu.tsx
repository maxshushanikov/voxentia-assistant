import { Download, FileJson, FileText, FileType, Printer } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { getChatHistory } from '../api/chat';
import { useAppStore } from '../store/appStore';
import {
  downloadText,
  exportAsPDF,
  messagesToJson,
  messagesToMarkdown,
} from '../utils/exportChat';

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useAppStore((s) => s.sessionId);
  const messages = useAppStore((s) => s.messages);

  const exportChat = async (format: 'json' | 'md' | 'pdf') => {
    let exportMessages = messages;
    if (exportMessages.length === 0) {
      try {
        const data = await getChatHistory(sessionId);
        exportMessages = data.history.map((m, i) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          id: `export-${i}`,
        }));
      } catch {
        return;
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      downloadText(`voxentia-${stamp}.json`, messagesToJson(sessionId, exportMessages), 'application/json');
    } else if (format === 'md') {
      downloadText(`voxentia-${stamp}.md`, messagesToMarkdown(exportMessages), 'text/markdown');
    } else {
      await exportAsPDF(exportMessages, `voxentia-${sessionId.slice(0, 12)}`);
    }
    setOpen(false);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="hidden sm:block relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[rgba(255,255,255,0.12)] transition-all duration-200 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.75)]"
        title="Export chat"
      >
        <Download className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-44 glass-card border border-[rgba(255,255,255,0.12)] rounded-[18px] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.55)] z-50 p-2">
          <button
            type="button"
            onClick={() => void exportChat('md')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[14px] hover:bg-[rgba(56,189,248,0.1)] transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => void exportChat('json')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[14px] hover:bg-[rgba(56,189,248,0.1)] transition-all duration-200"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => void exportChat('pdf')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[14px] hover:bg-[rgba(56,189,248,0.1)] transition-all duration-200"
          >
            <FileType className="w-4 h-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => { window.print(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] rounded-[14px] hover:bg-[rgba(56,189,248,0.1)] transition-all duration-200"
          >
            <Printer className="w-4 h-4" />
            Drucken (Browser)
          </button>
        </div>
      )}
    </div>
  );
}
