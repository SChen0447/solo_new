import { useEarthquakeStore } from '../store/useEarthquakeStore'
import type { TimeRange } from '../types'

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24小时' },
  { value: '48h', label: '48小时' },
  { value: '7d', label: '7天' },
]

export function FilterPanel() {
  const { timeRange, minMagnitude, setTimeRange, setMinMagnitude, loading } = useEarthquakeStore()

  return (
    <div
      style={{
        position: 'absolute',
        top: 100,
        left: 20,
        zIndex: 10,
        width: 280,
      }}
      className="glass-panel fade-in"
    >
      <div style={{ padding: 20 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#c0d0ff',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          筛选条件
        </h3>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              color: '#99aacc',
              marginBottom: 8,
            }}
          >
            时间范围
          </label>
          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                className={`glass-button ${timeRange === option.value ? 'active' : ''}`}
                onClick={() => setTimeRange(option.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                }}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              color: '#99aacc',
              marginBottom: 8,
            }}
          >
            最小震级: <span style={{ color: '#ffd93d', fontWeight: 600 }}>{minMagnitude.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="1.0"
            max="8.0"
            step="0.1"
            value={minMagnitude}
            onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: 'rgba(100, 150, 255, 0.2)',
              outline: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
            }}
            disabled={loading}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#667799',
              marginTop: 4,
            }}
          >
            <span>1.0</span>
            <span>8.0</span>
          </div>
        </div>

        {loading && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: '#66aaff',
              textAlign: 'center',
            }}
          >
            加载中...
          </div>
        )}
      </div>
    </div>
  )
}
