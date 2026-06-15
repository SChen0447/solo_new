import { useRef, useEffect } from 'react'
import { useMusicStore } from '@/hooks/useAudioPlayer'
import type { MusicTrack } from '@/types'
import { Search, X, Heart } from 'lucide-react'

const HOT_TAGS = ['流行', '摇滚', '电子', '古典', '爵士']

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const keyframes = `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`

export default function SearchBar() {
  const { searchTracks, searchQuery, setSearchQuery, searchResults, isLoading, playTrack, toggleFavorite, currentTrack } = useMusicStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = keyframes
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      searchTracks(value)
    }, 300)
  }

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag)
    searchTracks(tag)
  }

  const handleClear = () => {
    setSearchQuery('')
    searchTracks('')
  }

  const isFavorite = (track: MusicTrack) =>
    useMusicStore.getState().favorites.some(f => f.id === track.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ position: 'absolute', left: 12, color: '#999' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleInputChange(e.target.value)}
          placeholder="搜索歌曲、艺术家..."
          style={{
            width: '100%', padding: '10px 36px 10px 38px', borderRadius: 20,
            background: '#282828', border: 'none', outline: 'none',
            color: '#fff', fontSize: 14,
          }}
        />
        {searchQuery && (
          <X size={16} onClick={handleClear} style={{ position: 'absolute', right: 12, color: '#999', cursor: 'pointer' }} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {HOT_TAGS.map(tag => (
          <span
            key={tag}
            onClick={() => handleTagClick(tag)}
            style={{
              padding: '4px 14px', borderRadius: 999, background: '#333',
              color: '#ccc', fontSize: 12, cursor: 'pointer',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {isLoading && <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 8 }}>搜索中...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
        {searchResults.map((track, index) => {
          const active = currentTrack?.id === track.id
          const fav = isFavorite(track)
          return (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
                borderRadius: 8, cursor: 'pointer',
                background: active ? '#333' : 'transparent',
                animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
              }}
            >
              <img
                src={track.coverUrl} alt={track.title}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)', objectFit: 'cover', flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.title}
                </div>
                <div style={{ color: '#888', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.artist}
                </div>
              </div>
              <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>
                {formatDuration(track.duration)}
              </span>
              <Heart
                size={18}
                onClick={e => { e.stopPropagation(); toggleFavorite(track) }}
                style={{
                  flexShrink: 0, cursor: 'pointer',
                  fill: fav ? '#ef4444' : 'none',
                  color: fav ? '#ef4444' : '#888',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
