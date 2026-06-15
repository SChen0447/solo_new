import { useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { insertCodeBlock, generateId } from '@/utils/markdownUtils';
import styles from './EditorPanel.module.css';

interface EditorPanelProps {
  highlightedLine: number | null;
}

export function EditorPanel({ highlightedLine }: EditorPanelProps) {
  const documentContent = useAppStore((state) => state.documentContent);
  const setDocumentContent = useAppStore((state) => state.setDocumentContent);
  const addCodeBlock = useAppStore((state) => state.addCodeBlock);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  const getCurrentPosition = useCallback((): number => {
    if (!editorRef.current) return 0;
    const position = editorRef.current.getPosition();
    return position ? position.lineNumber - 1 : 0;
  }, []);

  const insertText = useCallback((before: string, after: string = '') => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    if (!selection) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    const text = `${before}${selectedText}${after}`;

    editorRef.current.executeEdits('', [
      {
        range: selection,
        text,
      },
    ]);

    editorRef.current.focus();
  }, []);

  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleInlineCode = () => insertText('`', '`');
  const handleHeading1 = () => insertText('# ');
  const handleHeading2 = () => insertText('## ');
  const handleHeading3 = () => insertText('### ');
  const handleList = () => insertText('- ');
  const handleOrderedList = () => insertText('1. ');
  const handleLink = () => insertText('[链接文字](', ')');

  const handleInsertCodeBlock = useCallback((
    language: 'javascript' | 'typescript' | 'python'
  ) => {
    const position = getCurrentPosition();
    const result = insertCodeBlock(documentContent, language, position);
    setDocumentContent(result.content);

    const blockId = generateId();
    const filename = `example-${blockId.slice(0, 8)}.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : 'py'}`;

    addCodeBlock({
      id: blockId,
      language,
      filename,
      code: '',
      output: '',
      collapsed: false,
    });
  }, [documentContent, setDocumentContent, addCodeBlock, getCurrentPosition]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setDocumentContent(value);
    }
  }, [setDocumentContent]);

  const handleEditorWillMount = useCallback((monaco: typeof import('monaco-editor')) => {
    monaco.editor.defineTheme('tech-doc-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1A1A2E',
        'editor.foreground': '#E0E0E0',
        'editor.lineHighlightBackground': '#2C3E50',
        'editorLineNumber.foreground': '#666666',
        'editor.selectionBackground': 'rgba(79, 195, 247, 0.3)',
        'editorCursor.foreground': '#4FC3F7',
      },
    });
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handleBold}
            title="加粗"
          >
            <Bold size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleItalic}
            title="斜体"
          >
            <Italic size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleInlineCode}
            title="行内代码"
          >
            <Code size={16} />
          </button>
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handleHeading1}
            title="标题 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleHeading2}
            title="标题 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleHeading3}
            title="标题 3"
          >
            <Heading3 size={16} />
          </button>
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            onClick={handleList}
            title="无序列表"
          >
            <List size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleOrderedList}
            title="有序列表"
          >
            <ListOrdered size={16} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleLink}
            title="链接"
          >
            <Link size={16} />
          </button>
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <button
            className={styles.languageButton}
            onClick={() => handleInsertCodeBlock('javascript')}
            title="插入 JavaScript 代码块"
          >
            JS
          </button>
          <button
            className={styles.languageButton}
            onClick={() => handleInsertCodeBlock('typescript')}
            title="插入 TypeScript 代码块"
          >
            TS
          </button>
          <button
            className={styles.languageButton}
            onClick={() => handleInsertCodeBlock('python')}
            title="插入 Python 代码块"
          >
            PY
          </button>
        </div>
      </div>
      <div className={styles.editorContainer}>
        <Editor
          height="100%"
          language="markdown"
          value={documentContent}
          onChange={handleChange}
          onMount={handleEditorMount}
          beforeMount={handleEditorWillMount}
          theme="tech-doc-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            wrappingIndent: 'indent',
            fontSize: 14,
            fontFamily: 'var(--font-family-mono)',
            lineHeight: 20,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'gutter',
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
}
