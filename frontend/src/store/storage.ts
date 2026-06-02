import type { Language, Personality, Speaker } from '../types';
import type { Theme } from './appStore';

type AvatarSource = 'default' | 'custom';

const KEYS = {
  theme: 'voxentia-theme',
  showAvatar: 'voxentia-show-avatar',
  model: 'voxentia-model',
  stream: 'voxentia-stream',
  language: 'voxentia-lang',
  avatarSource: 'voxentia-avatar-source',
  speaker: 'voxentia-speaker',
  personality: 'voxentia-personality',
} as const;

const get = (key: string) => localStorage.getItem(key);

export const storage = {
  getTheme: (): Theme => {
    const v = get(KEYS.theme);
    return v === 'light' || v === 'glass' || v === 'dark' ? v : 'dark';
  },
  setTheme: (value: Theme) => localStorage.setItem(KEYS.theme, value),
  getShowAvatar: (): boolean => get(KEYS.showAvatar) !== 'false',
  setShowAvatar: (value: boolean) => localStorage.setItem(KEYS.showAvatar, String(value)),
  getModel: (): string | null => get(KEYS.model),
  setModel: (value: string | null) => {
    if (value) localStorage.setItem(KEYS.model, value);
    else localStorage.removeItem(KEYS.model);
  },
  getStreamEnabled: (): boolean => get(KEYS.stream) !== 'false',
  setStreamEnabled: (value: boolean) => localStorage.setItem(KEYS.stream, String(value)),
  getLanguage: (): Language => (get(KEYS.language) as Language) || 'en',
  setLanguage: (value: Language) => localStorage.setItem(KEYS.language, value),
  getAvatarSource: (): AvatarSource => (get(KEYS.avatarSource) === 'custom' ? 'custom' : 'default'),
  setAvatarSource: (value: AvatarSource) => localStorage.setItem(KEYS.avatarSource, value),
  getSpeaker: (): Speaker => (get(KEYS.speaker) as Speaker) || 'baya',
  setSpeaker: (value: Speaker) => localStorage.setItem(KEYS.speaker, value),
  getPersonality: (): Personality => (get(KEYS.personality) as Personality) || 'professional',
  setPersonality: (value: Personality) => localStorage.setItem(KEYS.personality, value),
};
