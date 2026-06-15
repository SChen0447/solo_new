import React, { useState, useCallback, useMemo } from 'react';
import { useAnimationStore } from '../store/animationStore';

const highlightCSS = (code: string): React.ReactNode[] => {
  const lines = code.split('\n');
  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let key = 0;

    const keyframeMatch = line.match(/(@keyframes\s+\w+)/);
    if (keyframeMatch) {
      const before = line.substring(0, line.indexOf(keyframeMatch[1]));
      const after = line.substring(line.indexOf(keyframeMatch[1]) + keyframeMatch[1].length);
      if (before) parts.push(<span key={key++}>{before}</span>);
      parts.push(
        <span key={key++} style={{ color: '#c678dd', fontWeight: 600 }}>
          {keyframeMatch[1]}
        </span>
      );
      if (after) parts.push(<span key={key++}>{after}</span>);
    } else if (line.match(/^\s*\d+%/)) {
      parts.push(<span key={key++} style={{ color: '#e5c07b' }}>{line}</span>);
    } else {
      const propMatch = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.+)(;)$/);
      if (propMatch) {
        parts.push(<span key={key++}>{propMatch[1]}</span>);
        parts.push(
          <span key={key++} style={{ color: '#61afef' }}>
            {propMatch[2]}
          </span>
        );
        parts.push(<span key={key++}>{propMatch[3]}</span>);
        parts.push(
          <span key={key++} style={{ color: '#98c379' }}>
            {propMatch[4]}
          </span>
        );
        parts.push(<span key={key++}>{propMatch[5]}</span>);
      } else {
        const selectorMatch = line.match(/^(\s*)(\.[\w-]+)(\s*\{)/);
        if (selectorMatch) {
          parts.push(<span key={key++}>{selectorMatch[1]}</span>);
          parts.push(
            <span key={key++} style={{ color: '#e06c75' }}>
              {selectorMatch[2]}
            </span>
          );
          parts.push(<span key={key++}>{selectorMatch[3]}</span>);
        } else {
          const animNameMatch = line.match(/(animation-name\s*:\s*)(.+)(;)/);
          if (animNameMatch) {
            parts.push(
              <span key={key++} style={{ color: '#61afef' }}>
                animation-name
              </span>
            );
            parts.push(<span key={key++}>{animNameMatch[1].replace('animation-name', '')}</span>);
            parts.push(
              <span key={key++} style={{ color: '#98c379' }}>
                {animNameMatch[2]}
              </span>
            );
            parts.push(<span key={key++}>{animNameMatch[3]}</span>);
          } else {
            parts.push(<span key={key++}>{line}</span>);
          }
        }
      }
    }

    return (
      <div key={lineIdx} style={{ minHeight: '20px' }}>
        {parts}
      </div>
    );
  });
};

const ExportModal: React.FC = () => {
  const { isExportOpen, closeExport, generateCSSCode } = useAnimationStore();
  const [copied, setCopied] = useState(false);
  const [flashBorder, setFlashBorder] = useState(false);

  const code = useMemo(() => generateCSSCode(), [isExportOpen, generateCSSCode]);
  const highlighted = useMemo(() => highlightCSS(code), [code]);

  const lineCount = code.split('\n').length;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setFlashBorder(true);
      setTimeout(() => setFlashBorder(false), 100);
      setTimeout(() => setFlashBorder(true), 200);
      setTimeout(() => setFlashBorder(false), 300);
      setTimeout(() => {
        setCopied(false);
        setFlashBorder(false);
      }, 3000);
    });
  }, [code]);

  if (!isExportOpen) return null;

  return (
    <div style={styles.overlay} onClick={closeExport}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>导出 CSS 代码</span>
          <button onClick={closeExport} style={styles.closeBtn}>
            ✕
          </button>
        </div>
        <div
          style={{
            ...styles.codeContainer,
            borderColor: flashBorder ? '#4CAF50' : '#3a3a5a',
            borderWidth: flashBorder ? '2px' : '1px',
          }}
        >
          <div style={styles.lineNumbers}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} style={styles.lineNum}>
                {i + 1}
              </div>
            ))}
          </div>
          <div style={styles.codeBlock}>{highlighted}</div>
        </div>
        <div style={styles.modalFooter}>
          <button
            onClick={handleCopy}
            style={{
              ...styles.copyBtn,
              background: copied ? '#888' : '#4CAF50',
              cursor: copied ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!copied) (e.currentTarget as HTMLButtonElement).style.background = '#45a049';
            }}
            onMouseLeave={(e) => {
              if (!copied) (e.currentTarget as HTMLButtonElement).style.background = '#4CAF50';
            }}
          >
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '800px',
    maxHeight: '600px',
    background: '#1e1e2e',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a',
  },
  modalTitle: {
    color: '#e0e0e0',
    fontSize: '16px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
  },
  codeContainer: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    borderStyle: 'solid',
    borderColor: '#3a3a5a',
    borderWidth: '1px',
    margin: '0 20px',
    borderRadius: '6px',
    transition: 'border-color 0.1s, border-width 0.1s',
  },
  lineNumbers: {
    padding: '12px 0',
    background: '#f0f0f0',
    color: '#999',
    fontSize: '14px',
    fontFamily: 'monospace',
    lineHeight: '20px',
    textAlign: 'right',
    userSelect: 'none',
    minWidth: '40px',
    paddingRight: '8px',
    borderRight: '1px solid #ddd',
  },
  lineNum: {
    paddingRight: '4px',
  },
  codeBlock: {
    padding: '12px',
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: '14px',
    lineHeight: '20px',
    color: '#abb2bf',
    flex: 1,
    overflow: 'auto',
    whiteSpace: 'pre',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '12px 20px',
    borderTop: '1px solid #2a2a4a',
  },
  copyBtn: {
    padding: '8px 24px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background 0.2s ease',
  },
};

export default ExportModal;
