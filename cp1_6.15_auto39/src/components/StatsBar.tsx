import { useGameStore } from '../store/gameStore';

export function StatsBar() {
  const { stats } = useGameStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (dist: number): string => {
    if (dist >= 10000) {
      return (dist / 1000).toFixed(1) + 'k';
    }
    return dist.toString();
  };

  const items = [
    { label: '捕猎成功', value: stats.huntCount, icon: '🎯', color: '#ff9800' },
    { label: '移动距离', value: formatDistance(stats.totalDistance), icon: '📏', color: '#4caf50' },
    { label: '存活时长', value: formatTime(stats.survivalTime), icon: '⏱️', color: '#2196f3' },
    { label: '存活猎物', value: `${stats.alivePreys}/3`, icon: '🐰', color: '#d4a373' }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.65)',
        borderRadius: '14px',
        padding: '14px 28px',
        display: 'flex',
        gap: '36px',
        color: '#fff',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        zIndex: 10
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            minWidth: '80px'
          }}
        >
          <div style={{ fontSize: '11px', opacity: 0.7, letterSpacing: '0.5px' }}>
            {item.icon} {item.label}
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: item.color,
              textShadow: `0 0 12px ${item.color}55`,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
