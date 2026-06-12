import { useState, useRef, useEffect } from 'react';
import type { Recipe } from '../../types';

interface Props {
  recipe: Recipe;
  onUpdate: (notes: string) => void;
}

export default function NotesTab({ recipe, onUpdate }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== recipe.notes) {
      editorRef.current.innerHTML = recipe.notes || '<p>在这里记下你的烹饪心得、技巧小贴士...</p>';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (editorRef.current) {
      onUpdate(editorRef.current.innerHTML);
      setHasChanged(true);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onUpdate(editorRef.current.innerHTML);
      setHasChanged(true);
    }
  };

  const insertList = (ordered: boolean) => {
    execCmd(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 10px',
          background: 'var(--bg-soft)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <ToolBtn onClick={() => execCmd('bold')} title="加粗 (Ctrl+B)">
          <b>B</b>
        </ToolBtn>
        <ToolBtn onClick={() => execCmd('italic')} title="斜体 (Ctrl+I)">
          <i>I</i>
        </ToolBtn>
        <ToolBtn onClick={() => execCmd('underline')} title="下划线 (Ctrl+U)">
          <u>U</u>
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => insertList(false)} title="无序列表">
          • 列表
        </ToolBtn>
        <ToolBtn onClick={() => insertList(true)} title="有序列表">
          1. 编号
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => execCmd('removeFormat')} title="清除格式">
          ⌫ 格式
        </ToolBtn>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasChanged && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--accent)',
                fontWeight: 500,
                animation: 'fadeIn 0.3s both',
              }}
            >
              ✓ 已自动保存
            </span>
          )}
        </div>
      </div>

      {/* 编辑器 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          minHeight: 320,
          padding: 20,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          outline: 'none',
          lineHeight: 1.8,
          fontSize: 15,
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
      />

      {/* 预设模板 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 8, fontWeight: 500 }}>
          💡 快速模板
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TemplateBtn
            onClick={() => {
              if (editorRef.current) {
                const tpl = '<p><strong>烹饪小贴士：</strong></p><ul><li>火候要控制好，中小火慢炖</li><li>调味时少量多次</li><li>出锅前可以尝一下味道</li></ul>';
                editorRef.current.innerHTML = tpl;
                handleInput();
              }
            }}
          >
            💡 小贴士模板
          </TemplateBtn>
          <TemplateBtn
            onClick={() => {
              if (editorRef.current) {
                const tpl = '<p><strong>注意事项：</strong></p><ol><li>食材要新鲜</li><li>提前准备好所有材料（mise en place）</li><li>注意安全，防止烫伤</li></ol>';
                editorRef.current.innerHTML = tpl;
                handleInput();
              }
            }}
          >
            ⚠️ 注意事项模板
          </TemplateBtn>
          <TemplateBtn
            onClick={() => {
              if (editorRef.current) {
                const tpl = '<p><strong>下次改进：</strong></p><ul><li>盐可以少放一点</li><li>时间可以缩短5分钟</li><li>可以加一点辣椒提味</li></ul>';
                editorRef.current.innerHTML = tpl;
                handleInput();
              }
            }}
          >
            🔧 改进记录
          </TemplateBtn>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text)',
        transition: 'all 0.15s',
        minWidth: 32,
        textAlign: 'center',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />;
}

function TemplateBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 12.5,
        background: 'var(--bg-soft)',
        color: 'var(--text-soft)',
        fontWeight: 500,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)';
        (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)';
        (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
      }}
    >
      {children}
    </button>
  );
}
