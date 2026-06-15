import { useEffect, useRef, useState } from 'react';
import { DiffViewer } from './components/DiffViewer';
import { useAppStore } from './store/useAppStore';
import { getConflictCount } from './diffEngine/module';

function App() {
  const {
    textA,
    textB,
    diffs,
    isCompared,
    showPreview,
    toast,
    setTextA,
    setTextB,
    runComparison,
    togglePreview,
    undo,
    redo,
    canUndo,
    canRedo,
    getMergedDocument,
  } = useAppStore();

  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [dragOverA, setDragOverA] = useState(false);
  const [dragOverB, setDragOverB] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleCompareClick = () => {
    setIsButtonPressed(true);
    setTimeout(() => setIsButtonPressed(false), 150);
    runComparison();
  };

  const handleDragOver = (e: React.DragEvent, version: 'A' | 'B') => {
    e.preventDefault();
    if (version === 'A') setDragOverA(true);
    else setDragOverB(true);
  };

  const handleDragLeave = (version: 'A' | 'B') => {
    if (version === 'A') setDragOverA(false);
    else setDragOverB(false);
  };

  const handleDrop = (e: React.DragEvent, version: 'A' | 'B') => {
    e.preventDefault();
    if (version === 'A') setDragOverA(false);
    else setDragOverB(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (version === 'A') setTextA(content);
        else setTextB(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, version: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (version === 'A') setTextA(content);
        else setTextB(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCopyToClipboard = async () => {
    const text = getMergedDocument();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const handleDownload = () => {
    const text = getMergedDocument();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const conflictCount = getConflictCount(diffs);

  return (
    <div className="app">
      <header className="app-header">
        <h1>MergeLens 文档冲突解决器</h1>
        <p className="subtitle">可视化对比 · 逐段解决 · 一键合并</p>
      </header>

      {!isCompared && (
        <div className="input-section">
          <div className="input-pair">
            <div className={`input-wrapper ${dragOverA ? 'drag-over' : ''}`}>
              <div className="input-label">
                <span className="version-badge version-a">A</span>
                版本 A
              </div>
              <div
                className="text-area-container"
                onDragOver={(e) => handleDragOver(e, 'A')}
                onDragLeave={() => handleDragLeave('A')}
                onDrop={(e) => handleDrop(e, 'A')}
              >
                <textarea
                  className="text-input"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  placeholder="在此粘贴文本，或拖拽 .txt 文件到此处..."
                  rows={12}
                />
              </div>
              <div className="input-actions">
                <input
                  ref={fileInputARef}
                  type="file"
                  accept=".txt"
                  className="file-input"
                  onChange={(e) => handleFileSelect(e, 'A')}
                />
                <button
                  className="secondary-btn"
                  onClick={() => fileInputARef.current?.click()}
                >
                  上传文件
                </button>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className={`input-wrapper ${dragOverB ? 'drag-over' : ''}`}>
              <div className="input-label">
                <span className="version-badge version-b">B</span>
                版本 B
              </div>
              <div
                className="text-area-container"
                onDragOver={(e) => handleDragOver(e, 'B')}
                onDragLeave={() => handleDragLeave('B')}
                onDrop={(e) => handleDrop(e, 'B')}
              >
                <textarea
                  className="text-input"
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                  placeholder="在此粘贴文本，或拖拽 .txt 文件到此处..."
                  rows={12}
                />
              </div>
              <div className="input-actions">
                <input
                  ref={fileInputBRef}
                  type="file"
                  accept=".txt"
                  className="file-input"
                  onChange={(e) => handleFileSelect(e, 'B')}
                />
                <button
                  className="secondary-btn"
                  onClick={() => fileInputBRef.current?.click()}
                >
                  上传文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompared && (
        <div className="viewer-section">
          <div className="viewer-stats">
            <span>共 {diffs.length} 个段落</span>
            <span className="conflict-count">
              {conflictCount} 处冲突
            </span>
          </div>
          <DiffViewer />
        </div>
      )}

      {showPreview && (
        <div className={`preview-section ${showPreview ? 'fade-in' : ''}`}>
          <div className="preview-header">
            <h3>合并结果预览</h3>
            <div className="preview-actions">
              <button className="secondary-btn" onClick={handleCopyToClipboard}>
                {copySuccess ? '已复制!' : '复制到剪贴板'}
              </button>
              <button className="secondary-btn" onClick={handleDownload}>
                下载 .txt
              </button>
            </div>
          </div>
          <div className="preview-content">
            <pre>{getMergedDocument()}</pre>
          </div>
        </div>
      )}

      <div className="bottom-bar">
        {!isCompared ? (
          <button
            className={`primary-btn compare-btn ${isButtonPressed ? 'pressed' : ''}`}
            onClick={handleCompareClick}
            disabled={!textA.trim() || !textB.trim()}
          >
            开始对比
          </button>
        ) : (
          <div className="bottom-actions">
            <button
              className={`icon-btn ${!canUndo() ? 'disabled' : ''}`}
              onClick={undo}
              disabled={!canUndo()}
              title="撤销 (Ctrl+Z)"
            >
              ↶ 撤销
            </button>
            <button
              className={`icon-btn ${!canRedo() ? 'disabled' : ''}`}
              onClick={redo}
              disabled={!canRedo()}
              title="重做 (Ctrl+Y)"
            >
              ↷ 重做
            </button>
            <button className="primary-btn" onClick={togglePreview}>
              {showPreview ? '隐藏预览' : '预览合并结果'}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
