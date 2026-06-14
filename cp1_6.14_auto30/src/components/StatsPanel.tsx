import { useEarthquakeStore } from '../store/useEarthquakeStore'
import { formatTime } from '../utils/geoUtils'

export function StatsPanel() {
  const { stats, timeRange } = useEarthquakeStore()

  const timeRangeLabel = {
    '24h': '24小时',
    '48h': '48小时',
    '7d': '7天',
  }[timeRange]

  return (
    <div
      style={{
        position: 'absolute',
        top: 100,
        right: 20,
        zIndex: 10,
        width: 260,
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
          统计摘要
          <span style={{ fontSize: 12, color: '#667799', fontWeight: 400, marginLeft: 8 }}>
            ({timeRangeLabel})
          </span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatItem label="地震总数" value={stats.total.toString()} suffix="次" color="#6bcb77" />
          <StatItem
            label="最大震级"
            value={stats.maxMagnitude.toFixed(1)}
            suffix="级"
            color="#ff2d2d"
          />
          <StatItem
            label="平均深度"
            value={stats.avgDepth.toFixed(1)}
            suffix="公里"
            color="#4da6ff"
          />
          <StatItem
            label="最近震级"
            value={stats.latestMagnitude.toFixed(1)}
            suffix="级"
            color="#ffd93d"
          />
        </div>

        {stats.latestTime > 0 && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid rgba(100, 150, 255, 0.2)',
              fontSize: 12,
              color: '#8899bb',
            }}
          >
            <div style={{ marginBottom: 4 }}>最近发生时间</div>
            <div style={{ color: '#c0d0ff', fontSize: 13 }}>{formatTime(stats.latestTime)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string
  suffix: string
  color: string
}

function StatItem({ label, value, suffix, color }: StatItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(30, 50, 90, 0.4)',
        borderRadius: 8,
        transition: 'all 0.2s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(50, 80, 140, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(30, 50, 90, 0.4)'
      }}
    >
      <span style={{ fontSize: 13, color: '#99aacc' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>
        {value}
        <span style={{ fontSize: 12, fontWeight: 400, color: '#7788aa', marginLeft: 4 }}>
          {suffix}
        </span>
      </span>
    </div>
  )
}
