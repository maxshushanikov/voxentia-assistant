import { create } from 'zustand';

import type { AvatarEmotion, Language, Message, Personality, Speaker } from '../types';

export type Theme = 'dark' | 'light' | 'glass';

const THEME_KEY = 'voxentia-theme';
const AVATAR_KEY = 'voxentia-show-avatar';
const MODEL_KEY = 'voxentia-model';
const STREAM_KEY = 'voxentia-stream';

function newSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function loadTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  if (v === 'light' || v === 'glass' || v === 'dark') return v;
  return 'dark';
}

function loadShowAvatar(): boolean {
  return localStorage.getItem(AVATAR_KEY) !== 'false';
}

function loadModel(): string | null {
  return localStorage.getItem(MODEL_KEY);
}

function loadStreamEnabled(): boolean {
  return localStorage.getItem(STREAM_KEY) !== 'false';
}

interface AppState {
  sessionId: string;
  messages: Message[];
  inputText: string;
  language: Language;
  speaker: Speaker;
  personality: Personality;
  selectedModel: string | null;
  activePlugin: string | null;
  isThinking: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  historyRefreshKey: number;
  voiceState: 'idle' | 'recording' | 'speaking';
  theme: Theme;
  showAvatar: boolean;
  avatarEmotion: AvatarEmotion;
  viewKey: string;
  streamEnabled: boolean;

  setSessionId: (id: string) => void;
  setMessages: (fn: (prev: Message[]) => Message[]) => void;
  addMessage: (msg: Message) => void;
  setInputText: (text: string) => void;
  setLanguage: (lang: Language) => void;
  setSpeaker: (sp: Speaker) => void;
  setPersonality: (p: Personality) => void;
  setSelectedModel: (model: string | null) => void;
  setActivePlugin: (id: string | null) => void;
  setIsThinking: (v: boolean) => void;
  setIsSidebarOpen: (v: boolean) => void;
  setIsSettingsOpen: (v: boolean) => void;
  bumpHistoryRefresh: () => void;
  setVoiceState: (v: 'idle' | 'recording' | 'speaking') => void;
  setTheme: (theme: Theme) => void;
  setShowAvatar: (show: boolean) => void;
  setAvatarEmotion: (e: AvatarEmotion) => void;
  setStreamEnabled: (enabled: boolean) => void;
  resetChat: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: newSessionId(),
  messages: [],
  inputText: '',
  language: 'en',
  speaker: 'baya',
  personality: 'professional',
  selectedModel: loadModel(),
  activePlugin: null,
  isThinking: false,
  isSidebarOpen: false,
  isSettingsOpen: false,
  historyRefreshKey: 0,
  voiceState: 'idle',
  theme: loadTheme(),
  showAvatar: loadShowAvatar(),
  avatarEmotion: 'neutral',
  viewKey: 'dashboard',
  streamEnabled: loadStreamEnabled(),

  setSessionId: (id) => set({ sessionId: id }),
  setMessages: (fn) => set((s) => ({ messages: fn(s.messages) })),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setInputText: (inputText) => set({ inputText }),
  setLanguage: (language) => set({ language }),
  setSpeaker: (speaker) => set({ speaker }),
  setPersonality: (personality) => set({ personality }),
  setSelectedModel: (selectedModel) => {
    if (selectedModel) localStorage.setItem(MODEL_KEY, selectedModel);
    else localStorage.removeItem(MODEL_KEY);
    set({ selectedModel });
  },
  setActivePlugin: (activePlugin) =>
    set({
      activePlugin,
      viewKey: activePlugin ?? (get().messages.length ? 'chat' : 'dashboard'),
    }),
  setIsThinking: (isThinking) =>
    set({
      isThinking,
      avatarEmotion: isThinking ? 'thinking' : 'neutral',
    }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  bumpHistoryRefresh: () => set((s) => ({ historyRefreshKey: s.historyRefreshKey + 1 })),
  setVoiceState: (voiceState) =>
    set({
      voiceState,
      avatarEmotion: voiceState === 'speaking' ? 'happy' : get().avatarEmotion,
    }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setShowAvatar: (showAvatar) => {
    localStorage.setItem(AVATAR_KEY, String(showAvatar));
    set({ showAvatar });
  },
  setAvatarEmotion: (avatarEmotion) => set({ avatarEmotion }),
  setStreamEnabled: (streamEnabled) => {
    localStorage.setItem(STREAM_KEY, String(streamEnabled));
    set({ streamEnabled });
  },
  resetChat: () =>
    set({
      sessionId: newSessionId(),
      messages: [],
      activePlugin: null,
      inputText: '',
      viewKey: 'dashboard',
    }),
}));

// Apply theme on module load
document.documentElement.setAttribute('data-theme', loadTheme());
