import { useGameStore } from '../store/gameStore';

export function ControlPanel() {
  const { setManualDirection, setManualOverride, triggerReset } = useGameStore();

  const handleButtonDown = (dir: 'up' | 'down' | 'left' | 'right') => {
    setManualOverride(true);
    setManualDirection({ [dir]: true });
  };

  const handleButtonUp = (dir: 'up' | 'down' | 'left' | 'right') => {
    setManualDirection({ [dir]: false });
  };

  const buttonStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    userSelect: 'none' as const,
    fontWeight: 'bold' as const
  };

  const buttonHoverStyle = {
    background: 'rgba(255,255,255,0.3)',
    transform: 'scale(1.08)'
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        color: '#fff',
        backdropFilter: 'blur(4px)',
        zIndex: 10
      }}
    >
      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', textAlign: 'center' }}>
        WASD / 方向控制
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <button
          style={buttonStyle}
          onMouseDown={() => handleButtonDown('up')}
          onMouseUp={() => handleButtonUp('up')}
          onMouseLeave={(e) => { handleButtonUp('up'); e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { e.preventDefault(); handleButtonDown('up'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleButtonUp('up'); }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
        >
          ▲
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            style={buttonStyle}
            onMouseDown={() => handleButtonDown('left')}
            onMouseUp={() => handleButtonUp('left')}
            onMouseLeave={(e) => { handleButtonUp('left'); e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('left'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleButtonUp('left'); }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
          >
            ◀
          </button>
          <button
            style={buttonStyle}
            onMouseDown={() => handleButtonDown('down')}
            onMouseUp={() => handleButtonUp('down')}
            onMouseLeave={(e) => { handleButtonUp('down'); e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('down'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleButtonUp('down'); }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
          >
            ▼
          </button>
          <button
            style={buttonStyle}
            onMouseDown={() => handleButtonDown('right')}
            onMouseUp={() => handleButtonUp('right')}
            onMouseLeave={(e) => { handleButtonUp('right'); e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={(e) => { e.preventDefault(); handleButtonDown('right'); }}
            onTouchEnd={(e) => { e.preventDefault(); handleButtonUp('right'); }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
          >
            ▶
          </button>
        </div>
      </div>
      <button
        onClick={() => { triggerReset(); setManualOverride(false); }}
        style={{
          marginTop: '6px',
          padding: '10px 16px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #ff9800, #f44336)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          letterSpacing: '0.5px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        🔄 重置 (R)
      </button>
      <div style={{ fontSize: '11px', opacity: 0.6, textAlign: 'center', marginTop: '2px' }}>
        按ESC释放AI
      </div>
    </div>
  );
}
