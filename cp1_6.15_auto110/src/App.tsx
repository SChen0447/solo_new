import { useEffect } from 'react';
import MoleculeScene from './MoleculeScene';
import ControlPanel from './ControlPanel';
import AtomInfoPanel from './AtomInfoPanel';
import { useMoleculeStore } from './store';

export default function App() {
  const resetCamera = useMoleculeStore((s) => s.resetCamera);
  const toggleHydrogen = useMoleculeStore((s) => s.toggleHydrogen);
  const toggleDisplayMode = useMoleculeStore((s) => s.toggleDisplayMode);
  const molecule = useMoleculeStore((s) => s.molecule);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          resetCamera();
          break;
        case 'h':
          e.preventDefault();
          toggleHydrogen();
          break;
        case 'm':
          e.preventDefault();
          toggleDisplayMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetCamera, toggleHydrogen, toggleDisplayMode]);

  const appStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16162a 100%)',
    position: 'relative',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  };

  const titleBarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '1px',
    zIndex: 5,
    textTransform: 'uppercase',
    pointerEvents: 'none',
  };

  const moleculeNameStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '13px',
    zIndex: 5,
    pointerEvents: 'none',
    textAlign: 'center',
  };

  return (
    <div style={appStyle}>
      <div style={titleBarStyle}>分子结构可视化</div>

      <MoleculeScene />

      <AtomInfoPanel />

      <ControlPanel />

      <div style={moleculeNameStyle}>
        <div style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '4px' }}>
          {molecule.name}
        </div>
        <div style={{ fontSize: '11px' }}>
          {molecule.atoms.length} 原子 · {molecule.bonds.length} 化学键 · R 重置 · H 氢 · M 模式
        </div>
      </div>
    </div>
  );
}
