import { useState } from 'react';
import Scene, { DragState } from './components/Scene';
import UIOverlay from './components/UIOverlay';

export default function App() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    shape: null,
    material: null,
    position: { x: 0, y: 0, z: 0 },
    isValid: false,
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Scene dragState={dragState} setDragState={setDragState} />
      <UIOverlay dragState={dragState} setDragState={setDragState} />
    </div>
  );
}
