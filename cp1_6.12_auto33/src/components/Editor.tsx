import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { versionApi } from '../api/versionApi';
import type { Version } from '../types';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onVersionSaved: (version: Version) => void;
}

const Editor: React.FC<EditorProps> = ({ content, onChange, onVersionSaved }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveComment, setSaveComment] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const charCount = content.length;

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      const version = await versionApi.createVersion(content, saveLabel || undefined, saveComment || undefined);
      onVersionSaved(version);
      setShowSaveModal(false);
      setSaveLabel('');
      setSaveComment('');
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + prefix + selected + suffix + after;
    onChange(newContent);
    setTimeout(() => {
      textarea.focus();
      const pos = start + prefix.length;
      textarea.setSelectionRange(pos, pos + selected.length);
    }, 0);
  };

  const tools = [
    { icon: 'B', title: '粗体', action: () => insertMarkdown('**', '**') },
    { icon: 'I', title: '斜体', action: () => insertMarkdown('*', '*') },
    { icon: 'H', title: '标题', action: () => insertMarkdown('\n## ') },
    { icon: '"', title: '引用', action: () => insertMarkdown('\n> ') },
    { icon: '•', title: '列表', action: () => insertMarkdown('\n- ') },
    { icon: '</>', title: '代码', action: () => insertMarkdown('`', '`') },
    { icon: '🔗', title: '链接', action: () => insertMarkdown('[', '](url)') },
  ];

  return (
    <div className="editor-wrapper fade-in" style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.toolbar}>
          {tools.map((tool, idx) => (
            <button
              key={idx}
              title={tool.title}
              onClick={tool.action}
              style={styles.toolBtn}
            >
              {tool.icon}
            </button>
          ))}
          <div style={styles.divider} />
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              ...styles.toolBtn,
              ...(showPreview ? styles.toolBtnActive : {}),
            }}
          >
            {showPreview ? '✏️ 编辑' : '👁 预览'}
          </button>
        </div>
        <div style={styles.stats}>
          <span style={styles.statItem}>{wordCount} 词</span>
          <span style={styles.statItem}>{charCount} 字符</span>
        </div>
      </div>

      <div style={styles.editorContainer}>
        {!showPreview ? (
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="开始写作...支持 Markdown 语法"
            style={styles.textarea}
          />
        ) : (
          <div style={styles.preview}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={() => setShowSaveModal(true)} style={styles.saveBtn}>
          💾 保存为新版本
        </button>
      </div>

      {showSaveModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div
            className="fade-in-scale"
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.modalTitle}>保存新版本</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>版本标签（可选）</label>
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="留空将自动生成"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>版本评论（可选）</label>
              <textarea
                value={saveComment}
                onChange={(e) => setSaveComment(e.target.value)}
                placeholder="例如：删减了第三段"
                style={{ ...styles.input, ...styles.textareaSmall }}
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSaveModal(false)} style={styles.cancelBtn}>
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                style={styles.confirmBtn}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid var(--border-color)',
    background: 'linear-gradient(to bottom, #fafbfc, #fff)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  toolBtn: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    minWidth: '36px',
  },
  toolBtnActive: {
    background: 'var(--primary-color)',
    color: 'white',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: 'var(--border-color)',
    margin: '0 8px',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)',
  },
  editorContainer: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },
  textarea: {
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: '24px 32px',
    fontSize: '16px',
    lineHeight: '1.8',
    fontFamily: 'var(--font-serif)',
    color: 'var(--text-primary)',
    background: 'transparent',
  },
  preview: {
    padding: '24px 32px',
    fontFamily: 'var(--font-serif)',
    fontSize: '16px',
    lineHeight: '1.8',
    color: 'var(--text-primary)',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-color)',
    background: '#fafbfc',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
    color: 'white',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-sm)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(44, 62, 80, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    width: '420px',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '20px',
    color: 'var(--text-primary)',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  },
  textareaSmall: {
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'var(--font-serif)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-hover)',
  },
  confirmBtn: {
    padding: '10px 24px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: 'var(--primary-color)',
  },
};

export default Editor;
