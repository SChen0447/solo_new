import { useCallback } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface EditorProps {
  content: string;
  theme: 'light' | 'dark';
  onChange: (value: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Editor({ content, theme, onChange, collapsed, onToggleCollapse }: EditorProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [content, onChange]);

  return (
    <div className={`editor-panel ${collapsed ? 'editor-panel--collapsed' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-dot" style={{ background: '#4ade80' }} />
          Markdown
        </span>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? '展开编辑区' : '折叠编辑区'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      {!collapsed && (
        <textarea
          className="editor-textarea"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="在此输入 Markdown..."
          spellCheck={false}
        />
      )}
    </div>
  );
}
