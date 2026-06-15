import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorPanelProps } from './types';

const theme = EditorView.theme({
  '&': {
    backgroundColor: '#0D0D0D',
    color: '#D4D4D4',
    fontSize: '14px',
    height: '100%'
  },
  '.cm-content': {
    caretColor: '#D4D4D4',
    padding: '8px 0'
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    color: '#858585',
    border: 'none',
    padding: '0 8px'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2A2D2E',
    color: '#D4D4D4'
  },
  '.cm-activeLine': {
    backgroundColor: '#2A2D2E'
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#264F78 !important'
  },
  '.cm-cursor': {
    borderLeftColor: '#D4D4D4'
  },
  '.cm-tooltip': {
    backgroundColor: '#252526',
    border: '1px solid #444',
    color: '#D4D4D4'
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#094771',
      color: '#D4D4D4'
    }
  }
}, { dark: true });

const customSyntaxHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.tagName, color: '#569CD6' },
    { tag: tags.attributeName, color: '#9CDCFE' },
    { tag: tags.attributeValue, color: '#CE9178' },
    { tag: tags.propertyName, color: '#DCDCAA' },
    { tag: tags.comment, color: '#6A9955' },
    { tag: tags.string, color: '#CE9178' },
    { tag: tags.number, color: '#B5CEA8' },
    { tag: tags.keyword, color: '#569CD6' },
    { tag: tags.className, color: '#4EC9B0' }
  ])
);

export function EditorPanel({ code, language, onChange, onFormat, onCopy, error, errorLine }: EditorPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [stats, setStats] = useState({ lines: 0, chars: 0 });

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newCode = update.state.doc.toString();
        onChange(newCode);
        const lines = update.state.doc.lines;
        const chars = newCode.length;
        setStats({ lines, chars });
      }
    });

    const languageExtension = language === 'html' ? html() : css();

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        highlightActiveLine(),
        autocompletion(),
        keymap.of([
          ...completionKeymap,
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: () => {
              return true;
            }
          }
        ]),
        languageExtension,
        customSyntaxHighlighting,
        theme,
        updateListener,
        EditorView.lineWrapping
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;
    setStats({ lines: code.split('\n').length, chars: code.length });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentCode = view.state.doc.toString();
    if (currentCode !== code) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentCode.length,
          insert: code
        }
      });
      setStats({ lines: code.split('\n').length, chars: code.length });
    }
  }, [code]);

  const handleFormat = useCallback(() => {
    onFormat();
  }, [onFormat]);

  const handleCopy = useCallback(() => {
    onCopy();
  }, [onCopy]);

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.stats}>
          <span style={styles.lineCount}>行数: {stats.lines}</span>
          <span style={styles.charCount}>字符: {stats.chars}</span>
        </div>
        <div style={styles.actions}>
          <button style={styles.button} onClick={handleFormat}>
            格式化
          </button>
          <button style={styles.button} onClick={handleCopy}>
            复制
          </button>
        </div>
      </div>
      {error && (
        <div style={styles.errorBanner}>
          <strong>语法错误:</strong> {error}
          {errorLine && <span> (第 {errorLine} 行)</span>}
        </div>
      )}
      <div ref={editorRef} style={styles.editor} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0D0D0D',
    border: '1px solid #444',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #444'
  },
  stats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px'
  },
  lineCount: {
    color: '#569CD6'
  },
  charCount: {
    color: '#4EC9B0'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  button: {
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: '#007ACC',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  errorBanner: {
    padding: '8px 12px',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
    fontSize: '12px',
    borderBottom: '1px solid #F44336'
  },
  editor: {
    flex: 1,
    overflow: 'auto'
  }
};
