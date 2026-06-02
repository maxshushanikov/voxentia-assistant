import { create } from 'zustand';
import { createSession } from '../api/chat';
import { storage } from './storage';

import type { AvatarEmotion, Language, Message, Personality, Speaker } from '../types';

export type Theme = 'dark' | 'light' | 'glass';

function newSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
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
  avatarSource: 'default' | 'custom';
  compareMode: boolean;
  selectedModelB: string | null;
  commandBarOpen: boolean;
  shortcutsHelpOpen: boolean;
  setCompareMode: (v: boolean) => void;
  setCommandBarOpen: (v: boolean) => void;
  setShortcutsHelpOpen: (v: boolean) => void;
  setSelectedModelB: (model: string | null) => void;
  setAvatarSource: (source: 'default' | 'custom') => void;

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
  resetChat: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: newSessionId(),
  messages: [],
  inputText: '',
  language: storage.getLanguage(),
  speaker: storage.getSpeaker(),
  personality: storage.getPersonality(),
  selectedModel: storage.getModel(),
  activePlugin: null,
  isThinking: false,
  isSidebarOpen: false,
  isSettingsOpen: false,
  historyRefreshKey: 0,
  voiceState: 'idle',
  theme: storage.getTheme(),
  showAvatar: storage.getShowAvatar(),
  avatarEmotion: 'neutral',
  viewKey: 'dashboard',
  streamEnabled: storage.getStreamEnabled(),
  avatarSource: storage.getAvatarSource(),
  compareMode: false,
  selectedModelB: null,
  commandBarOpen: false,
  shortcutsHelpOpen: false,

  setSessionId: (id) => set({ sessionId: id }),
  setMessages: (fn) => set((s) => ({ messages: fn(s.messages) })),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setInputText: (inputText) => set({ inputText }),
  setLanguage: (language) => {
    storage.setLanguage(language);
    set({ language });
  },
  setSpeaker: (speaker) => {
    storage.setSpeaker(speaker);
    set({ speaker });
  },
  setPersonality: (personality) => {
    storage.setPersonality(personality);
    set({ personality });
  },
  setSelectedModel: (selectedModel) => {
    storage.setModel(selectedModel);
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
    storage.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setShowAvatar: (showAvatar) => {
    storage.setShowAvatar(showAvatar);
    set({ showAvatar });
  },
  setAvatarEmotion: (avatarEmotion) => set({ avatarEmotion }),
  setStreamEnabled: (streamEnabled) => {
    storage.setStreamEnabled(streamEnabled);
    set({ streamEnabled });
  },
  setAvatarSource: (avatarSource) => {
    storage.setAvatarSource(avatarSource);
    set({ avatarSource });
  },
  setCompareMode: (compareMode) => set({ compareMode }),
  setSelectedModelB: (selectedModelB) => set({ selectedModelB }),
  setCommandBarOpen: (commandBarOpen) => set({ commandBarOpen }),
  setShortcutsHelpOpen: (shortcutsHelpOpen) => set({ shortcutsHelpOpen }),
  resetChat: async () => {
    try {
      const data = await createSession();
      set({
        sessionId: data.session_id || newSessionId(),
        messages: [],
        activePlugin: null,
        inputText: '',
        viewKey: 'dashboard',
      });
    } catch {
      set({
        sessionId: newSessionId(),
        messages: [],
        activePlugin: null,
        inputText: '',
        viewKey: 'dashboard',
      });
    }
  },
}));

// Apply theme on module load
document.documentElement.setAttribute('data-theme', storage.getTheme());
