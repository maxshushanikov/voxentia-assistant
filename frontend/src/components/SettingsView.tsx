import { useState } from 'react';
import { User, Sparkles, Upload, Languages, Volume2, UserCheck } from 'lucide-react';
import { speakerGenderMap, type Language, type Speaker, type Personality } from '../types';
import { useTranslation } from '../i18n/context';
import { useAppStore } from '../store/appStore';
import { LANG_OPTIONS, SPEAKER_OPTIONS, PERSONALITY_OPTIONS } from '../config/options';
import Avatar from './Avatar';
import { cn } from '../utils/cn';

interface SettingsViewProps {
  language: Language;
  setLanguage: (l: Language) => void;
  speaker: Speaker;
  setSpeaker: (s: Speaker) => void;
  personality: Personality;
  setPersonality: (p: Personality) => void;
}

type SettingsCategory = 'identity' | 'voice' | 'avatar';

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

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('identity');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Local Settings for Sliders
  const [speechRate, setSpeechRate] = useState(() => Number(localStorage.getItem('voxentia_speech_rate') || '1.0'));
  const [voiceVolume, setVoiceVolume] = useState(() => Number(localStorage.getItem('voxentia_voice_volume') || '80'));

  const handleSpeechRateChange = (val: number) => {
    setSpeechRate(val);
    localStorage.setItem('voxentia_speech_rate', val.toString());
  };

  const handleVolumeChange = (val: number) => {
    setVoiceVolume(val);
    localStorage.setItem('voxentia_voice_volume', val.toString());
  };

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

  const handleSaveChanges = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[var(--bg-primary)] overflow-hidden">
      {/* Left Sidebar categories list */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,28,0.3)] backdrop-blur-md p-6 flex flex-col shrink-0">
        <div className="mb-6 hidden md:block">
          <h1 className="text-2xl font-light text-[var(--text-primary)] mb-1 tracking-tight">{t.settings}</h1>
          <p className="text-[var(--text-secondary)] text-xs">{t.settings_customize}</p>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-hide">
          <CategoryTab
            id="identity"
            label="Identity & Personality"
            icon={<User className="w-4 h-4" />}
            active={activeCategory === 'identity'}
            onClick={() => setActiveCategory('identity')}
          />
          <CategoryTab
            id="voice"
            label="Voice & Security"
            icon={<Volume2 className="w-4 h-4" />}
            active={activeCategory === 'voice'}
            onClick={() => setActiveCategory('voice')}
          />
          <CategoryTab
            id="avatar"
            label="3D Avatar Preview"
            icon={<Sparkles className="w-4 h-4" />}
            active={activeCategory === 'avatar'}
            onClick={() => setActiveCategory('avatar')}
          />
        </nav>
      </aside>

      {/* Right Content area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="max-w-3xl w-full mx-auto space-y-8 animate-fade-in" key={activeCategory}>
          {activeCategory === 'identity' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-medium text-[var(--text-primary)] mb-1">Identity & Personality</h2>
                <p className="text-xs text-[var(--text-secondary)]">Configure your assistant's identity, language, and core style.</p>
              </div>

              {/* Segmented Button for Language */}
              <div className="glass-card p-6 border border-white/5 space-y-4">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Languages className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {t.language}
                </label>
                <div className="flex rounded-xl bg-black/20 dark:bg-white/5 p-1 border border-white/5 max-w-md">
                  {LANG_OPTIONS.map(({ value, key }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value as Language)}
                      className={cn(
                        'flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center',
                        language === value
                          ? 'bg-[var(--accent)] text-[var(--text-on-accent)] shadow-md'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      {t[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Pills Grid */}
              <div className="glass-card p-6 border border-white/5 space-y-4">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {t.personality}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PERSONALITY_OPTIONS.map((pers) => (
                    <button
                      key={pers}
                      type="button"
                      onClick={() => setPersonality(pers as Personality)}
                      className={cn(
                        'px-3 py-2.5 text-xs font-medium rounded-xl border transition-all cursor-pointer text-center',
                        personality === pers
                          ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold shadow-sm'
                          : 'bg-black/10 dark:bg-white/2 border-white/5 text-[var(--text-secondary)] hover:bg-black/20 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
                      )}
                    >
                      {t[`pers_${pers}` as keyof typeof t] as string}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'voice' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-medium text-[var(--text-primary)] mb-1">Voice & Speech Settings</h2>
                <p className="text-xs text-[var(--text-secondary)]">Manage playback voices, speed rates, volumes, and API settings.</p>
              </div>

              {/* Voice Card Grid */}
              <div className="glass-card p-6 border border-white/5 space-y-4">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  {t.voice}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SPEAKER_OPTIONS.map(({ value, key }) => {
                    const isSelected = speaker === value;
                    const genderText = speakerGenderMap[value as Speaker] === 'feminine' ? 'Feminine Voice' : 'Masculine Voice';
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSpeaker(value as Speaker)}
                        className={cn(
                          'p-4 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center',
                          isSelected
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--text-primary)] shadow-sm'
                            : 'bg-black/10 dark:bg-white/2 border-white/5 text-[var(--text-secondary)] hover:bg-black/20 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{t[key]}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{genderText}</p>
                        </div>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speech Sliders */}
              <div className="glass-card p-6 border border-white/5 space-y-5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Playback Details
                </label>

                {/* Speech rate slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">Speech Rate</span>
                    <span className="text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => handleSpeechRateChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-black/20 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>

                {/* Volume slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">Speech Volume</span>
                    <span className="text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">{voiceVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={voiceVolume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-black/20 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-3">
                <MaterialSwitch
                  label={(t as unknown as Record<string, string>).settings_streamResponses ?? 'Stream responses'}
                  description={(t as unknown as Record<string, string>).settings_streamResponsesDesc ?? 'Show tokens as they are generated in real-time.'}
                  checked={streamEnabled}
                  onChange={setStreamEnabled}
                />
              </div>
            </div>
          )}

          {activeCategory === 'avatar' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-medium text-[var(--text-primary)] mb-1">3D Avatar Settings</h2>
                <p className="text-xs text-[var(--text-secondary)]">Adjust your assistant's live interactive GLB 3D model.</p>
              </div>

              {/* Interactive Live GLB Preview */}
              <div className="relative w-full h-[300px] rounded-3xl overflow-hidden glass-card border border-white/10 shadow-2xl flex items-center justify-center bg-[rgba(10,15,28,0.4)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_50%)] pointer-events-none z-10" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] pointer-events-none z-10" />
                <div className="absolute top-4 left-4 z-20 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Live GLB Preview</span>
                </div>
                <Avatar
                  gender={speakerGenderMap[speaker]}
                  avatarSource={avatarSource}
                  isSpeaking={false}
                  isListening={false}
                  isThinking={false}
                  emotion="neutral"
                />
              </div>

              <MaterialSwitch
                label="Use Custom 3D Avatar (GLB)"
                description="Enable uploading and using a custom GLB avatar model."
                checked={avatarSource === 'custom'}
                onChange={(val) => setAvatarSource(val ? 'custom' : 'default')}
              />

              {avatarSource === 'custom' && (
                <div className="p-5 bg-black/10 dark:bg-white/2 border border-white/5 rounded-2xl space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Upload Custom Avatar (.glb)
                    </span>
                    {uploading && <span className="text-xs text-[var(--accent)] animate-pulse">Uploading...</span>}
                    {uploadSuccess && <span className="text-xs text-[var(--success)] font-semibold">✓ Upload successful!</span>}
                    {uploadError && <span className="text-xs text-[var(--danger)]">{uploadError}</span>}
                  </div>

                  <div className="flex items-center justify-center border border-dashed border-white/10 rounded-xl p-8 hover:border-[var(--accent)]/50 transition-all relative cursor-pointer group bg-black/5 hover:bg-black/10">
                    <input
                      type="file"
                      accept=".glb"
                      onChange={handleGlbUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={uploading}
                    />
                    <div className="text-center space-y-2 pointer-events-none">
                      <Upload className="w-8 h-8 text-[var(--text-secondary)] mx-auto transition-transform group-hover:-translate-y-1" />
                      <p className="text-xs text-[var(--text-secondary)] font-medium">
                        Drag & drop or click to upload your custom 3D model
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        GLB format, max 30MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer save area */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-6 mt-10">
          <div>
            {saveSuccess && (
              <span className="text-xs text-[var(--success)] font-semibold animate-fade-in flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                {t.common_saveChanges || 'Changes saved successfully'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveChanges}
            className="px-6 py-2.5 bg-[var(--accent)] text-[var(--text-on-accent)] font-semibold text-xs rounded-xl shadow-lg shadow-[var(--accent)]/20 uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all cursor-pointer border border-white/5 active:scale-98"
          >
            {t.common_saveChanges || 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}

function CategoryTab({
  label,
  icon,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer select-none whitespace-nowrap md:w-full',
        active
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-inner border border-[var(--accent)]/20'
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] border border-transparent'
      )}
    >
      <span className={cn('transition-colors', active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]')}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

/* Switch Toggle Component */
function MaterialSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-black/10 dark:bg-white/2 rounded-2xl border border-white/5 shadow-sm transition-all hover:bg-black/15 dark:hover:bg-white/3">
      <div className="pr-4">
        <p className="text-xs text-[var(--text-primary)] font-bold uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-normal">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'w-12 h-7 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 border border-white/5 shadow-inner',
          checked ? 'bg-[var(--accent)]' : 'bg-black/30 dark:bg-white/10'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-md',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
