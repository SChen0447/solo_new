import React from 'react';
import { useAnimationStore } from '../store/animationStore';

const PresetsPanel: React.FC = () => {
  const { presets, selectedPresetId, selectPreset, isPresetsCollapsed } = useAnimationStore();

  if (isPresetsCollapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <div style={styles.collapsedScroll}>
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => selectPreset(preset.id)}
              style={{
                ...styles.collapsedCard,
                background: selectedPresetId === preset.id ? '#e8e8e8' : '#f7f7f7',
                borderColor: preset.color,
              }}
            >
              <div style={{ ...styles.colorDot, background: preset.color }} />
              <span style={styles.collapsedName}>{preset.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>动画预设</div>
      <div style={styles.list}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            onClick={() => selectPreset(preset.id)}
            className="preset-card"
            style={{
              ...styles.card,
              background: selectedPresetId === preset.id ? '#e8e8e8' : '#f7f7f7',
            }}
          >
            <div style={{ ...styles.colorBar, background: preset.color }} />
            <span style={styles.cardName}>{preset.name}</span>
            <span style={styles.cardCategory}>{preset.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    padding: '8px',
    overflowY: 'auto' as const,
    background: '#1a1a2e',
  },
  title: {
    color: '#e0e0e0',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    paddingLeft: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  card: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
    paddingLeft: '0',
  },
  colorBar: {
    width: '10px',
    height: '100%',
    flexShrink: 0,
    borderRadius: '4px 0 0 4px',
  },
  cardName: {
    color: '#333',
    fontSize: '13px',
    fontWeight: 500,
    marginLeft: '8px',
    marginRight: '6px',
  },
  cardCategory: {
    color: '#888',
    fontSize: '10px',
    background: 'rgba(0,0,0,0.06)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  collapsedContainer: {
    width: '100%',
    padding: '8px 12px',
    background: '#1a1a2e',
  },
  collapsedScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto' as const,
    paddingBottom: '4px',
  },
  collapsedCard: {
    flexShrink: 0,
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  collapsedName: {
    color: '#333',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
  colorDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
};

export default PresetsPanel;
