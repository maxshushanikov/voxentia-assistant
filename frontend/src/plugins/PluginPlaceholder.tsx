import { Zap } from 'lucide-react';

import { useTranslation } from '../i18n/context';

export default function PluginPlaceholder({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-6">
        <Zap className="w-8 h-8 text-[#2979ff] animate-pulse" />
      </div>
      <h2 className="text-2xl font-light text-white mb-2">{t.common_featureDev}</h2>
      <p className="text-gray-500 max-w-md mb-8">{t.common_featureDevDesc}</p>
      <button
        type="button"
        onClick={onBack}
        className="px-6 py-2 border border-white/10 rounded-[4px] text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
      >
        {t.common_backDashboard}
      </button>
    </div>
  );
}
