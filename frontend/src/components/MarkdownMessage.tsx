import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

import { cn } from '../utils/cn';

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return '';
}

function CodeBlockHeader({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="code-block-header group/code">
      <span>{lang}</span>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(code)}
        className="opacity-0 group-hover/code:opacity-100 transition-opacity text-[var(--accent)] hover:underline normal-case tracking-normal"
      >
        Copy
      </button>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[var(--accent)] underline hover:text-[var(--accent-hover)]"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  pre: ({ children, ...props }) => {
    const child = Children.only(children);
    const codeEl = isValidElement(child) ? child : null;
    const className = (codeEl?.props as { className?: string })?.className ?? '';
    const lang = /language-(\w+)/.exec(className)?.[1] ?? 'code';
    const source = extractText((codeEl?.props as { children?: ReactNode })?.children).replace(/\n$/, '');

    return (
      <div className="relative mt-2 mb-4 rounded-md overflow-hidden">
        <CodeBlockHeader lang={lang} code={source} />
        <pre {...props}>{children}</pre>
      </div>
    );
  },
  code: (props) => {
    const { children, className, ...rest } = props;
    const isBlock = className?.includes('hljs');

    if (isBlock) {
      return (
        <code className={cn('hljs', className)} {...rest}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="bg-[var(--code-bg)] border border-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] px-1.5 py-0.5 rounded text-[13px] font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },
};

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const rehypePlugins = useMemo(() => [rehypeHighlight], []);

  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown rehypePlugins={rehypePlugins} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
