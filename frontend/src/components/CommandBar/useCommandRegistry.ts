import { useMemo } from 'react';

import { useTranslation } from '../../i18n/context';
import { plugins } from '../../plugins/registry';
import { useAppStore } from '../../store/appStore';

export interface Command {
  id: string;
  label: string;
  category: 'plugin' | 'model' | 'personality' | 'session' | 'ui';
  shortcut?: string;
  action: () => void;
  keywords: string[];
}

export function useCommandRegistry(): Command[] {
  const { t } = useTranslation();
  const setActivePlugin = useAppStore((s) => s.setActivePlugin);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setTheme = useAppStore((s) => s.setTheme);
  const resetChat = useAppStore((s) => s.resetChat);
  const setShowAvatar = useAppStore((s) => s.setShowAvatar);
  const showAvatar = useAppStore((s) => s.showAvatar);
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen);

  return useMemo(() => {
    const pluginCommands: Command[] = plugins.map((p) => ({
      id: `cmd-plugin-${p.id}`,
      label: `📦 ${(t as unknown as Record<string, string>)[p.nameKey] ?? p.nameKey}`,
      category: 'plugin' as const,
      keywords: [p.id, p.nameKey, (t as unknown as Record<string, string>)[p.nameKey] ?? ''],
      action: () => {
        setActivePlugin(p.id);
        setCommandBarOpen(false);
      },
    }));

    return [
      ...pluginCommands,
      {
        id: 'cmd-calendar',
        label: '📅 Kalender',
        category: 'plugin',
        keywords: ['kalender', 'calendar', 'termine', 'events'],
        action: () => {
          setActivePlugin('calendar');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-docs',
        label: '📄 Dokumente',
        category: 'plugin',
        keywords: ['dokumente', 'documents', 'pdf', 'upload', 'rag'],
        action: () => {
          setActivePlugin('docs');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-professional',
        label: '🎭 Persönlichkeit: Professionell',
        category: 'personality',
        keywords: ['personality', 'professional', 'formal'],
        action: () => {
          setPersonality('professional');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-friendly',
        label: '🎭 Persönlichkeit: Freundlich',
        category: 'personality',
        keywords: ['friendly', 'freundlich', 'happy'],
        action: () => {
          setPersonality('friendly');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-lang-de',
        label: '🌐 Sprache: Deutsch',
        category: 'ui',
        keywords: ['deutsch', 'german', 'language', 'sprache'],
        action: () => {
          setLanguage('de');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-lang-en',
        label: '🌐 Sprache: English',
        category: 'ui',
        keywords: ['english', 'englisch', 'language'],
        action: () => {
          setLanguage('en');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-theme-dark',
        label: '🌙 Theme: Dark',
        category: 'ui',
        keywords: ['dark', 'theme', 'dunkel'],
        action: () => {
          setTheme('dark');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-theme-light',
        label: '☀️ Theme: Light',
        category: 'ui',
        keywords: ['light', 'theme', 'hell'],
        action: () => {
          setTheme('light');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-avatar-toggle',
        label: showAvatar ? '👤 Avatar ausblenden' : '👤 Avatar einblenden',
        category: 'ui',
        keywords: ['avatar', '3d', 'anzeige'],
        action: () => {
          setShowAvatar(!showAvatar);
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-reset',
        label: '🗑️ Neuer Chat',
        category: 'session',
        shortcut: 'Ctrl+Shift+N',
        keywords: ['neu', 'new', 'reset', 'clear', 'leeren', 'session'],
        action: () => {
          void resetChat();
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-knowledge',
        label: '🧠 Wissensgraph',
        category: 'plugin',
        keywords: ['knowledge', 'graph', 'wissen', 'triplets'],
        action: () => {
          setActivePlugin('knowledge');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-marketplace',
        label: '🛒 Plugin Marketplace',
        category: 'plugin',
        keywords: ['marketplace', 'plugins', 'install'],
        action: () => {
          setActivePlugin('marketplace');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-help',
        label: '❓ Tastenkürzel',
        category: 'ui',
        shortcut: 'Ctrl+/',
        keywords: ['help', 'shortcuts', 'hilfe', 'tasten'],
        action: () => {
          setCommandBarOpen(false);
          useAppStore.getState().setShortcutsHelpOpen(true);
        },
      },
    ];
  }, [
    t,
    setActivePlugin,
    setPersonality,
    setLanguage,
    setTheme,
    resetChat,
    setShowAvatar,
    showAvatar,
    setCommandBarOpen,
  ]);
}
