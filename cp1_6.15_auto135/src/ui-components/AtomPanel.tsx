import React, { useCallback } from 'react';
import { useMoleculeStore } from '@/store/useMoleculeStore';
import { EditorManager } from '@/molecule-editor/EditorManager';
import { getBondsForAtom, ELEMENT_COLORS } from '@/molecule-core/MoleculeModel';
import type { ElementType } from '@/molecule-core/MoleculeModel';

const ELEMENTS: ElementType[] = ['C', 'H', 'O', 'N', 'S', 'P'];

export default function AtomPanel() {
  const selectedAtomId = useMoleculeStore((s) => s.selectedAtomId);
  const molecule = useMoleculeStore((s) => s.molecule);
  const isPanelOpen = useMoleculeStore((s) => s.isPanelOpen);
  const setIsPanelOpen = useMoleculeStore((s) => s.setIsPanelOpen);
  const setSelectedAtomId = useMoleculeStore((s) => s.setSelectedAtomId);

  const selectedAtom = molecule.atoms.find((a) => a.id === selectedAtomId);
  const bonds = selectedAtomId ? getBondsForAtom(molecule, selectedAtomId) : [];

  const handleElementChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedAtomId) return;
      EditorManager.updateAtom(selectedAtomId, { element: e.target.value as ElementType });
    },
    [selectedAtomId]
  );

  const handleCoordChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: string) => {
      if (!selectedAtomId) return;
      const num = parseFloat(value);
      if (isNaN(num)) return;
      const clamped = Math.max(-10, Math.min(10, num));
      EditorManager.updateAtom(selectedAtomId, { [axis]: clamped });
    },
    [selectedAtomId]
  );

  const handleDeleteBond = useCallback(
    (bondId: string) => {
      EditorManager.removeBond(bondId);
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedAtomId(null);
  }, [setIsPanelOpen, setSelectedAtomId]);

  if (!isPanelOpen || !selectedAtom) return null;

  return (
    <>
      <div className="atom-panel-desktop">
        <div className="atom-panel-header">
          <h3>原子属性</h3>
          <button className="atom-panel-close" onClick={handleClose}>✕</button>
        </div>

        <div className="atom-panel-body">
          <div className="atom-panel-field">
            <label>元素类型</label>
            <select value={selectedAtom.element} onChange={handleElementChange}>
              {ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {el} — {el === 'C' ? '碳' : el === 'H' ? '氢' : el === 'O' ? '氧' : el === 'N' ? '氮' : el === 'S' ? '硫' : '磷'}
                </option>
              ))}
            </select>
          </div>

          <div className="atom-panel-coords">
            <div className="atom-panel-field">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={selectedAtom.x}
                onChange={(e) => handleCoordChange('x', e.target.value)}
              />
            </div>
            <div className="atom-panel-field">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={selectedAtom.y}
                onChange={(e) => handleCoordChange('y', e.target.value)}
              />
            </div>
            <div className="atom-panel-field">
              <label>Z</label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={selectedAtom.z}
                onChange={(e) => handleCoordChange('z', e.target.value)}
              />
            </div>
          </div>

          <div className="atom-panel-bonds">
            <label>连接的键 ({bonds.length})</label>
            {bonds.length === 0 && <p className="atom-panel-empty">无连接键</p>}
            {bonds.map((bond) => {
              const otherAtomId = bond.atom1Id === selectedAtomId ? bond.atom2Id : bond.atom1Id;
              const otherAtom = molecule.atoms.find((a) => a.id === otherAtomId);
              return (
                <div key={bond.id} className="atom-panel-bond-item">
                  <span>
                    {bond.type === 'single' ? '—' : bond.type === 'double' ? '═' : '≡'}{' '}
                    {otherAtom?.element || '?'} ({otherAtomId.slice(0, 6)})
                  </span>
                  <button
                    className="bond-delete-btn"
                    onClick={() => handleDeleteBond(bond.id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <button
            className="atom-delete-btn"
            onClick={() => {
              if (selectedAtomId) EditorManager.removeAtom(selectedAtomId);
            }}
          >
            删除此原子
          </button>
        </div>
      </div>

      <div className="atom-panel-mobile">
        <div className="atom-panel-mobile-header">
          <h3>原子属性</h3>
          <button className="atom-panel-close" onClick={handleClose}>✕</button>
        </div>
        <div className="atom-panel-body">
          <div className="atom-panel-field">
            <label>元素类型</label>
            <select value={selectedAtom.element} onChange={handleElementChange}>
              {ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {el} — {el === 'C' ? '碳' : el === 'H' ? '氢' : el === 'O' ? '氧' : el === 'N' ? '氮' : el === 'S' ? '硫' : '磷'}
                </option>
              ))}
            </select>
          </div>
          <div className="atom-panel-coords">
            <div className="atom-panel-field">
              <label>X</label>
              <input type="number" step="0.1" min="-10" max="10" value={selectedAtom.x} onChange={(e) => handleCoordChange('x', e.target.value)} />
            </div>
            <div className="atom-panel-field">
              <label>Y</label>
              <input type="number" step="0.1" min="-10" max="10" value={selectedAtom.y} onChange={(e) => handleCoordChange('y', e.target.value)} />
            </div>
            <div className="atom-panel-field">
              <label>Z</label>
              <input type="number" step="0.1" min="-10" max="10" value={selectedAtom.z} onChange={(e) => handleCoordChange('z', e.target.value)} />
            </div>
          </div>
          <div className="atom-panel-bonds">
            <label>连接的键 ({bonds.length})</label>
            {bonds.map((bond) => {
              const otherAtomId = bond.atom1Id === selectedAtomId ? bond.atom2Id : bond.atom1Id;
              const otherAtom = molecule.atoms.find((a) => a.id === otherAtomId);
              return (
                <div key={bond.id} className="atom-panel-bond-item">
                  <span>
                    {bond.type === 'single' ? '—' : bond.type === 'double' ? '═' : '≡'}{' '}
                    {otherAtom?.element || '?'}
                  </span>
                  <button className="bond-delete-btn" onClick={() => handleDeleteBond(bond.id)}>✕</button>
                </div>
              );
            })}
          </div>
          <button className="atom-delete-btn" onClick={() => { if (selectedAtomId) EditorManager.removeAtom(selectedAtomId); }}>
            删除此原子
          </button>
        </div>
      </div>
    </>
  );
}
