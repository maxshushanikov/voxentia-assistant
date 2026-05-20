import { useEffect } from 'react';

import { useAppStore } from '../store/appStore';

function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function useShortcuts() {
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen);
  const setShortcutsHelpOpen = useAppStore((s) => s.setShortcutsHelpOpen);
  const resetChat = useAppStore((s) => s.resetChat);
  const setActivePlugin = useAppStore((s) => s.setActivePlugin);
  const commandBarOpen = useAppStore((s) => s.commandBarOpen);
  const shortcutsHelpOpen = useAppStore((s) => s.shortcutsHelpOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
        return;
      }

      if (e.key === 'Escape') {
        if (commandBarOpen) setCommandBarOpen(false);
        if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void resetChat();
        return;
      }

      if (mod && e.key === '/') {
        e.preventDefault();
        setShortcutsHelpOpen(!shortcutsHelpOpen);
        return;
      }

      if (inInput) return;

      if (e.altKey && e.key >= '1' && e.key <= '8') {
        const ids = [
          'calendar',
          'learn',
          'jobs',
          'docs',
          'notes',
          'project',
          'knowledge',
          'marketplace',
        ];
        const idx = parseInt(e.key, 10) - 1;
        if (ids[idx]) {
          e.preventDefault();
          setActivePlugin(ids[idx]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    commandBarOpen,
    shortcutsHelpOpen,
    setCommandBarOpen,
    setShortcutsHelpOpen,
    resetChat,
    setActivePlugin,
  ]);
}
