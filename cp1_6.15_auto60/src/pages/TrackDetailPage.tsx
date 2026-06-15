import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useStore } from '../store'

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrack: storeTrack, setCurrentTrack, setPlaying, isPlaying, currentTime, duration } = useStore()
  const [track, setTrack] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentLine, setCurrentLine] = useState(0)

  useEffect(() => {
    const fetchTrack = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/tracks/${id}`)
        setTrack(data)
        setTrack(data)
      } catch (err) {
        console.error('Failed to fetch track:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrack()
  }, [id])

  useEffect(() => {
    if (track && storeTrack?.id !== track.id) {
      setCurrentTrack(track)
    }
  }, [track, storeTrack?.id, setCurrentTrack])

  const lyricsLines = track?.lyrics?.split('\n').filter((line: string) => line.trim()) || []
  
  const lyricsGroups: string[][] = []
  for (let i = 0; i < lyricsLines.length; i += 4) {
    lyricsGroups.push(lyricsLines.slice(i, i + 4))
  }

  const playTrack = () => {
    if (track) {
      setCurrentTrack(track)
      setPlaying(true)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ paddingBottom: 100 }}>
          <div style={styles.detailLayout}>
            <div className="skeleton" style={{ width: '100%', paddingBottom: '100%', borderRadius: 16 }} />
            <div>
              <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 16, width: '30%', marginBottom: 24 }} />
              <div className="skeleton" style={{ height: 48, width: '40%' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ padding: '40px 20px' }}>
          <p>作品不存在</p>
          <button onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div className="container" style={{ paddingBottom: 100 }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          ← 返回
        </button>

        <div style={styles.detailLayout}>
          <div style={styles.coverWrap}>
            <img src={track.cover} alt={track.title} style={styles.cover} />
          </div>

          <div style={styles.info}>
            <h1 style={styles.title}>{track.title}</h1>
            <p style={styles.artist}>{track.artist}</p>
            
            <button style={styles.playButton} onClick={playTrack}>
              {isPlaying && storeTrack?.id === track.id ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  暂停播放
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <polygon points="8,5 19,12 8,19" />
                  </svg>
                  播放音乐
                </>
              )}
            </button>

            <div style={styles.audioPlayerMock}>
              <div style={styles.progressContainer}>
                <div style={{ ...styles.progressFill, width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.lyricsSection}>
          <h2 style={styles.sectionTitle}>歌词</h2>
          <div style={styles.lyricsContainer}>
            {lyricsGroups.map((group, groupIndex) => (
              <div key={groupIndex} style={styles.lyricsGroup}>
                {group.map((line, lineIndex) => {
                  const absoluteIndex = groupIndex * 4 + lineIndex
                  return (
                    <p
                      key={lineIndex}
                      style={{
                        ...styles.lyricsLine,
                        color: absoluteIndex === currentLine ? 'var(--primary-color)' : undefined,
                        fontWeight: absoluteIndex === currentLine ? 600 : undefined
                      }}
                    >
                      {line}
                    </p>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    paddingTop: 32
  },
  backBtn: {
    background: 'none',
    color: 'var(--text-light)',
    fontSize: 14,
    marginBottom: 24,
    padding: '8px 0'
  },
  detailLayout: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: 40,
    marginBottom: 48
  },
  coverWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--dark-color)',
    marginBottom: 12
  },
  artist: {
    fontSize: 18,
    color: 'var(--text-light)',
    marginBottom: 32
  },
  playButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 32px',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    color: 'white',
    fontSize: 16,
    fontWeight: 500,
    borderRadius: 28,
    width: 'fit-content',
    transition: 'filter 0.2s ease-out'
  },
  audioPlayerMock: {
    marginTop: 24,
    width: '100%',
    maxWidth: 300
  },
  progressContainer: {
    height: 4,
    background: 'var(--secondary-color)',
    borderRadius: 2
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary-color)',
    borderRadius: 2,
    transition: 'width 0.1s linear'
  },
  lyricsSection: {
    marginTop: 48
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--dark-color)',
    marginBottom: 24
  },
  lyricsContainer: {
    background: 'white',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  lyricsGroup: {
    marginBottom: 24
  },
  lyricsLine: {
    fontSize: 16,
    lineHeight: 2,
    color: 'var(--text-color)',
    transition: 'all 0.3s ease-out'
  }
}
