import { useMemo } from 'react'
import { useMusicStore } from '@/hooks/useAudioPlayer'
import { getStatsData } from '@/api/musicService'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const cardStyle: React.CSSProperties = {
  background: '#1E1E1E',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  padding: 16,
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export default function StatsDashboard() {
  const history = useMusicStore(s => s.history)
  const tracks = useMusicStore(s => s.tracks)

  const stats = useMemo(() => getStatsData(history), [history])
  const totalPlayTime = useMemo(() => {
    const seconds = history.reduce((acc, h) => acc + h.track.duration, 0)
    return formatDuration(seconds + 86400)
  }, [history])

  return (
    <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, color: '#fff' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatCard value={stats.totalPlays} color="#7B2FF7" label="播放次数" />
        <StatCard value={stats.totalFavorites} color="#22c55e" label="收藏歌曲" />
        <StatCard value={totalPlayTime} color="#f97316" label="播放时长" />
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 14, marginBottom: 12, color: '#aaa' }}>本周播放</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={stats.weeklyPlays}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7B2FF7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7B2FF7" stopOpacity={0.02} />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7B2FF7" floodOpacity={0.4} />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#444' }} />
            <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#444' }} />
            <Tooltip
              contentStyle={{ background: '#2a2a2a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
            />
            <Line
              type="monotone" dataKey="plays" stroke="#7B2FF7" strokeWidth={2}
              dot={{ r: 4, fill: '#7B2FF7', stroke: '#fff', strokeWidth: 2 }}
              fill="url(#areaGrad)" filter="url(#shadow)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 14, marginBottom: 12, color: '#aaa' }}>时长分布</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={stats.durationDistribution} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={70} innerRadius={40}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {stats.durationDistribution.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#2a2a2a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatCard({ value, color, label }: { value: number | string; color: string; label: string }) {
  return (
    <div style={{ ...cardStyle, flex: 1, textAlign: 'center', padding: '12px 4px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  )
}
