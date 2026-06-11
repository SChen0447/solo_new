import type { ToolType } from './types'

interface ToolbarProps {
  tool: ToolType
  setTool: (tool: ToolType) => void
  color: string
  setColor: (color: string) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const COLOR_PALETTE = [
  '#ff6b6b', '#ff8c42', '#ffd93d', '#6bcb77',
  '#4d96ff', '#6f69ac', '#b983ff', '#e2e8f0',
]

const TOOLS: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: '↖', label: '选择' },
  { type: 'pen', icon: '✎', label: '画笔' },
  { type: 'rect', icon: '▭', label: '矩形' },
  { type: 'circle', icon: '◯', label: '圆形' },
  { type: 'sticky', icon: '📝', label: '便签' },
]

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
}: ToolbarProps) {
  return (
    <div style={styles.toolbar}>
      <div style={styles.toolGroup}>
        {TOOLS.map((t) => (
          <button
            key={t.type}
            title={t.label}
            onClick={() => setTool(t.type)}
            style={{
              ...styles.toolBtn,
              backgroundColor: tool === t.type ? '#00b4d8' : '#16213e',
              color: tool === t.type ? '#fff' : '#e2e8f0',
            }}
          >
            <span style={styles.toolIcon}>{t.icon}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.colorGroup}>
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              ...styles.colorBtn,
              backgroundColor: c,
              border: color === c ? '2px solid #e2e8f0' : '2px solid transparent',
              transform: color === c ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={styles.colorPicker}
        />
      </div>

      <div style={styles.divider} />

      <div style={styles.strokeGroup}>
        <span style={styles.strokeLabel}>粗细</span>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          style={styles.strokeSlider}
        />
        <span style={styles.strokeValue}>{strokeWidth}px</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 14px',
    backgroundColor: '#1a1a2e',
    borderRadius: '10px',
    border: '1px solid #2a2a4e',
  },
  toolGroup: {
    display: 'flex',
    gap: '4px',
  },
  toolBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '18px',
  },
  toolIcon: {
    lineHeight: 1,
  },
  divider: {
    width: '1px',
    height: '28px',
    backgroundColor: '#2a2a4e',
  },
  colorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  colorBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.15s ease',
  },
  colorPicker: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    padding: 0,
  },
  strokeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  strokeLabel: {
    fontSize: '12px',
    color: '#8892b0',
  },
  strokeSlider: {
    width: '80px',
    height: '4px',
    accentColor: '#00b4d8',
    cursor: 'pointer',
  },
  strokeValue: {
    fontSize: '11px',
    color: '#8892b0',
    width: '32px',
    textAlign: 'right',
  },
}
