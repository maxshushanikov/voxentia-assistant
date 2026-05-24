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
    const tr = t as unknown as Record<string, string>;

    const pluginCommands: Command[] = plugins.map((p) => ({
      id: `cmd-plugin-${p.id}`,
      label: `📦 ${tr[p.nameKey] ?? p.nameKey}`,
      category: 'plugin' as const,
      keywords: [p.id, p.nameKey, tr[p.nameKey] ?? ''],
      action: () => {
        setActivePlugin(p.id);
        setCommandBarOpen(false);
      },
    }));

    const pluginQuickCommands: Command[] = plugins.flatMap((p) =>
      (p.quickCommands ?? []).map((qc) => ({
        id: `cmd-${qc.id}`,
        label: `⚡ ${tr[qc.labelKey] ?? qc.labelKey}`,
        category: 'plugin' as const,
        keywords: [...qc.keywords, p.id, tr[p.nameKey] ?? ''],
        action: () => {
          setActivePlugin(p.id);
          setCommandBarOpen(false);
        },
      })),
    );

    return [
      ...pluginCommands,
      ...pluginQuickCommands,
      {
        id: 'cmd-professional',
        label: `🎭 ${tr.cmd_personality_professional}`,
        category: 'personality',
        keywords: ['personality', 'professional', 'formal'],
        action: () => {
          setPersonality('professional');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-friendly',
        label: `🎭 ${tr.cmd_personality_friendly}`,
        category: 'personality',
        keywords: ['friendly', 'freundlich', 'happy'],
        action: () => {
          setPersonality('friendly');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-lang-de',
        label: `🌐 ${tr.cmd_language_de}`,
        category: 'ui',
        keywords: ['deutsch', 'german', 'language', 'sprache'],
        action: () => {
          setLanguage('de');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-lang-en',
        label: `🌐 ${tr.cmd_language_en}`,
        category: 'ui',
        keywords: ['english', 'englisch', 'language'],
        action: () => {
          setLanguage('en');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-theme-dark',
        label: `🌙 ${tr.cmd_theme_dark}`,
        category: 'ui',
        keywords: ['dark', 'theme', 'dunkel'],
        action: () => {
          setTheme('dark');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-theme-light',
        label: `☀️ ${tr.cmd_theme_light}`,
        category: 'ui',
        keywords: ['light', 'theme', 'hell'],
        action: () => {
          setTheme('light');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-avatar-toggle',
        label: showAvatar ? `👤 ${tr.cmd_avatar_hide}` : `👤 ${tr.cmd_avatar_show}`,
        category: 'ui',
        keywords: ['avatar', '3d', 'anzeige'],
        action: () => {
          setShowAvatar(!showAvatar);
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-reset',
        label: `🗑️ ${tr.newChat}`,
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
        label: `🧠 ${tr.cmd_knowledge_graph}`,
        category: 'plugin',
        keywords: ['knowledge', 'graph', 'wissen', 'triplets'],
        action: () => {
          setActivePlugin('knowledge');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-marketplace',
        label: `🛒 ${tr.cmd_marketplace}`,
        category: 'plugin',
        keywords: ['marketplace', 'plugins', 'install'],
        action: () => {
          setActivePlugin('marketplace');
          setCommandBarOpen(false);
        },
      },
      {
        id: 'cmd-help',
        label: `❓ ${tr.cmd_shortcuts}`,
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
