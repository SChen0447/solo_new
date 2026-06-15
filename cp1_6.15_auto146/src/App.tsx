import { useState, useCallback } from 'react';
import EditorCanvas from './editor/EditorCanvas';
import ElementPanel from './editor/ElementPanel';
import TestRunner from './physics/TestRunner';
import LevelIO from './editor/LevelIO';
import type { LevelElement, EditorTool } from './types';
import { eventBus, EVENTS } from './eventBus';

function App() {
  const [elements, setElements] = useState<LevelElement[]>([
    { id: 'plat1', type: 'platform', x: 100, y: 400, width: 200, height: 32 },
    { id: 'plat2', type: 'platform', x: 400, y: 350, width: 150, height: 32 },
    { id: 'enemy1', type: 'enemy', x: 450, y: 318 },
    { id: 'coin1', type: 'coin', x: 200, y: 350 },
    { id: 'coin2', type: 'coin', x: 250, y: 350 },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);

  const gridSize = 32;

  const handleElementsChange = useCallback((newElements: LevelElement[]) => {
    setElements(newElements);
    eventBus.emit(EVENTS.ELEMENTS_SYNC, newElements);
  }, []);

  const handleToggleTestMode = useCallback(() => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    eventBus.emit(EVENTS.TEST_MODE_CHANGED, newMode);
    if (newMode) {
      eventBus.emit(EVENTS.ELEMENTS_SYNC, elements);
    }
  }, [isTestMode, elements]);

  const handleImport = useCallback((importedElements: LevelElement[]) => {
    setElements(importedElements);
    setSelectedIds([]);
    eventBus.emit(EVENTS.ELEMENTS_SYNC, importedElements);
  }, []);

  return (
    <div style={styles.appContainer}>
      <div style={styles.topBar}>
        <div style={styles.title}>
          <span style={{ marginRight: 8 }}>🎮</span>
          2D Platformer Level Editor
        </div>
        <div style={styles.topBarRight}>
          <LevelIO elements={elements} onImport={handleImport} />
          <button
            style={{
              ...styles.testButton,
              backgroundColor: isTestMode ? '#e74c3c' : '#27ae60',
            }}
            onClick={handleToggleTestMode}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isTestMode ? '✕ 退出测试' : '▶ 测试模式'}
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {!isTestMode && (
          <ElementPanel
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            snapToGrid={snapToGrid}
            onSnapToggle={() => setSnapToGrid(!snapToGrid)}
          />
        )}

        <div style={styles.canvasArea}>
          <div style={styles.shadowLeft} />
          <div style={styles.canvasWrapper}>
            {isTestMode ? (
              <TestRunner />
            ) : (
              <EditorCanvas
                elements={elements}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onElementsChange={handleElementsChange}
                currentTool={currentTool}
                snapToGrid={snapToGrid}
                gridSize={gridSize}
              />
            )}
          </div>
          <div style={styles.shadowRight} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    color: '#fff',
  },
  topBar: {
    height: 48,
    backgroundColor: '#16213e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  testButton: {
    width: 120,
    height: 40,
    borderRadius: 8,
    border: 'none',
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  shadowLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    pointerEvents: 'none',
    background: 'linear-gradient(to right, rgba(0,0,0,0.6), transparent)',
    zIndex: 10,
  },
  shadowRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    pointerEvents: 'none',
    background: 'linear-gradient(to left, rgba(0,0,0,0.6), transparent)',
    zIndex: 10,
  },
};

export default App;
