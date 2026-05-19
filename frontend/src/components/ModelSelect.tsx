import { Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiFetch } from '../api/client';
import { useAppStore } from '../store/appStore';

interface ModelsResponse {
  models: { name: string }[];
  default: string;
}

export default function ModelSelect() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<ModelsResponse>('/api/v1/models')
      .then((data) => {
        const names = data.models.map((m) => m.name);
        setModels(names);
        if (selectedModel && !names.includes(selectedModel)) {
          setSelectedModel(data.default);
        } else if (!selectedModel && data.default) {
          setSelectedModel(data.default);
        }
      })
      .catch(() => setModels([]));
  }, [selectedModel, setSelectedModel]);

  if (models.length === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <Cpu className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
      <select
        value={selectedModel ?? ''}
        onChange={(e) => setSelectedModel(e.target.value || null)}
        className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[4px] text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2 py-1.5 max-w-[140px] truncate focus:outline-none focus:border-[var(--accent)] transition-colors"
        title="LLM model"
      >
        {models.map((name) => (
          <option key={name} value={name} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
