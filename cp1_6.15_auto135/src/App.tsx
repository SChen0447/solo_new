import React, { useCallback, useEffect, useState } from 'react';
import SceneRenderer from '@/scene-renderer/SceneRenderer';
import Toolbar from '@/ui-components/Toolbar';
import AtomPanel from '@/ui-components/AtomPanel';
import { useMoleculeStore } from '@/store/useMoleculeStore';
import { EditorManager } from '@/molecule-editor/EditorManager';

export default function App() {
  const smilesInput = useMoleculeStore((s) => s.smilesInput);
  const setSmilesInput = useMoleculeStore((s) => s.setSmilesInput);
  const loadSMILES = useMoleculeStore((s) => s.loadSMILES);
  const activeTool = useMoleculeStore((s) => s.activeTool);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const molecule = useMoleculeStore((s) => s.molecule);

  const handleSmilesSubmit = useCallback(() => {
    if (smilesInput.trim()) {
      loadSMILES(smilesInput.trim());
    }
  }, [smilesInput, loadSMILES]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'Z') {
          e.preventDefault();
          EditorManager.redo();
        } else if (e.key === 'z') {
          e.preventDefault();
          EditorManager.undo();
        }
      }
    },
    [undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toolLabel =
    activeTool === 'select' ? '选择模式' :
    activeTool === 'addAtom' ? '添加原子' :
    activeTool === 'addBond' ? '添加键' :
    activeTool === 'measure' ? '测量距离' :
    activeTool === 'rotate' ? '旋转模式' :
    activeTool === 'zoom' ? '缩放模式' : '';

  return (
    <div className="app-container">
      <Toolbar />

      <div className="smiles-bar">
        <div className="smiles-input-group">
          <label>SMILES</label>
          <input
            type="text"
            value={smilesInput}
            onChange={(e) => setSmilesInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSmilesSubmit(); }}
            placeholder="输入SMILES，如 CCO"
          />
          <button className="smiles-load-btn" onClick={handleSmilesSubmit}>
            加载
          </button>
        </div>
        <div className="molecule-stats">
          <span>原子: {molecule.atoms.length}</span>
          <span>键: {molecule.bonds.length}</span>
        </div>
        {activeTool !== 'select' && (
          <div className="tool-indicator">{toolLabel}</div>
        )}
      </div>

      <div className="scene-container">
        <SceneRenderer />
      </div>

      <AtomPanel />
    </div>
  );
}
