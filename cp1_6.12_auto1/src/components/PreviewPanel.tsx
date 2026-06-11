import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

interface PreviewPanelProps {
  content: string;
  theme: 'light' | 'dark';
  collapsed: boolean;
  onToggleCollapse: () => void;
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
                <pre {...props} className="preview-code-block">
                  {children}
                </pre>
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeStr = String(children).replace(/\n$/, '');
                if (match) {
                  return (
                    <code className={className} {...props}>
                      {codeStr}
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
