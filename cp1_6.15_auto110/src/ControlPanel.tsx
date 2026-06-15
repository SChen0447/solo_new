import { useMoleculeStore } from './store';

const buttonBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#3a3a4a',
  color: '#ffffff',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'inherit',
  lineHeight: 1.4,
  userSelect: 'none',
};

export default function ControlPanel() {
  const showHydrogen = useMoleculeStore((s) => s.showHydrogen);
  const displayMode = useMoleculeStore((s) => s.displayMode);
  const toggleHydrogen = useMoleculeStore((s) => s.toggleHydrogen);
  const toggleDisplayMode = useMoleculeStore((s) => s.toggleDisplayMode);
  const resetCamera = useMoleculeStore((s) => s.resetCamera);

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '120px',
    backgroundColor: 'rgba(30, 30, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 10,
  };

  const getActiveStyle = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? '#00d4aa' : '#3a3a4a',
    color: active ? '#0f0f23' : '#ffffff',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={panelStyle}>
      <button
        style={{
          ...buttonBaseStyle,
          ...getActiveStyle(showHydrogen),
        }}
        onClick={toggleHydrogen}
        onMouseEnter={(e) => {
          if (!showHydrogen) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.backgroundColor = '#4a4a5a';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          if (!showHydrogen) {
            e.currentTarget.style.backgroundColor = '#3a3a4a';
          }
        }}
      >
        {showHydrogen ? '隐藏氢' : '显示氢'} (H)
      </button>
      <button
        style={{
          ...buttonBaseStyle,
          ...getActiveStyle(displayMode === 'space-filling'),
        }}
        onClick={toggleDisplayMode}
        onMouseEnter={(e) => {
          if (displayMode !== 'space-filling') {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.backgroundColor = '#4a4a5a';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          if (displayMode !== 'space-filling') {
            e.currentTarget.style.backgroundColor = '#3a3a4a';
          }
        }}
      >
        {displayMode === 'ball-stick' ? '球棍模型' : '空间填充'} (M)
      </button>
      <button
        style={buttonBaseStyle}
        onClick={resetCamera}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.backgroundColor = '#4a4a5a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.backgroundColor = '#3a3a4a';
        }}
      >
        重置视角 (R)
      </button>
    </div>
  );
}
