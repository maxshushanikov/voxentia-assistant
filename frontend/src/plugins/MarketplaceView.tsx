import { Download, Package } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ApiError, apiFetch } from '../api/client';

interface CatalogPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  installed: boolean;
  installable: boolean;
  builtin?: boolean;
}

export default function MarketplaceView() {
  const [plugins, setPlugins] = useState<CatalogPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ plugins: CatalogPlugin[] }>('/api/v1/marketplace/catalog');
      setPlugins(data.plugins);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Catalog load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const install = async (id: string) => {
    setMessage(null);
    try {
      const res = await apiFetch<{ message?: string; restart_required?: boolean }>(
        '/api/v1/marketplace/install',
        { method: 'POST', body: JSON.stringify({ plugin_id: id }) },
      );
      setMessage(
        (res.message || 'Installed') +
          (res.restart_required ? ' — Backend-Neustart empfohlen.' : ''),
      );
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Install failed');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-[var(--accent)]" />
          Plugin Marketplace
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Katalog verfügbarer Plugins — Installation aktualisiert plugin_config.json
        </p>
      </div>

      {message && (
        <p className="mb-4 text-sm alert-success rounded px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm alert-danger rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-4 max-w-3xl">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Laden…</p>
        ) : (
          plugins.map((p) => (
            <div
              key={p.id}
              className="glass-card p-5 rounded-[8px] border border-black/5 dark:border-white/5 flex justify-between items-start gap-4"
            >
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">{p.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  v{p.version} · {p.author}
                  {p.builtin ? ' · Built-in' : ''}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{p.description}</p>
              </div>
              {p.installed ? (
                <span className="text-[10px] uppercase tracking-wider text-[var(--success)] shrink-0">
                  Installiert
                </span>
              ) : p.installable ? (
                <button
                  type="button"
                  onClick={() => void install(p.id)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 btn-accent rounded text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
