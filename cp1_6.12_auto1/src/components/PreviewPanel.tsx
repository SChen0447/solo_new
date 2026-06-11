import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PreviewPanelProps {
  content: string;
  theme: 'light' | 'dark';
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function CodeBlockWithLineNumbers({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    const existingTable = pre.querySelector('.code-table');
    if (existingTable) return;

    const html = codeEl.innerHTML;
    const lines = html.split(/\n(?![^<]*>)/g);

    const table = document.createElement('table');
    table.className = 'code-table';
    const tbody = document.createElement('tbody');

    lines.forEach((line, index) => {
      const tr = document.createElement('tr');
      tr.className = 'code-line';

      const tdNum = document.createElement('td');
      tdNum.className = 'code-line-number';
      tdNum.textContent = String(index + 1);

      const tdCode = document.createElement('td');
      tdCode.className = 'code-line-content';
      tdCode.innerHTML = line || '&nbsp;';

      tr.appendChild(tdNum);
      tr.appendChild(tdCode);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    codeEl.innerHTML = '';
    codeEl.appendChild(table);
  }, [children]);

  return (
    <pre ref={preRef} className="preview-code-block">
      {children}
    </pre>
  );
}

export default function PreviewPanel({ content, theme, collapsed, onToggleCollapse }: PreviewPanelProps) {
  return (
    <div className={`preview-panel ${collapsed ? 'preview-panel--collapsed' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-dot" style={{ background: '#60a5fa' }} />
          Preview
        </span>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? '展开预览区' : '折叠预览区'}
        >
          {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>
      </div>
      {!collapsed && (
        <div className="preview-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children, ...props }) => (
                <CodeBlockWithLineNumbers {...props}>
                  {children}
                </CodeBlockWithLineNumbers>
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                if (match) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ children, ...props }) => (
                <div className="table-wrapper">
                  <table {...props}>{children}</table>
                </div>
              ),
              img: ({ alt, ...props }) => (
                <img alt={alt || ''} loading="lazy" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
