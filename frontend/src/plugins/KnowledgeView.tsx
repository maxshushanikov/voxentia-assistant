import { Brain, Search } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ApiError, apiFetch } from '../api/client';
import { useAppStore } from '../store/appStore';

interface Edge {
  id: string;
  subject: string;
  relation: string;
  object: string;
  confidence: number;
}

export default function KnowledgeView() {
  const sessionId = useAppStore((s) => s.sessionId);
  const [entity, setEntity] = useState('');
  const [edges, setEdges] = useState<Edge[]>([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = entity.trim()
        ? `?session_id=${encodeURIComponent(sessionId)}&entity=${encodeURIComponent(entity)}`
        : `?session_id=${encodeURIComponent(sessionId)}`;
      const data = await apiFetch<{ edges: Edge[]; graph_prompt: string }>(
        `/api/v1/knowledge/graph${q}`,
      );
      setEdges(data.edges);
      setPrompt(data.graph_prompt || '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [sessionId, entity]);

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-[var(--accent)]" />
          Wissensgraph
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Persistente Subjekt–Relation–Objekt-Triplets aus deinen Gesprächen (Session: {sessionId})
        </p>
      </div>

      <div className="flex gap-2 mb-6 max-w-xl">
        <input
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          placeholder="Entität suchen (z.B. Voxentia, Max…)"
          className="flex-1 px-3 py-2 rounded-[4px] border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm"
        />
        <button
          type="button"
          onClick={() => void loadGraph()}
          disabled={loading}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-[4px] text-xs font-bold uppercase flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Laden
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </p>
      )}

      {prompt && (
        <pre className="mb-6 p-4 text-xs text-[var(--text-secondary)] bg-black/5 dark:bg-white/5 rounded-[8px] border border-black/5 dark:border-white/5 whitespace-pre-wrap">
          {prompt}
        </pre>
      )}

      <div className="glass-card rounded-[8px] border border-black/5 dark:border-white/5 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-[var(--text-secondary)]">Laden…</p>
        ) : edges.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-secondary)]">
            Noch keine Kanten. Chatte mit Voxentia — Triplets werden automatisch extrahiert.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                  Subjekt
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                  Relation
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                  Objekt
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {edges.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-sm">{e.subject}</td>
                  <td className="px-4 py-3 text-sm text-[var(--accent)]">{e.relation}</td>
                  <td className="px-4 py-3 text-sm">{e.object}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                    {Math.round(e.confidence * 100)}%
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
