import React from 'react';
import { useGrowthStore } from '../store';

const InfoPanel: React.FC = () => {
  const partInfo = useGrowthStore((s) => s.partInfo);
  const setPartInfo = useGrowthStore((s) => s.setPartInfo);

  if (!partInfo.visible) return null;

  return (
    <div
      onMouseLeave={() => setPartInfo({ ...partInfo, visible: false })}
      style={{
        ...styles.container,
        left: partInfo.x + 15,
        top: partInfo.y + 15,
        animation: 'slideUp 0.3s ease-out forwards',
      }}
    >
      <div style={styles.name}>{partInfo.name}</div>
      <div style={styles.details}>{partInfo.details}</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    zIndex: 1000,
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    padding: '12px 16px',
    borderRadius: 8,
    pointerEvents: 'auto',
    minWidth: 160,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: '#00d4aa',
    marginBottom: 6,
  },
  details: {
    fontSize: 12,
    color: '#a0a0b0',
    lineHeight: 1.6,
  },
};

export default InfoPanel;
