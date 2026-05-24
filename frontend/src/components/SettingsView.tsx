import { useState } from 'react';
import { Radio, Shield, User, Sparkles, Upload } from 'lucide-react';
import type { Language, Speaker, Personality } from '../types';
import { useTranslation } from '../i18n/context';
import { useAppStore } from '../store/appStore';
import { LANG_OPTIONS, SPEAKER_OPTIONS, PERSONALITY_OPTIONS } from '../config/options';

interface SettingsViewProps {
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
}

export default function SettingsView({
  language,
  setLanguage,
  speaker,
  setSpeaker,
  personality,
  setPersonality,
}: SettingsViewProps) {
  const { t } = useTranslation();
  const streamEnabled = useAppStore((s) => s.streamEnabled);
  const setStreamEnabled = useAppStore((s) => s.setStreamEnabled);
  const avatarSource = useAppStore((s) => s.avatarSource);
  const setAvatarSource = useAppStore((s) => s.setAvatarSource);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleGlbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/avatar/custom', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadSuccess(true);
        setAvatarSource('custom');
      } else {
        const errData = await res.json();
        setUploadError(errData.detail || 'Upload failed');
      }
    } catch {
      setUploadError('Failed to upload custom avatar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.settings}</h1>
        <p className="text-[var(--text-secondary)] text-sm">{t.settings_customize}</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <section className="glass-card rounded-[8px] p-8 border border-black/5 dark:border-white/5">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 text-[var(--accent)] mr-3" />
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{t.settings_identityVoice}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                {t.language}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {LANG_OPTIONS.map(({ value, key }) => (
                  <option key={value} value={value} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    {t[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                {t.voice}
              </label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value as Speaker)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {SPEAKER_OPTIONS.map(({ value, key }) => (
                  <option key={value} value={value} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    {t[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                {t.personality}
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value as Personality)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[4px] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {PERSONALITY_OPTIONS.map((pers) => (
                  <option key={pers} value={pers} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    {t[`pers_${pers}` as keyof typeof t] as string}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[8px] p-8 border border-black/5 dark:border-white/5">
          <div className="flex items-center mb-6">
            <Sparkles className="w-5 h-5 text-[var(--warning)] mr-3" />
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Avatar Settings</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/2 rounded-[4px] border border-black/5 dark:border-white/5">
              <div className="flex items-center space-x-4">
                <div className="text-[var(--text-secondary)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-medium">Use Custom 3D Avatar (GLB)</p>
                  <p className="text-xs text-[var(--text-secondary)]">Enable uploading and using a custom GLB avatar model.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={avatarSource === 'custom'}
                onChange={(e) => setAvatarSource(e.target.checked ? 'custom' : 'default')}
                className="w-4 h-4 rounded border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
            </div>

            {avatarSource === 'custom' && (
              <div className="p-4 bg-black/5 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[4px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Upload Custom Avatar (.glb)
                  </span>
                  {uploading && <span className="text-xs text-[var(--accent)]">Uploading...</span>}
                  {uploadSuccess && <span className="text-xs text-[var(--success)]">Upload successful!</span>}
                  {uploadError && <span className="text-xs text-[var(--danger)]">{uploadError}</span>}
                </div>

                <div className="flex items-center justify-center border border-dashed border-black/20 dark:border-white/20 rounded-[4px] p-6 hover:border-[var(--accent)] transition-all relative cursor-pointer">
                  <input
                    type="file"
                    accept=".glb"
                    onChange={handleGlbUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={uploading}
                  />
                  <div className="text-center space-y-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-[var(--text-secondary)] mx-auto animate-bounce" />
                    <p className="text-xs text-[var(--text-secondary)]">
                      Drag & drop or click to upload your custom 3D model (GLB format, max 30MB)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="glass-card rounded-[8px] p-8 border border-black/5 dark:border-white/5">
          <div className="flex items-center mb-6">
            <Shield className="w-5 h-5 text-[var(--success)] mr-3" />
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{t.settings_securityPrivacy}</h3>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              icon={<Radio className="w-4 h-4" />}
              label={(t as unknown as Record<string, string>).settings_streamResponses ?? 'Stream responses'}
              description={
                (t as unknown as Record<string, string>).settings_streamResponsesDesc ??
                'Show tokens as they are generated (LLM direct; plugins use standard mode).'
              }
              checked={streamEnabled}
              onChange={setStreamEnabled}
            />
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            className="px-8 py-3 btn-accent rounded-[4px] text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20 uppercase tracking-widest"
          >
            {t.common_saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  icon,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/2 rounded-[4px] border border-black/5 dark:border-white/5">
      <div className="flex items-center space-x-4">
        <div className="text-[var(--text-secondary)]">{icon}</div>
        <div>
          <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
          <p className="text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-4 h-4 rounded border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)]"
      />
    </div>
  );
}
