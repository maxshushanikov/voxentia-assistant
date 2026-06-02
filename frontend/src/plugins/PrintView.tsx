import { useCallback, useEffect, useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';

import { ApiError, apiFetch } from '../api/client';
import { useTranslation } from '../i18n/context';

interface PrintJob {
  id: number;
  title: string;
  status: string;
  output_path?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function PrintView() {
  const { t } = useTranslation();

  const [html, setHtml] = useState('<h1>Voxentia PDF</h1>\n<p>' + ((t as unknown as Record<string,string>).print_default_html ?? 'Generate printable documents from HTML content.') + '</p>');
  const [title, setTitle] = useState((t as unknown as Record<string,string>).plugin_print ?? 'Voxentia Report');
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PrintJob[]>('/api/v1/print/queue');
      setJobs(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load print jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const onDownloadPdf = async () => {
    if (!html.trim()) {
      setError((t as unknown as Record<string,string>).error_enter_html ?? 'Please enter HTML content.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage((t as unknown as Record<string,string>).print_generating ?? 'Generating PDF...');

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/v1/print/html-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ html, title }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? body?.message ?? ((t as unknown as Record<string,string>).error_generate_pdf ?? 'Failed to generate PDF'));
      }

      const blob = await response.blob();
      downloadBlob(`${title || 'document'}.pdf`, blob);
      setMessage((t as unknown as Record<string,string>).print_download_started ?? 'PDF download started.');
    } catch (e) {
      setError(e instanceof Error ? e.message : (t as unknown as Record<string,string>).error_download_failed ?? 'Download failed');
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  const onQueuePrint = async () => {
    if (!html.trim()) {
      setError('Please enter HTML content.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage((t as unknown as Record<string,string>).print_enqueuing ?? 'Enqueuing print job...');

    try {
      await apiFetch<PrintJob>('/api/v1/print/queue', {
        method: 'POST',
        body: JSON.stringify({ html, title }),
      });
      setMessage((t as unknown as Record<string,string>).print_enqueued ?? 'Print job enqueued successfully.');
      await loadJobs();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (t as unknown as Record<string,string>).error_enqueue_failed ?? 'Failed to enqueue print job');
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  const onDownloadJob = async (job: PrintJob) => {
    if (!job.output_path) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(((t as unknown as Record<string,string>).print_downloading ?? 'Downloading {title}...').replace('{title}', job.title));

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`/api/v1/print/queue/${job.id}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? body?.message ?? ((t as unknown as Record<string,string>).error_download_failed ?? 'Failed to download PDF'));
      }

      const blob = await response.blob();
      downloadBlob(`${job.title || 'print_job'}.pdf`, blob);
      setMessage(((t as unknown as Record<string,string>).print_downloaded ?? 'Downloaded {title}.').replace('{title}', job.title));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2 flex items-center gap-3">
            <Printer className="w-8 h-8 text-[var(--accent)]" /> {(t as unknown as Record<string,string>).plugin_print ?? 'Print Manager'}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {(t as unknown as Record<string,string>).plugin_print_sub ?? 'Create PDFs from HTML and manage queued print jobs.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadJobs()}
          className="flex items-center gap-2 px-4 py-2 rounded-[6px] bg-black/10 border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> {(t as unknown as Record<string,string>).print_refresh ?? 'Refresh jobs'}
        </button>
      </div>

      {(error || message) && (
        <div className="mb-4 rounded-[8px] border px-4 py-3 text-sm">
          {error ? (
            <p className="text-[var(--danger)]">{error}</p>
          ) : (
            <p className="text-[var(--accent)]">{message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-8">
        <section className="glass-card rounded-[12px] border border-black/5 dark:border-white/10 p-6 bg-black/5">
          <div className="mb-5">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
              {(t as unknown as Record<string,string>).common_name ?? 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[8px] border border-black/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 transition-colors"
            />
          </div>
          <div className="mb-5">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
              {(t as unknown as Record<string,string>).print_html_content ?? 'HTML Content'}
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={14}
              className="w-full min-h-[320px] resize-none rounded-[12px] border border-black/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)]/40 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={busy}
                className="px-5 py-3 btn-accent rounded-[8px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                <Download className="w-4 h-4 mr-2" /> {(t as unknown as Record<string,string>).print_download_button ?? 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={onQueuePrint}
                disabled={busy}
                className="px-5 py-3 border border-[var(--accent)]/30 text-[var(--accent)] rounded-[8px] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[var(--accent)]/10 disabled:opacity-60"
              >
                {(t as unknown as Record<string,string>).print_queue_button ?? 'Queue print job'}
              </button>
          </div>
        </section>

        <section className="glass-card rounded-[12px] border border-black/5 dark:border-white/10 p-6 bg-black/5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Print queue</h2>
              <p className="text-[var(--text-secondary)] text-xs">Recent jobs and download links for completed PDFs.</p>
            </div>
            <span className="text-[var(--text-secondary)] text-[10px] uppercase tracking-[0.2em]">
              {loading ? 'Loading…' : `${jobs.length} jobs`}
            </span>
          </div>

          {loading ? (
            <p className="text-[var(--text-secondary)] text-sm">Loading jobs…</p>
          ) : jobs.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm">No print jobs yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-[10px] border border-black/10 bg-black/10 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{job.title}</p>
                      <p className="text-[var(--text-secondary)] text-[11px] mt-1">Job #{job.id}</p>
                    </div>
                    <span className={
                      `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] ${job.status === 'completed' ? 'bg-[rgba(34,197,94,0.14)] text-[var(--success)]' : job.status === 'failed' ? 'bg-[rgba(248,113,113,0.14)] text-[var(--danger)]' : 'bg-[rgba(59,130,246,0.14)] text-[var(--accent)]'}`
                    }>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[var(--text-secondary)] text-[11px]">
                    <span>{job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      {job.output_path && job.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => void onDownloadJob(job)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-[6px] border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] uppercase tracking-[0.18em] hover:bg-[var(--accent)]/10"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      ) : (
                        <span>{job.output_path ? 'Preparing…' : 'Waiting for render'}</span>
                      )}
                    </div>
                  </div>
                  {job.error_message && (
                    <p className="mt-3 text-[var(--danger)] text-[11px]">{job.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
