import useWhiteboardStore, { ToolType } from '../store/useWhiteboardStore';

const PRESET_COLORS = [
  '#ff6b6b', '#ff8c00', '#ffd93d', '#6bcf7f',
  '#00d2ff', '#4d96ff', '#9b59b6', '#e056fd',
  '#ffffff', '#c0c0c0', '#808080', '#1a1a2e'
];

const TOOLS: Array<{ type: ToolType; icon: string; label: string }> = [
  { type: 'select', icon: '↖', label: '选择' },
  { type: 'pen', icon: '✏️', label: '画笔' },
  { type: 'rect', icon: '▭', label: '矩形' },
  { type: 'circle', icon: '○', label: '圆形' },
  { type: 'line', icon: '／', label: '直线' },
  { type: 'note', icon: '📝', label: '便签' },
  { type: 'image', icon: '🖼️', label: '图片' }
];

export default function Toolbar() {
  const {
    currentTool,
    setCurrentTool,
    penColor,
    setPenColor,
    penThickness,
    setPenThickness
  } = useWhiteboardStore();

  const showColorThickness = ['pen', 'rect', 'circle', 'line'].includes(currentTool);

  return (
    <div
      style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '14px 10px',
        background: 'rgba(22, 33, 62, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      {TOOLS.map((tool) => {
        const isActive = currentTool === tool.type;
        return (
          <button
            key={tool.type}
            onClick={() => setCurrentTool(tool.type)}
            title={tool.label}
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive
                ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(58, 123, 213, 0.2) 100%)'
                : 'transparent',
              border: isActive ? '1px solid rgba(0, 210, 255, 0.5)' : '1px solid transparent',
              borderRadius: '10px',
              color: isActive ? '#00d2ff' : '#c4c9d4',
              cursor: 'pointer',
              fontSize: tool.type === 'pen' || tool.type === 'note' || tool.type === 'image' ? '18px' : '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontWeight: 600
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#c4c9d4';
              }
            }}
          >
            {tool.icon}
          </button>
        );
      })}

      {showColorThickness && (
        <>
          <div
            style={{
              height: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
              margin: '8px 4px'
            }}
          />

          <div style={{ padding: '4px 6px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              marginBottom: '10px'
            }}>
              {PRESET_COLORS.map((color) => {
                const isActive = penColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    title={color}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: color,
                      border: isActive ? '2px solid #00d2ff' : color === '#ffffff' ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.3s',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isActive ? '0 0 8px rgba(0, 210, 255, 0.5)' : 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = isActive ? 'scale(1.1)' : 'scale(1)'; }}
                  />
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 2px'
            }}>
              <div
                title="当前颜色"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: penColor,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  flexShrink: 0
                }}
              />
              <input
                type="text"
                value={penColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    setPenColor(v);
                  }
                }}
                placeholder="#HEX"
                style={{
                  width: '100%',
                  padding: '5px 7px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ padding: '4px 10px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{ fontSize: '11px', color: '#8892a6' }}>粗细</span>
              <span style={{ fontSize: '11px', color: '#00d2ff', fontFamily: 'monospace' }}>{penThickness}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={penThickness}
              onChange={(e) => setPenThickness(Number(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                cursor: 'pointer',
                accentColor: '#00d2ff'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: '8px',
              height: '20px'
            }}>
              <div style={{
                width: `${penThickness * 2}px`,
                height: `${penThickness * 2}px`,
                borderRadius: '50%',
                background: penColor
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
