import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

(self as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

interface JsonEditorProps {
  content: string;
  onChange: (value: string) => void;
  treeOnly?: boolean;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
}

interface TreeNodeProps {
  keyName: string;
  value: any;
  depth: number;
  path: string;
  onEdit: (path: string, value: any) => void;
}

function valueColor(v: any): string {
  if (v === null || v === undefined) return '#808080';
  if (typeof v === 'string') return '#6A9955';
  if (typeof v === 'number') return '#CE9178';
  if (typeof v === 'boolean') return '#C586C0';
  return '#D4D4D4';
}

function valueDisplay(v: any): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}

function TreeNode({ keyName, value, depth, path, onEdit }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isObject = value !== null && typeof value === 'object';
  const currentPath = path ? `${path}.${keyName}` : keyName;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isObject) return;
    setEditValue(typeof value === 'string' ? value : String(value));
    setEditing(true);
  };

  const handleEditSubmit = () => {
    setEditing(false);
    try {
      let parsed: any = editValue;
      if (editValue === 'true') parsed = true;
      else if (editValue === 'false') parsed = false;
      else if (editValue === 'null') parsed = null;
      else if (!isNaN(Number(editValue)) && editValue.trim() !== '') parsed = Number(editValue);
      onEdit(currentPath, parsed);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSubmit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="tree-node">
      <div
        className="tree-node-header"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => isObject && setExpanded(!expanded)}
      >
        {isObject && (
          <span className={`tree-toggle ${expanded ? 'tree-toggle-expanded' : ''}`}>
            {expanded ? '↓' : '→'}
          </span>
        )}
        {!isObject && <span className="tree-toggle-placeholder" />}
        <span className="tree-key">{keyName}</span>
        {!isObject && !editing && (
          <span
            className="tree-value"
            style={{ color: valueColor(value) }}
            onDoubleClick={handleEditStart}
          >
            {valueDisplay(value)}
          </span>
        )}
        {!isObject && editing && (
          <input
            ref={inputRef}
            className="tree-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
          />
        )}
        {isObject && (
          <span className="tree-bracket">{Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`}</span>
        )}
      </div>
      {isObject && expanded && (
        <div className="tree-node-children">
          {Object.entries(value).map(([k, v]) => (
            <TreeNode
              key={k}
              keyName={k}
              value={v}
              depth={depth + 1}
              path={currentPath}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JsonEditor({ content, onChange, treeOnly = false }: JsonEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'idle'>('idle');
  const debounceRef = useRef<number | null>(null);

  const validateJson = useCallback((text: string) => {
    try {
      JSON.parse(text);
      setErrors([]);
      setValidationStatus('valid');
      return [];
    } catch (err: any) {
      const match = err.message?.match(/position (\d+)/);
      let line = 1;
      let column = 1;
      if (match) {
        const pos = parseInt(match[1], 10);
        const beforePos = text.substring(0, pos);
        const lines = beforePos.split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
      const lineMatch = err.message?.match(/line (\d+)/);
      if (lineMatch) line = parseInt(lineMatch[1], 10);

      const validationError: ValidationError = {
        line,
        column,
        message: err.message,
      };
      setErrors([validationError]);
      setValidationStatus('invalid');
      return [validationError];
    }
  }, []);

  useEffect(() => {
    if (treeOnly) return;
    if (!editorContainerRef.current) return;

    const editor = monaco.editor.create(editorContainerRef.current, {
      value: content,
      language: 'json',
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
      padding: { top: 8 },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      multiCursorModifier: 'alt',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
    });

    editorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      onChange(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        validateJson(value);
      }, 200);
    });

    validateJson(content);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (treeOnly) return;
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (model && model.getValue() !== content) {
      editorRef.current.setValue(content);
    }
  }, [content, treeOnly]);

  useEffect(() => {
    if (treeOnly) return;
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(model, 'json-validation', []);
  }, [errors, treeOnly]);

  const handleFormat = useCallback(() => {
    if (!editorRef.current) return;
    const value = editorRef.current.getValue();
    try {
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      editorRef.current.setValue(formatted);
      setErrors([]);
      setValidationStatus('valid');
    } catch {}
  }, []);

  const handleMinify = useCallback(() => {
    if (!editorRef.current) return;
    const value = editorRef.current.getValue();
    try {
      const minified = JSON.stringify(JSON.parse(value));
      editorRef.current.setValue(minified);
      setErrors([]);
      setValidationStatus('valid');
    } catch {}
  }, []);

  const handleValidate = useCallback(() => {
    if (!editorRef.current) return;
    validateJson(editorRef.current.getValue());
  }, [validateJson]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {}
  }, [content]);

  const handleGotoError = useCallback((line: number) => {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  }, []);

  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  const handleTreeEdit = useCallback(
    (path: string, newValue: any) => {
      try {
        const obj = JSON.parse(content);
        const keys = path.split('.');
        let current: any = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = newValue;
        const updated = JSON.stringify(obj, null, 2);
        onChange(updated);
      } catch {}
    },
    [content, onChange]
  );

  if (treeOnly) {
    return (
      <div className="tree-view-panel">
        <div className="tree-toolbar">
          <span className="tree-title">JSON Tree</span>
        </div>
        <div className="tree-view-content">
          {parsedJson !== null ? (
            Object.entries(parsedJson).map(([k, v]) => (
              <TreeNode
                key={k}
                keyName={k}
                value={v}
                depth={0}
                path=""
                onEdit={handleTreeEdit}
              />
            ))
          ) : (
            <div className="tree-error">Invalid JSON - cannot display tree</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="json-editor-panel">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={handleFormat} title="Format JSON">
            Format
          </button>
          <button className="toolbar-btn" onClick={handleMinify} title="Minify JSON">
            Minify
          </button>
          <button className="toolbar-btn" onClick={handleValidate} title="Validate JSON">
            Validate
          </button>
          <button className="toolbar-btn" onClick={handleCopy} title="Copy to Clipboard">
            Copy
          </button>
        </div>
        <div className="toolbar-right">
          {validationStatus === 'valid' && (
            <span className="validation-badge validation-valid">✓ Valid</span>
          )}
          {validationStatus === 'invalid' && (
            <span className="validation-badge validation-invalid">✗ Invalid</span>
          )}
        </div>
      </div>
      <div className="editor-container" ref={editorContainerRef} />
      {errors.length > 0 && (
        <div className="error-panel">
          <div className="error-panel-header">
            <span>Errors ({errors.length})</span>
          </div>
          <div className="error-list">
            {errors.map((err, i) => (
              <div
                key={i}
                className="error-item"
                onClick={() => handleGotoError(err.line)}
              >
                <span className="error-line">Line {err.line}</span>
                <span className="error-msg">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default JsonEditor;
