import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useAppStore } from '../stores/appStore';
import { getMonacoDecorations, computeLineDiffs, getDiffCounts } from '../core/DiffEngine';
import { readHtmlFile } from '../core/RenderSandbox';
import toast from 'react-hot-toast';

interface EditorPanelProps {
  side: 'left' | 'right';
}

const DIFF_STYLES = `
  .diff-line-added {
    background-color: #e6ffed !important;
  }
  .diff-line-added::before {
    content: '+';
    color: #22863a;
    font-weight: bold;
    margin-right: 4px;
  }
  .diff-line-removed {
    background-color: #ffeef0 !important;
  }
  .diff-line-removed::before {
    content: '-';
    color: #d73a49;
    font-weight: bold;
    margin-right: 4px;
  }
  .diff-line-modified {
    background-color: #fff8c5 !important;
  }
  .diff-line-modified::before {
    content: '~';
    color: #e36209;
    font-weight: bold;
    margin-right: 4px;
  }
  .diff-glyph-added {
    background-color: #22863a !important;
  }
  .diff-glyph-removed {
    background-color: #d73a49 !important;
  }
  .diff-glyph-modified {
    background-color: #e36209 !important;
  }
`;

export const EditorPanel: React.FC<EditorPanelProps> = ({ side }) => {
  const code = useAppStore((s) => (side === 'left' ? s.leftCode : s.rightCode));
  const setCode = useAppStore((s) => (side === 'left' ? s.setLeftCode : s.setRightCode));
  const lineDiffs = useAppStore((s) => s.lineDiffs);
  const setLineDiffs = useAppStore((s) => s.setLineDiffs);
  const setDiffCounts = useAppStore((s) => s.setDiffCounts);
  const leftCode = useAppStore((s) => s.leftCode);
  const rightCode = useAppStore((s) => s.rightCode);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditorMount = useCallback((ed: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    if (typeof document !== 'undefined') {
      const styleId = 'monaco-diff-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = DIFF_STYLES;
        document.head.appendChild(style);
      }
    }

    ed.addAction({
      id: 'run-preview',
      label: '运行预览',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      ],
      run: () => {
        window.dispatchEvent(new CustomEvent('run-preview'));
      },
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.dispatchEvent(new CustomEvent('run-preview'));
    });
  }, []);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || lineDiffs.length === 0) {
      return;
    }

    const decorations = getMonacoDecorations(lineDiffs, side);

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [lineDiffs, side]);

  useEffect(() => {
    const left = useAppStore.getState().leftCode;
    const right = useAppStore.getState().rightCode;
    const diffs = computeLineDiffs(left, right);
    const counts = getDiffCounts(diffs);
    setLineDiffs(diffs);
    setDiffCounts(counts);
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback((value: string | undefined) => {
    const newCode = value ?? '';
    setCode(newCode);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const state = useAppStore.getState();
      const diffs = computeLineDiffs(state.leftCode, state.rightCode);
      const counts = getDiffCounts(diffs);
      setLineDiffs(diffs);
      setDiffCounts(counts);
    }, 150);
  }, [setCode, setLineDiffs, setDiffCounts]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const htmlFile = files.find((f) =>
      f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
    );

    if (htmlFile) {
      try {
        const content = await readHtmlFile(htmlFile);
        setCode(content);
        toast.success(`已加载文件: ${htmlFile.name}`);

        setTimeout(() => {
          const state = useAppStore.getState();
          const diffs = computeLineDiffs(state.leftCode, state.rightCode);
          const counts = getDiffCounts(diffs);
          setLineDiffs(diffs);
          setDiffCounts(counts);
        }, 100);
      } catch (err: any) {
        toast.error(err.message || '文件加载失败');
      }
    } else {
      toast.error('请拖入HTML文件');
    }
  }, [setCode, setLineDiffs, setDiffCounts]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readHtmlFile(file);
      setCode(content);
      toast.success(`已加载文件: ${file.name}`);

      setTimeout(() => {
        const state = useAppStore.getState();
        const diffs = computeLineDiffs(state.leftCode, state.rightCode);
        const counts = getDiffCounts(diffs);
        setLineDiffs(diffs);
        setDiffCounts(counts);
      }, 100);
    } catch (err: any) {
      toast.error(err.message || '文件加载失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setCode, setLineDiffs, setDiffCounts]);

  const title = side === 'left' ? '左侧版本 (Left)' : '右侧版本 (Right)';
  const badgeColor = side === 'left' ? '#4caf50' : '#ff9800';

  return (
    <div className="panel-wrapper">
      <div className="panel-header">
        <div className="panel-label">
          <span className="panel-label-badge" style={{ backgroundColor: badgeColor }}></span>
          {title}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '4px',
          }}
        >
          📁 导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
      <div
        className={`panel-scroll-container drop-zone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="editor-container">
          <Editor
            height="100%"
            defaultLanguage="html"
            language="html"
            theme="vs-dark"
            value={code}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 20,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              renderWhitespace: 'selection',
              glyphMargin: true,
              folding: true,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
