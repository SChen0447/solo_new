import React, { useCallback } from 'react';
import { useMoleculeStore } from '@/store/useMoleculeStore';
import { EditorManager } from '@/molecule-editor/EditorManager';
import type { ToolType } from '@/store/useMoleculeStore';

interface ToolButton {
  id: ToolType | 'undo' | 'redo' | 'reset' | 'export';
  label: string;
  svg: string;
}

const tools: ToolButton[] = [
  {
    id: 'select',
    label: '选择',
    svg: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',
  },
  {
    id: 'addAtom',
    label: '添加原子',
    svg: '<circle cx="12" cy="12" r="3"/><line x1="12" y1="5" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="19"/><line x1="5" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="19" y2="12"/>',
  },
  {
    id: 'addBond',
    label: '添加键',
    svg: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>',
  },
  {
    id: 'measure',
    label: '测量距离',
    svg: '<path d="M2 12h5"/><path d="M17 12h5"/><path d="M12 2v5"/><path d="M12 17v5"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>',
  },
  {
    id: 'rotate',
    label: '旋转',
    svg: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  },
  {
    id: 'zoom',
    label: '缩放',
    svg: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  },
  {
    id: 'undo',
    label: '撤销',
    svg: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  },
  {
    id: 'redo',
    label: '重做',
    svg: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  },
  {
    id: 'reset',
    label: '重置视角',
    svg: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  },
  {
    id: 'export',
    label: '导出GLTF',
    svg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  },
];

export default function Toolbar() {
  const activeTool = useMoleculeStore((s) => s.activeTool);
  const setActiveTool = useMoleculeStore((s) => s.setActiveTool);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);

  const handleExport = useCallback(async () => {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const three = await import('three');
    const scene = new three.Scene();
    const store = useMoleculeStore.getState();

    for (const atom of store.molecule.atoms) {
      const geo = new three.SphereGeometry(
        (atom.element === 'H' ? 0.3 : atom.element === 'O' || atom.element === 'N' ? 0.45 : 0.5),
        16,
        16
      );
      const mat = new three.MeshStandardMaterial({
        color: atom.element === 'C' ? '#808080' : atom.element === 'O' ? '#ff0000' : atom.element === 'N' ? '#0000ff' : atom.element === 'H' ? '#ffffff' : '#ffff00',
      });
      const mesh = new three.Mesh(geo, mat);
      mesh.position.set(atom.x, atom.y, atom.z);
      scene.add(mesh);
    }

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        const blob = new Blob(
          [JSON.stringify(result)],
          { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'molecule.gltf';
        a.click();
        URL.revokeObjectURL(url);
      },
      (error) => console.error(error),
      { binary: false }
    );
  }, []);

  const handleClick = useCallback(
    (id: string) => {
      if (id === 'undo') {
        EditorManager.undo();
        return;
      }
      if (id === 'redo') {
        EditorManager.redo();
        return;
      }
      if (id === 'reset') {
        setActiveTool('select');
        return;
      }
      if (id === 'export') {
        handleExport();
        return;
      }
      setActiveTool(id as ToolType);
    },
    [setActiveTool, handleExport]
  );

  return (
    <>
      <div className="toolbar-desktop">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleClick(tool.id)}
            title={tool.label}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: tool.svg }}
            />
          </button>
        ))}
      </div>
      <div className="toolbar-mobile">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`toolbar-btn-mobile ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleClick(tool.id)}
            title={tool.label}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: tool.svg }}
            />
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
