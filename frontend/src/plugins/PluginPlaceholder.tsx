import { Zap } from 'lucide-react';

import { useTranslation } from '../i18n/context';

export default function PluginPlaceholder({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mb-6">
        <Zap className="w-8 h-8 text-[var(--accent)] animate-pulse" />
      </div>
      <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2">{t.common_featureDev}</h2>
      <p className="text-[var(--text-muted)] max-w-md mb-8">{t.common_featureDevDesc}</p>
      <button
        type="button"
        onClick={onBack}
        className="px-6 py-2 border border-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] rounded-[4px] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] transition-all uppercase tracking-widest"
      >
        {t.common_backDashboard}
      </button>
    </div>
  );
}
