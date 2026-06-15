import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { extractCodeBlocks } from '@/utils/markdownUtils';
import { CodeBlock } from './CodeBlock';
import { ApiReference } from './ApiReference';
import styles from './PreviewPanel.module.css';

interface PreviewPanelProps {
  content: string;
}

export function PreviewPanel({ content }: PreviewPanelProps) {
  const codeBlocks = useMemo(() => extractCodeBlocks(content), [content]);

  const renderers = useMemo(() => ({
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className={styles.heading1}>{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className={styles.heading2}>{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className={styles.heading3}>{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p className={styles.paragraph}>{children}</p>
    ),
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className={styles.list}>{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className={styles.listOrdered}>{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className={styles.listItem}>{children}</li>
    ),
    table: ({ children }: { children: React.ReactNode }) => (
      <div className={styles.tableContainer}>
        <table className={styles.table}>{children}</table>
      </div>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className={styles.tableHeader}>{children}</th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className={styles.tableCell}>{children}</td>
    ),
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      if (isInline) {
        return <code className={styles.inlineCode}>{children}</code>;
      }
      return null;
    },
    pre: ({ children }: { children: React.ReactNode }) => {
      return null;
    },
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className={styles.blockquote}>{children}</blockquote>
    ),
    hr: () => <hr className={styles.hr} />,
  }), []);

  const renderContent = () => {
    const parts: React.ReactNode[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockHeader = '';
    let lastNormalEnd = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockHeader = line.slice(3).trim();
          codeBlockContent = [];

          if (i > lastNormalEnd) {
            const normalContent = lines.slice(lastNormalEnd, i).join('\n');
            parts.push(
              <ReactMarkdown
                key={`md-${lastNormalEnd}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={renderers}
              >
                {normalContent}
              </ReactMarkdown>
            );
          }
        } else {
          inCodeBlock = false;
          const match = codeBlockHeader.match(/^(\w+)(?:\s+filename:([^\s]+))?/);
          const language = match?.[1] || 'text';
          const filename = match?.[2] || `code-${parts.length}.${language}`;

          parts.push(
            <CodeBlock
              key={`code-${lastNormalEnd}`}
              code={codeBlockContent.join('\n')}
              language={language}
              filename={filename}
              blockId={`block-${lastNormalEnd}`}
            />
          );
          lastNormalEnd = i + 1;
        }
      } else if (inCodeBlock) {
        codeBlockContent.push(line);
      }
    }

    if (lastNormalEnd < lines.length) {
      const normalContent = lines.slice(lastNormalEnd).join('\n');
      parts.push(
        <ReactMarkdown
          key={`md-${lastNormalEnd}`}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={renderers}
        >
          {normalContent}
        </ReactMarkdown>
      );
    }

    return parts;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>预览</span>
      </div>
      <div className={styles.content}>
        <div className={styles.markdownContent}>
          {renderContent()}
        </div>
        <div className={styles.apiSection}>
          <ApiReference />
        </div>
      </div>
    </div>
  );
}
