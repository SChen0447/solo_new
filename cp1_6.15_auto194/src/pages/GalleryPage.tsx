import React, { useState, useEffect, useMemo } from 'react'
import { useGraffitiStore, Artwork } from '../store'
import eventBus from '../eventBus'

type TabType = 'mine' | 'community' | 'ranking'
type RankingPeriod = '7d' | '30d' | 'all'

interface LikeAnimState {
  [key: string]: boolean
}

function HeartIcon({ filled, animated }: { filled: boolean; animated: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? '#e91e63' : 'none'}
      stroke={filled ? '#e91e63' : '#bdbdbd'}
      strokeWidth="2"
      style={{
        transition: 'all 0.2s ease-out',
        transform: animated ? 'scale(1.2)' : 'scale(1)',
        display: 'block'
      }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function StarRating({
  artworkId,
  ratings,
  onRate
}: {
  artworkId: string
  ratings: number[]
  onRate: (rating: number) => void
}) {
  const [hover, setHover] = useState(0)
  const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hover || avg) >= star
        const isPartial = !hover && avg > star - 1 && avg < star
        const fillPercent = isPartial ? (avg - (star - 1)) * 100 : 0

        return (
          <button
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              position: 'relative',
              width: '18px',
              height: '18px',
              transition: 'transform 0.15s ease-out'
            }}
            onMouseEnterCapture={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)'
            }}
            onMouseLeaveCapture={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#bdbdbd">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            {(isFilled || isPartial) && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="#ffc107"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  clipPath: hover
                    ? undefined
                    : isPartial
                    ? `inset(0 ${100 - fillPercent}% 0 0)`
                    : undefined
                }}
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            )}
          </button>
        )
      })}
      {ratings.length > 0 && (
        <span style={{ fontSize: '11px', color: '#999', marginLeft: '4px', marginTop: '1px' }}>
          ({avg.toFixed(1)})
        </span>
      )}
    </div>
  )
}

function MedalBadge({ rank }: { rank: number }) {
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32']
  const labels = ['🥇', '🥈', '🥉']
  if (rank > 2) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: '-10px',
        left: '-10px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: colors[rank],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        boxShadow: `0 2px 8px ${colors[rank]}80`,
        zIndex: 2,
        border: '2px solid rgba(255,255,255,0.3)'
      }}
    >
      {labels[rank]}
    </div>
  )
}

function ArtworkCard({
  artwork,
  rank,
  showLike = true,
  showRating = true,
  showSubmit = false,
  submittedIds
}: {
  artwork: Artwork
  rank?: number
  showLike?: boolean
  showRating?: boolean
  showSubmit?: boolean
  submittedIds: Set<string>
}) {
  const { likeArtwork, rateArtwork, submitToGallery } = useGraffitiStore()
  const [likeAnim, setLikeAnim] = useState(false)
  const avgRating = artwork.ratings.length > 0 ? artwork.ratings.reduce((a, b) => a + b, 0) / artwork.ratings.length : 0
  const isSubmitted = submittedIds.has(artwork.id)

  const handleLike = () => {
    setLikeAnim(true)
    likeArtwork(artwork.id)
    setTimeout(() => setLikeAnim(false), 300)
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.2s ease-out',
        border: '1px solid rgba(255,255,255,0.06)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {rank !== undefined && <MedalBadge rank={rank} />}
      <div style={{ position: 'relative' }}>
        <img
          src={artwork.imageData}
          alt={artwork.title}
          style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {artwork.title}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>
              {artwork.author} · {new Date(artwork.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
          {rank !== undefined && (
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: rank < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][rank] : '#666',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }}
            >
              #{rank + 1}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showLike && (
              <button
                onClick={handleLike}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <HeartIcon filled={artwork.likes > 0} animated={likeAnim} />
                <span style={{ fontSize: '12px', color: artwork.likes > 0 ? '#e91e63' : '#888' }}>
                  {artwork.likes}
                </span>
              </button>
            )}
            {showRating && (
              <StarRating artworkId={artwork.id} ratings={artwork.ratings} onRate={(r) => rateArtwork(artwork.id, r)} />
            )}
          </div>
          {showSubmit && (
            <button
              onClick={() => submitToGallery(artwork.id)}
              disabled={isSubmitted}
              style={{
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: isSubmitted ? 'default' : 'pointer',
                backgroundColor: isSubmitted ? '#2a2a2a' : '#7c3aed',
                color: isSubmitted ? '#666' : 'white',
                fontWeight: 500,
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitted) {
                  e.currentTarget.style.backgroundColor = '#6d28d9'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitted) {
                  e.currentTarget.style.backgroundColor = '#7c3aed'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {isSubmitted ? '✓ 已提交' : '提交画廊'}
            </button>
          )}
        </div>
        {rank !== undefined && (
          <div
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px'
            }}
          >
            <span style={{ color: '#888' }}>综合得分</span>
            <span style={{ color: '#7c3aed', fontWeight: 700 }}>
              {(artwork.likes * 0.4 + avgRating * 0.6).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GalleryPage() {
  const { artworks } = useGraffitiStore()
  const [activeTab, setActiveTab] = useState<TabType>('mine')
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('all')
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as TabType
    if (hash === 'community' || hash === 'ranking') {
      setActiveTab(hash)
    }
  }, [])

  useEffect(() => {
    const unsub = eventBus.on('artwork:submitted', (id: string) => {
      setSubmittedIds((prev) => new Set([...prev, id]))
    })
    return () => unsub()
  }, [])

  const communityArtworks = useMemo(() => {
    return artworks.filter((a) => submittedIds.has(a.id))
  }, [artworks, submittedIds])

  const rankedArtworks = useMemo(() => {
    const now = Date.now()
    const periodMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      all: Infinity
    }[rankingPeriod]

    const filtered = artworks.filter((a) => now - a.createdAt <= periodMs)
    return filtered
      .map((a) => {
        const avgRating = a.ratings.length > 0 ? a.ratings.reduce((x, y) => x + y, 0) / a.ratings.length : 0
        const score = a.likes * 0.4 + avgRating * 0.6
        return { ...a, score }
      })
      .sort((a, b) => b.score - a.score)
  }, [artworks, rankingPeriod])

  const getTabStyle = (tab: TabType) => ({
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? 'white' : '#888',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'all 0.2s ease-out'
  })

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '32px',
          gap: '8px'
        }}
      >
        {(['mine', 'community', 'ranking'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab !== 'mine') {
                window.location.hash = tab
              } else {
                history.pushState(null, '', window.location.pathname)
              }
            }}
            style={getTabStyle(tab)}
            onMouseEnter={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = '#888'
            }}
          >
            {tab === 'mine' ? '我的作品' : tab === 'community' ? '社区画廊' : '排行榜'}
            {activeTab === tab && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: '3px',
                  backgroundColor: '#7c3aed',
                  borderRadius: '2px'
                }}
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'ranking' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['7d', '30d', 'all'] as RankingPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setRankingPeriod(p)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: rankingPeriod === p ? '#7c3aed' : '#1e1e1e',
                color: rankingPeriod === p ? 'white' : '#888',
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                if (rankingPeriod !== p) {
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (rankingPeriod !== p) {
                  e.currentTarget.style.color = '#888'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {p === '7d' ? '7天榜' : p === '30d' ? '30天榜' : '总榜'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'mine' && (
        <>
          {artworks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#666'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <p style={{ fontSize: '16px' }}>还没有作品，去画板创作你的第一幅涂鸦吧！</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}
            >
              {artworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  showSubmit={true}
                  submittedIds={submittedIds}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'community' && (
        <>
          {communityArtworks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#666'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
              <p style={{ fontSize: '16px' }}>画廊还没有作品，把你的作品提交到社区吧！</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}
            >
              {communityArtworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} submittedIds={submittedIds} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'ranking' && (
        <>
          {rankedArtworks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#666'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
              <p style={{ fontSize: '16px' }}>该时段暂无排行数据</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}
            >
              {rankedArtworks.map((artwork, idx) => (
                <ArtworkCard key={artwork.id} artwork={artwork} rank={idx} submittedIds={submittedIds} />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
