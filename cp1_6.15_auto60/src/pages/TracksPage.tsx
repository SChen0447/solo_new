import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'

export default function TracksPage() {
  const { tracks, fetchTracks, setCurrentTrack, setPlaying, loading, error } = useStore()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [localSearch, setLocalSearch] = useState(searchQuery)

  useEffect(() => {
    fetchTracks(searchQuery || undefined)
  }, [searchQuery])

  const playTrack = (track: typeof tracks[0]) => {
    setCurrentTrack(track)
    setPlaying(true)
  }

  return (
    <div style={styles.page}>
      <div className="container" style={{ paddingBottom: 100 }}>
        <div style={styles.header}>
          <h1 style={styles.title}>全部作品</h1>
          <div style={styles.searchBar}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="搜索作品、艺人..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            <Link to={`/tracks${localSearch ? `?search=${encodeURIComponent(localSearch)}` : ''}`} style={styles.searchBtn}>
              搜索
            </Link>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div style={styles.grid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} style={styles.cardSkeleton}>
                <div className="skeleton" style={{ width: '100%', paddingBottom: '100%', borderRadius: 16 }} />
                <div style={{ marginTop: 12 }}>
                  <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div style={styles.empty}>
            <p>没有找到相关作品</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {tracks.map(track => (
              <div key={track.id} style={styles.card}>
                <Link to={`/tracks/${track.id}`} style={styles.cardLink}>
                  <div style={styles.coverWrap}>
                    <img src={track.cover} alt={track.title} style={styles.cover} />
                    <button
                      style={styles.playBtn}
                      onClick={(e) => {
                        e.preventDefault()
                        playTrack(track)
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </button>
                  </div>
                  <div style={styles.info}>
                    <h3 style={styles.trackTitle}>{track.title}</h3>
                    <p style={styles.artist}>{track.artist}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .track-card {
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
        }
        .track-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }
        .track-card:hover .play-btn {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .play-btn {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
          transition: all 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    paddingTop: 32
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--dark-color)'
  },
  searchBar: {
    display: 'flex',
    gap: 8
  },
  searchInput: {
    width: 280,
    height: 40,
    padding: '0 16px',
    border: '1px solid #ddd',
    borderRadius: 20,
    fontSize: 14
  },
  searchBtn: {
    padding: '0 20px',
    height: 40,
    background: 'var(--primary-color)',
    color: 'white',
    borderRadius: 20,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24
  },
  card: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  cardSkeleton: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  cardLink: {
    textDecoration: 'none',
    display: 'block'
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    overflow: 'hidden'
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(192, 133, 82, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer'
  },
  info: {
    padding: '14px 16px 18px'
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-color)',
    marginBottom: 4
  },
  artist: {
    fontSize: 13,
    color: 'var(--text-light)'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-light)'
  }
}
