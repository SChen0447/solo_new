import { useGameStore } from '../store/useGameStore';
import type { ToolMode } from '../engine/InteractionSystem';

const HUD = () => {
  const timeString = useGameStore((state) => state.timeString);
  const toolMode = useGameStore((state) => state.toolMode);
  const placedBlockCount = useGameStore((state) => state.placedBlockCount);
  const setToolMode = useGameStore((state) => state.setToolMode);

  const tools: { mode: ToolMode; icon: string; label: string }[] = [
    { mode: 'place', icon: '+', label: 'Place' },
    { mode: 'remove', icon: '−', label: 'Remove' },
    { mode: 'inspect', icon: '👁', label: 'Inspect' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.timePanel}>
        <div style={styles.timeLabel}>TIME</div>
        <div style={styles.timeValue}>{timeString}</div>
      </div>

      <div style={styles.statsPanel}>
        <div style={styles.statsLabel}>BLOCKS PLACED</div>
        <div style={styles.statsValue}>{placedBlockCount}</div>
      </div>

      <div style={styles.toolPanel}>
        {tools.map((tool) => (
          <button
            key={tool.mode}
            style={{
              ...styles.toolButton,
              ...(toolMode === tool.mode ? styles.toolButtonActive : {}),
              ...(tool.mode === 'inspect' ? { fontSize: '18px' } : {})
            }}
            onClick={() => setToolMode(tool.mode)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div style={styles.helpPanel}>
        <div style={styles.helpText}>Left Click: Place | Right Click: Remove</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily: 'monospace',
    color: '#E0E0E0'
  },

  timePanel: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 20px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 0.5px 10px rgba(0, 0, 0, 0.3)'
  },

  timeLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '2px',
    marginBottom: '4px'
  },

  timeValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFF',
    textShadow: '0 0 10px rgba(255, 152, 0, 0.5)'
  },

  statsPanel: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 20px',
    backdropFilter: 'blur(10px)',
    textAlign: 'right',
    boxShadow: '0 0.5px 10px rgba(0, 0, 0, 0.3)'
  },

  statsLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '1.5px',
    marginBottom: '4px'
  },

  statsValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFF'
  },

  toolPanel: {
    position: 'absolute',
    bottom: '30px',
    right: '30px',
    display: 'flex',
    gap: '12px',
    pointerEvents: 'auto'
  },

  toolButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#E0E0E0',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0.5px 8px rgba(0, 0, 0, 0.4)',
    borderBottom: '2px solid transparent',
    fontFamily: 'monospace'
  },

  toolButtonActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    borderBottom: '2px solid #FF9800',
    boxShadow: '0 0.5px 12px rgba(255, 152, 0, 0.4)',
    color: '#FFF'
  },

  helpPanel: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 16px'
  },

  helpText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: '0.5px'
  }
};

export default HUD;
