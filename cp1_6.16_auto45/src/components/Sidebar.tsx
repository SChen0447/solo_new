import { Heart, Clock, Music } from 'lucide-react'
import { useMusicStore } from '@/hooks/useAudioPlayer'

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

export default function Sidebar() {
  const { favorites, history, currentTrack, playTrack } = useMusicStore()

  return (
    <aside
      style={{
        width: 200,
        background: '#1E1E1E',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#444 transparent',
        }}
        className="sidebar-scroll"
      >
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Heart size={16} color="#ff4d6d" fill="#ff4d6d" />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>收藏夹</span>
          </div>

          {favorites.length === 0 ? (
            <div style={{ color: '#888', fontSize: 12, padding: '8px 0', textAlign: 'center' }}>
              暂无收藏
            </div>
          ) : (
            favorites.map((track) => {
              const isActive = currentTrack?.id === track.id
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Heart size={12} color="#ff4d6d" fill="#ff4d6d" style={{ flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div
                      style={{
                        color: '#fff',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {track.title}
                    </div>
                    <div style={{ color: '#888', fontSize: 11 }}>{track.artist}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: '4px 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Clock size={16} color="#a78bfa" />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>播放历史</span>
          </div>

          {history.map((entry) => {
            const isActive = currentTrack?.id === entry.track.id
            return (
              <div
                key={`${entry.track.id}-${entry.timestamp}`}
                onClick={() => playTrack(entry.track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <Music size={12} color="#a78bfa" style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.track.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: 11 }}>{entry.track.artist}</span>
                    <span style={{ color: '#666', fontSize: 10, flexShrink: 0 }}>
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 2px;
        }
      `}</style>
    </aside>
  )
}
