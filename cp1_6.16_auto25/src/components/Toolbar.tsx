import { useState } from 'react';
import { useEditor, FormatCommand } from '../context/EditorContext';

interface ToolButtonProps {
  command: FormatCommand;
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
}

function ToolButton({ command, active, label, title, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`toolbar-btn ${active ? 'active' : ''}`}
      title={title}
      data-cmd={command}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Toolbar() {
  const { formatState, execFormat } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);

  const buttons: { cmd: FormatCommand; label: string; title: string; active: boolean }[] = [
    { cmd: 'bold', label: '<b>B</b>', title: '加粗 (Ctrl+B)', active: formatState.bold },
    { cmd: 'italic', label: '<i>I</i>', title: '斜体 (Ctrl+I)', active: formatState.italic },
    { cmd: 'underline', label: '<u>U</u>', title: '下划线 (Ctrl+U)', active: formatState.underline },
    { cmd: 'strikethrough', label: '<s>S</s>', title: '删除线', active: formatState.strikethrough },
    { cmd: 'h1', label: 'H1', title: '一级标题', active: formatState.h1 },
    { cmd: 'h2', label: 'H2', title: '二级标题', active: formatState.h2 },
    { cmd: 'insertUnorderedList', label: '• 列表', title: '无序列表', active: formatState.insertUnorderedList },
    { cmd: 'insertOrderedList', label: '1. 列表', title: '有序列表', active: formatState.insertOrderedList },
    { cmd: 'blockquote', label: '" 引用', title: '引用块', active: formatState.blockquote },
    { cmd: 'removeFormat', label: '✕', title: '清除格式', active: false }
  ];

  const handleClick = (cmd: FormatCommand) => {
    execFormat(cmd);
    setMenuOpen(false);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-logo">
        <span className="logo-icon">✎</span>
        <span className="logo-text">RichText Editor</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-buttons desktop-only">
        {buttons.map((b) => (
          <ToolButton
            key={b.cmd}
            command={b.cmd}
            active={b.active}
            label={b.label}
            title={b.title}
            onClick={() => handleClick(b.cmd)}
          />
        ))}
      </div>

      <button
        type="button"
        className="hamburger mobile-only"
        aria-label="菜单"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {menuOpen && (
        <div className="toolbar-dropdown">
          {buttons.map((b) => (
            <button
              key={b.cmd}
              type="button"
              className={`dropdown-btn ${b.active ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleClick(b.cmd)}
            >
              <span className="db-label">{b.label}</span>
              <span className="db-title">{b.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Toolbar;
