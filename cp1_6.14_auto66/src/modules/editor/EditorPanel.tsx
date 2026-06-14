import { useState } from 'react';
import { RoomCanvas } from './RoomCanvas';
import { useEditorState } from './useEditorState';
import styles from './EditorPanel.module.css';
import type { ElementType } from '../../types';

const TOOLS: { id: ElementType | 'select'; label: string; icon: string }[] = [
  { id: 'select', label: '选择', icon: '↔' },
  { id: 'floor', label: '地板', icon: '⬜' },
  { id: 'wall', label: '墙壁', icon: '🧱' },
  { id: 'entrance', label: '入口', icon: '🚪' },
  { id: 'exit', label: '出口', icon: '🏁' },
  { id: 'item', label: '道具', icon: '💎' },
];

export function EditorPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    cols,
    rows,
    currentTool,
    setCurrentTool,
    resizeRoom,
    selectedElementId,
    elements,
    deleteElement,
  } = useEditorState();

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 8 && value <= 20) {
      resizeRoom(value, rows);
    }
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 6 && value <= 15) {
      resizeRoom(cols, value);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`${styles.toolButton} ${
              currentTool === tool.id ? styles.active : ''
            }`}
            onClick={() => setCurrentTool(tool.id)}
            title={tool.label}
          >
            <span className={styles.toolIcon}>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.canvasContainer}>
        <RoomCanvas />
      </div>

      <button
        className={`${styles.toggleButton} ${
          sidebarCollapsed ? styles.collapsed : ''
        }`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? '展开参数面板' : '折叠参数面板'}
      >
        {sidebarCollapsed ? '◀' : '▶'}
      </button>

      <div
        className={`${styles.sidebar} ${
          sidebarCollapsed ? styles.collapsed : ''
        }`}
      >
        <h3 className={styles.sidebarTitle}>房间设置</h3>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>列数 (8-20)</label>
            <input
              type="number"
              className={styles.formInput}
              value={cols}
              onChange={handleColsChange}
              min={8}
              max={20}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>行数 (6-15)</label>
            <input
              type="number"
              className={styles.formInput}
              value={rows}
              onChange={handleRowsChange}
              min={6}
              max={15}
            />
          </div>
        </div>

        {selectedElement && (
          <>
            <h3 className={styles.sidebarTitle}>选中元素</h3>
            <div className={styles.elementInfo}>
              <div className={styles.elementInfoItem}>
                <span className={styles.elementInfoLabel}>类型</span>
                <span className={styles.elementInfoValue}>
                  {getElementTypeName(selectedElement.type)}
                </span>
              </div>
              <div className={styles.elementInfoItem}>
                <span className={styles.elementInfoLabel}>位置 X</span>
                <span className={styles.elementInfoValue}>
                  {selectedElement.x}
                </span>
              </div>
              <div className={styles.elementInfoItem}>
                <span className={styles.elementInfoLabel}>位置 Y</span>
                <span className={styles.elementInfoValue}>
                  {selectedElement.y}
                </span>
              </div>
              <button
                className={styles.deleteButton}
                onClick={() => deleteElement(selectedElement.id)}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#e94560',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6b6b';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e94560';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                删除元素 (Delete)
              </button>
            </div>
          </>
        )}

        <h3 className={styles.sidebarTitle} style={{ marginTop: '24px' }}>
          操作提示
        </h3>
        <div
          style={{
            fontSize: '12px',
            color: '#94a3b8',
            lineHeight: '1.8',
          }}
        >
          <p>• 点击工具栏选择工具</p>
          <p>• 点击画布放置元素</p>
          <p>• 拖拽可移动元素位置</p>
          <p>• 按住 Ctrl 拖拽复制元素</p>
          <p>• 选中后按 Delete 删除</p>
          <p>• 入口和出口只能各一个</p>
        </div>
      </div>
    </div>
  );
}

function getElementTypeName(type: ElementType): string {
  const names: Record<ElementType, string> = {
    floor: '地板',
    wall: '墙壁',
    entrance: '入口',
    exit: '出口',
    item: '道具',
  };
  return names[type];
}
