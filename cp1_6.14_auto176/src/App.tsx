import React, { useState, useEffect, useMemo } from 'react';
import { useAtomsStore, ELEMENTS, ELEMENT_PROPERTIES, type ElementType } from './stores/atomsStore';
import { analyzeMolecule } from './utils/moleculeNamer';
import CanvasEditor from './CanvasEditor';
import ThreePreview from './ThreePreview';

const App: React.FC = () => {
  const {
    atoms,
    bonds,
    selectedElement,
    setSelectedElement,
    is3DMode,
    toggle3DMode,
    undo,
    redo,
    clearAll,
    historyIndex,
    history
  } = useAtomsStore();

  const [showCopied, setShowCopied] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const moleculeInfo = useMemo(() => {
    return analyzeMolecule(atoms, bonds);
  }, [atoms, bonds]);

  useEffect(() => {
    if (is3DMode) {
      setRippleKey(prev => prev + 1);
      setShowRipple(true);
      const timer = setTimeout(() => setShowRipple(false), 500);
      return () => clearTimeout(timer);
    }
  }, [atoms, bonds, is3DMode]);

  const handleGenerate3D = () => {
    setIsFlipping(true);
    setTimeout(() => {
      toggle3DMode();
    }, 250);
    setTimeout(() => {
      setIsFlipping(false);
    }, 500);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2300);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="app-container">
      <header className="header">
        <h1>⚗️ 化学分子式编辑器</h1>
        <p>拖拽原子构建分子 · 一键生成3D球棍模型 · 自动IUPAC命名</p>
      </header>

      <div className="main-content">
        <aside className="toolbar">
          <span className="toolbar-title">原子</span>
          {ELEMENTS.map(element => (
            <button
              key={element}
              className={`atom-button atom-button-${element} ${selectedElement === element ? 'selected' : ''} tooltip`}
              onClick={() => setSelectedElement(element)}
              data-tooltip={`${ELEMENT_PROPERTIES[element].name} (${element}) - 原子序数 ${ELEMENT_PROPERTIES[element].atomicNumber}`}
            >
              <span className="element-symbol">{element}</span>
              <span className="atomic-number">{ELEMENT_PROPERTIES[element].atomicNumber}</span>
            </button>
          ))}

          <div style={{ height: '1px', width: '80%', background: 'rgba(255,255,255,0.2)', margin: '8px 0' }} />

          <button
            className="action-btn tooltip"
            onClick={undo}
            disabled={!canUndo}
            data-tooltip="撤销 (Ctrl+Z)"
            style={{ width: '100%' }}
          >
            ↩ 撤销
          </button>
          <button
            className="action-btn tooltip"
            onClick={redo}
            disabled={!canRedo}
            data-tooltip="重做 (Ctrl+Y)"
            style={{ width: '100%' }}
          >
            ↪ 重做
          </button>
          <button
            className="action-btn tooltip"
            onClick={clearAll}
            disabled={atoms.length === 0}
            data-tooltip="清空画布"
            style={{ width: '100%' }}
          >
            🗑 清空
          </button>
        </aside>

        <div className="editor-area">
          <div className="canvas-wrapper">
            <CanvasEditor />
          </div>
        </div>

        <div className="preview-area">
          <div className="preview-container">
            <div className={`preview-content ${isFlipping ? 'flipping' : ''}`}>
              {showRipple && is3DMode && (
                <div key={rippleKey} className="ripple-effect" />
              )}
              {is3DMode ? (
                <ThreePreview atoms={atoms} bonds={bonds} />
              ) : (
                <CanvasEditor isPreview />
              )}
            </div>
          </div>

          <button
            className="generate-btn tooltip"
            onClick={handleGenerate3D}
            data-tooltip={is3DMode ? '返回二维编辑' : '生成3D球棍模型'}
          >
            {is3DMode ? '↩ 返回二维编辑' : '🎲 生成3D模型'}
          </button>

          <div className={`info-panel ${!moleculeInfo.isComplete ? 'incomplete' : ''}`}>
            <div className="info-row">
              <span className="info-label">分子式</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="info-value">{moleculeInfo.formula || '-'}</span>
                {moleculeInfo.formula && (
                  <button className="copy-btn tooltip" onClick={() => handleCopy(moleculeInfo.formula)} data-tooltip="复制分子式">
                    📋
                    {showCopied && <span className="copied-text">已复制</span>}
                  </button>
                )}
              </div>
            </div>
            <div className="info-row">
              <span className="info-label">IUPAC命名</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`info-value ${!moleculeInfo.isComplete ? 'error' : ''}`}>
                  {moleculeInfo.isComplete ? moleculeInfo.name : moleculeInfo.message}
                </span>
                {moleculeInfo.isComplete && (
                  <button className="copy-btn tooltip" onClick={() => handleCopy(moleculeInfo.name)} data-tooltip="复制命名">
                    📋
                  </button>
                )}
              </div>
            </div>
            <div className="info-row" style={{ marginBottom: 0 }}>
              <span className="info-label">原子数 / 键数</span>
              <span className="info-value" style={{ fontSize: '14px' }}>
                {atoms.length} / {bonds.length}
              </span>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="action-btn tooltip"
              onClick={undo}
              disabled={!canUndo}
              data-tooltip="撤销上一步操作"
            >
              ↩ 撤销
            </button>
            <button
              className="action-btn tooltip"
              onClick={redo}
              disabled={!canRedo}
              data-tooltip="重做上一步操作"
            >
              ↪ 重做
            </button>
            <button
              className="action-btn tooltip"
              onClick={clearAll}
              disabled={atoms.length === 0}
              data-tooltip="清空所有原子和键"
            >
              🗑 清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
