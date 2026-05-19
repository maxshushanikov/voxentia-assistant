import { FileText, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, apiFetch } from '../api/client';
import { useTranslation } from '../i18n/context';

interface DocumentSummary {
  filename: string;
  chunks: number;
}

export default function DocumentView() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ documents: DocumentSummary[] }>('/api/v1/documents');
      setDocuments(data.documents);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load documents';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setError(null);
    try {
      await apiFetch('/api/v1/documents/upload', { method: 'POST', body: form });
      await loadDocuments();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed');
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await apiFetch(`/api/v1/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      await loadDocuments();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  };

  return (
    <div
      className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.docs_title}</h1>
          <p className="text-[var(--text-secondary)] text-sm">{t.docs_subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors uppercase tracking-widest"
        >
          <Upload className="w-4 h-4 mr-2" />
          {t.common_uploadFile}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="glass-card rounded-[8px] border border-black/5 dark:border-white/5 overflow-hidden">
        {loading ? (
          <p className="p-6 text-[var(--text-secondary)] text-sm">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="p-6 text-[var(--text-secondary)] text-sm">
            No indexed documents. Drop a PDF here or use Upload.
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                  {t.common_name}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                  Chunks
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] text-right">
                  {t.common_actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {documents.map((doc) => (
                <tr key={doc.filename} className="hover:bg-black/2 dark:hover:bg-black/2 dark:bg-white/2 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-[#2979ff]" />
                      <span className="text-sm text-gray-300 ml-3">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">{doc.chunks}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDelete(doc.filename)}
                      className="p-2 text-[var(--text-secondary)] hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
