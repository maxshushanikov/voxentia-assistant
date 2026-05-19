import { useEffect, useState, type ReactNode } from 'react';

interface ViewTransitionProps {
  viewKey: string;
  children: ReactNode;
  className?: string;
}

/** Fade + slide when switching dashboard / chat / plugins. */
export default function ViewTransition({ viewKey, children, className = '' }: ViewTransitionProps) {
  const [visible, setVisible] = useState(true);
  const [currentKey, setCurrentKey] = useState(viewKey);

  useEffect(() => {
    if (viewKey === currentKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const t = window.setTimeout(() => {
      setCurrentKey(viewKey);
      requestAnimationFrame(() => setVisible(true));
    }, 120);
    return () => window.clearTimeout(t);
  }, [viewKey, currentKey]);

  return (
    <div
      key={currentKey}
      className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ease-out ${className} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  );
}
