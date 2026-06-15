import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function HomePage() {
  const { tracks, concerts, fetchTracks, fetchConcerts, setCurrentTrack, setPlaying, loading, error } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTracks()
    fetchConcerts()
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setShowSearchResults(e.target.value.length > 0)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/tracks?search=${encodeURIComponent(searchQuery)}`)
      setShowSearchResults(false)
    }
  }

  const filteredTracks = searchQuery
    ? tracks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const upcomingConcerts = concerts
    .filter(c => new Date(c.dateTime) > new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 4)

  const featuredTracks = tracks.slice(0, 4)

  const playTrack = (track: typeof tracks[0]) => {
    setCurrentTrack(track)
    setPlaying(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>发现独立音乐之美</h1>
        <p style={styles.heroSubtitle}>探索优秀独立音乐人的作品，感受现场演出的魅力</p>
        
        <form style={styles.searchWrap} onSubmit={handleSearchSubmit}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="搜索作品、艺人..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setShowSearchResults(searchQuery.length > 0)}
          />
          <button type="submit" style={styles.searchBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          
          {showSearchResults && filteredTracks.length > 0 && (
            <div style={styles.searchDropdown}>
              {filteredTracks.slice(0, 5).map(track => (
                <Link
                  key={track.id}
                  to={`/tracks/${track.id}`}
                  style={styles.searchItem}
                  onClick={() => setShowSearchResults(false)}
                >
                  <img src={track.cover} alt={track.title} style={styles.searchItemImg} />
                  <div>
                    <div style={styles.searchItemTitle}>{track.title}</div>
                    <div style={styles.searchItemArtist}>{track.artist}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </form>
      </div>

      {error && <div className="error-banner container" style={{ marginTop: 24 }}>{error}</div>}

      <div className="container" style={{ paddingBottom: 100 }}>
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>推荐作品</h2>
            <Link to="/tracks" style={styles.moreLink}>查看全部 →</Link>
          </div>
          
          {loading ? (
            <div style={styles.grid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={styles.cardSkeleton}>
                  <div className="skeleton" style={{ width: '100%', height: 280, borderRadius: 16 }} />
                  <div style={{ marginTop: 12, padding: '0 4px' }}>
                    <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.grid}>
              {featuredTracks.map(track => (
                <div key={track.id} style={styles.card}>
                  <div style={styles.cardCoverWrap}>
                    <img src={track.cover} alt={track.title} style={styles.cardCover} />
                    <button style={styles.playOverlay} onClick={() => playTrack(track)}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </button>
                  </div>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardTitle}>{track.title}</h3>
                    <p style={styles.cardArtist}>{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>即将到来的演出</h2>
            <Link to="/concerts" style={styles.moreLink}>查看全部 →</Link>
          </div>
          
          {loading ? (
            <div style={styles.concertGrid}>
              {[1, 2].map(i => (
                <div key={i} style={styles.concertCardSkeleton}>
                  <div className="skeleton" style={{ height: 20, width: '30%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: '50%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.concertGrid}>
              {upcomingConcerts.map(concert => (
                <Link key={concert.id} to={`/concerts/${concert.id}`} style={styles.concertCard}>
                  <div style={styles.concertDate}>
                    <div style={styles.concertMonth}>{formatDate(concert.dateTime).split(' ')[0]}</div>
                    <div style={styles.concertDay}>{formatDate(concert.dateTime).split(' ')[1]}</div>
                  </div>
                  <div style={styles.concertInfo}>
                    <h3 style={styles.concertTitle}>{concert.description}</h3>
                    <p style={styles.concertVenue}>📍 {concert.venue}</p>
                    <div style={styles.concertPrice}>
                      <span style={styles.priceLabel}>票价</span>
                      <span style={styles.priceValue}>¥{concert.price} 起</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .search-input:focus {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 3px rgba(192, 133, 82, 0.15) !important;
        }
        .track-card {
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
        }
        .track-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }
        .concert-card {
          transition: background 0.3s ease-out;
        }
        .concert-card:hover {
          background: linear-gradient(135deg, #fff, #f0e6d2) !important;
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    paddingBottom: 80
  },
  hero: {
    background: 'linear-gradient(135deg, var(--bg-color), var(--bg-dark))',
    padding: '80px 20px 60px',
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 700,
    color: 'var(--dark-color)',
    marginBottom: 12
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'var(--text-light)',
    marginBottom: 36
  },
  searchWrap: {
    maxWidth: 560,
    margin: '0 auto',
    position: 'relative'
  },
  searchInput: {
    width: '100%',
    height: 44,
    padding: '0 48px 0 20px',
    border: '1px solid #ccc',
    borderRadius: 24,
    fontSize: 15,
    background: 'white',
    transition: 'all 0.2s ease-out'
  },
  searchBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--primary-color)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    zIndex: 10,
    animation: 'fadeIn 0.2s ease-out'
  },
  searchItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    transition: 'background 0.2s',
    cursor: 'pointer'
  },
  searchItemImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'cover'
  },
  searchItemTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-color)'
  },
  searchItemArtist: {
    fontSize: 12,
    color: 'var(--text-light)',
    marginTop: 2
  },
  section: {
    marginTop: 56
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--dark-color)'
  },
  moreLink: {
    fontSize: 14,
    color: 'var(--primary-color)',
    textDecoration: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
    maxWidth: 1200
  },
  card: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    cursor: 'pointer'
  },
  cardSkeleton: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  cardCoverWrap: {
    position: 'relative',
    aspectRatio: '1 / 1',
    overflow: 'hidden'
  },
  cardCover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(192, 133, 82, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease-out'
  },
  cardInfo: {
    padding: '14px 16px 18px'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-color)',
    marginBottom: 4
  },
  cardArtist: {
    fontSize: 13,
    color: 'var(--text-light)'
  },
  concertGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: 16
  },
  concertCard: {
    display: 'flex',
    gap: 20,
    padding: 20,
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textDecoration: 'none'
  },
  concertCardSkeleton: {
    padding: 20,
    background: 'white',
    borderRadius: 12
  },
  concertDate: {
    width: 60,
    height: 60,
    background: 'var(--secondary-color)',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  concertMonth: {
    fontSize: 12,
    color: 'var(--text-light)'
  },
  concertDay: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--primary-color)'
  },
  concertInfo: {
    flex: 1,
    minWidth: 0
  },
  concertTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-color)',
    marginBottom: 6,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  concertVenue: {
    fontSize: 13,
    color: 'var(--text-light)',
    marginBottom: 8
  },
  concertPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  priceLabel: {
    fontSize: 12,
    color: 'var(--text-light)'
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--primary-color)'
  }
}
