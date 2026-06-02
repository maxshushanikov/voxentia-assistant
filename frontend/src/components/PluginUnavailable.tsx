import { useTranslation } from '../i18n/context';

export default function PluginUnavailable() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="glass-card rounded-[28px] border border-[rgba(255,255,255,0.08)] p-8 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">{(t as unknown as Record<string,string>).plugin_unavailable_title ?? 'Plugin unavailable'}</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {(t as unknown as Record<string,string>).plugin_unavailable_desc ?? 'The selected plugin is currently disabled on the backend. Enable it in the plugin management settings or open another plugin.'}
        </p>
      </div>
    </div>
  );
}
