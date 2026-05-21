import { Download, FileJson, FileText, FileType } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <div className="hidden sm:block relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="Export chat"
      >
        <Download className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 rounded-[4px] shadow-xl z-50 p-1">
          <button
            type="button"
            onClick={() => void exportChat('md')}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <FileText className="w-3.5 h-3.5" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => void exportChat('json')}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => void exportChat('pdf')}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <FileType className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
