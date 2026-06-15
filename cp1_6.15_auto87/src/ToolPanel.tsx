import React from 'react';
import { useStore } from './store';
import { ToolType, COLOR_PALETTE } from './types';

const toolIcons: Record<ToolType, string> = {
  pen: '✏️',
  rect: '⬜',
  circle: '⭕',
  text: 'T',
  eraser: '🗑️'
};

const toolLabels: Record<ToolType, string> = {
  pen: '画笔',
  rect: '矩形',
  circle: '圆形',
  text: '文字',
  eraser: '橡皮'
};

interface ToolPanelProps {
  isCollapsed?: boolean;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ isCollapsed = false }) => {
  const {
    tool,
    color,
    strokeWidth,
    opacity,
    fontSize,
    setTool,
    setColor,
    setStrokeWidth,
    setOpacity,
    setFontSize
  } = useStore();

  const tools: ToolType[] = ['pen', 'rect', 'circle', 'text', 'eraser'];

  if (isCollapsed) {
    return (
      <div style={styles.collapsedContainer}>
        {tools.map((t) => (
          <button
            key={t}
            style={{
              ...styles.toolButton,
              ...(tool === t ? styles.activeToolButton : {}),
              ...styles.collapsedButton
            }}
            onClick={() => setTool(t)}
            title={toolLabels[t]}
          >
            <span style={styles.toolIcon}>{toolIcons[t]}</span>
          </button>
        ))}
        <div style={styles.collapsedDivider} />
        <div style={styles.collapsedColorPicker}>
          {COLOR_PALETTE.slice(0, 6).map((c) => (
            <div
              key={c}
              style={{
                ...styles.colorSwatch,
                ...(color === c ? styles.selectedColorSwatch : {}),
                width: 24,
                height: 24
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolSection}>
        <h3 style={styles.sectionTitle}>工具</h3>
        <div style={styles.toolsGrid}>
          {tools.map((t) => (
            <button
              key={t}
              style={{
                ...styles.toolButton,
                ...(tool === t ? styles.activeToolButton : {})
              }}
              onClick={() => setTool(t)}
              title={toolLabels[t]}
            >
              <span style={styles.toolIcon}>{toolIcons[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>颜色</h3>
        <div style={styles.colorGrid}>
          {COLOR_PALETTE.map((c) => (
            <div
              key={c}
              style={{
                ...styles.colorSwatch,
                ...(color === c ? styles.selectedColorSwatch : {})
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {(tool === 'pen' || tool === 'rect' || tool === 'circle') && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>粗细: {strokeWidth}px</h3>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
      )}

      {(tool === 'pen' || tool === 'rect' || tool === 'circle') && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>透明度: {opacity.toFixed(1)}</h3>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
      )}

      {tool === 'text' && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>字体大小: {fontSize}px</h3>
          <input
            type="range"
            min="16"
            max="48"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={styles.slider}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: 200,
    backgroundColor: '#34495e',
    padding: 16,
    overflowY: 'auto' as const,
    height: '100%',
    boxSizing: 'border-box' as const
  },
  collapsedContainer: {
    height: 50,
    backgroundColor: '#34495e',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    overflowX: 'auto' as const
  },
  collapsedDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2c3e50'
  },
  collapsedColorPicker: {
    display: 'flex',
    gap: 6
  },
  collapsedButton: {
    width: 36,
    height: 36
  },
  toolSection: {
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    color: '#ecf0f1',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: 600
  },
  toolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#ecf0f1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: 0
  },
  activeToolButton: {
    backgroundColor: '#ffffff',
    borderLeft: '2px solid #3498db',
    borderRadius: 4
  },
  toolIcon: {
    fontSize: 18
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 6
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 4,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.15s ease'
  },
  selectedColorSwatch: {
    border: '2px solid #ffffff'
  },
  slider: {
    width: 150,
    height: 6,
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    background: '#95a5a6',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer'
  }
};

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: none;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  button:hover {
    background-color: #bdc3c7 !important;
  }
  div[style*="colorSwatch"]:hover {
    transform: scale(1.05);
  }
`;
document.head.appendChild(sliderStyle);

export default ToolPanel;
