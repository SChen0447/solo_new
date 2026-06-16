import { useEffect, useRef, useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import { allTags } from '@/data/artworks';
import type { Artwork } from '@/data/artworks';

const PAGE_SIZE = 12;

export default function PortfolioGrid() {
  const {
    likedArtworkIds,
    activeFilter,
    sortMode,
    mobileFilterOpen,
    toggleLike,
    setFilter,
    setSortMode,
    selectArtwork,
    setMobileFilterOpen,
    getFilteredSortedArtworks,
  } = useAppStore();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [fading, setFading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevFilterRef = useRef(activeFilter);
  const prevSortRef = useRef(sortMode);

  const artworks = getFilteredSortedArtworks();
  const visibleArtworks = artworks.slice(0, visibleCount);
  const hasMore = visibleCount < artworks.length;

  useEffect(() => {
    if (prevFilterRef.current !== activeFilter || prevSortRef.current !== sortMode) {
      setFading(true);
      const timer = setTimeout(() => {
        setVisibleCount(PAGE_SIZE);
        setFading(false);
        prevFilterRef.current = activeFilter;
        prevSortRef.current = sortMode;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeFilter, sortMode]);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore) {
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, artworks.length));
      }
    },
    [hasMore, artworks.length]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const handleLikeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleLike(id);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          Creative<span>Folio</span>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={activeFilter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">全部标签</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
          >
            <option value="date-desc">最新优先</option>
            <option value="date-asc">最早优先</option>
            <option value="likes-desc">最多点赞</option>
          </select>
        </div>

        <button
          className="hamburger-btn"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          aria-label="筛选菜单"
        >
          {mobileFilterOpen ? <span style={{ fontSize: '1.5rem' }}>✕</span> : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      <div className={`mobile-filter-panel ${mobileFilterOpen ? 'open' : ''}`}>
        <select
          className="filter-select"
          value={activeFilter}
          onChange={e => { setFilter(e.target.value); setMobileFilterOpen(false); }}
        >
          <option value="all">全部标签</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortMode}
          onChange={e => { setSortMode(e.target.value); setMobileFilterOpen(false); }}
        >
          <option value="date-desc">最新优先</option>
          <option value="date-asc">最早优先</option>
          <option value="likes-desc">最多点赞</option>
        </select>
      </div>

      <main className="main-content">
        {visibleArtworks.length === 0 ? (
          <div className="empty-state">
            <h3>暂无作品</h3>
            <p>尝试更换筛选条件</p>
          </div>
        ) : (
          <div className={`portfolio-grid ${fading ? 'fading' : ''}`}>
            {visibleArtworks.map((artwork: Artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                isLiked={likedArtworkIds.includes(artwork.id)}
                onLike={handleLikeClick}
                onClick={() => selectArtwork(artwork.id)}
              />
            ))}
          </div>
        )}

        {hasMore && <div ref={sentinelRef} className="load-more-sentinel" />}
      </main>
    </>
  );
}

function ArtworkCard({
  artwork,
  isLiked,
  onLike,
  onClick,
}: {
  artwork: Artwork;
  isLiked: boolean;
  onLike: (e: React.MouseEvent, id: string) => void;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(artwork.createdAt), { addSuffix: true, locale: zhCN });

  return (
    <div className="artwork-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="card-thumb-wrapper">
        {!imgLoaded && (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div className="loading-spinner" />
          </div>
        )}
        <img
          className="card-thumb"
          src={artwork.imageUrl}
          alt={artwork.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{ display: imgLoaded ? 'block' : 'none' }}
        />
      </div>
      <div className="card-body">
        <h3 className="card-title">{artwork.title}</h3>
        <div className="card-tags">
          {artwork.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
      <div className="card-footer">
        <button
          className={`card-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={e => onLike(e, artwork.id)}
          aria-label={isLiked ? '取消点赞' : '点赞'}
        >
          <Heart
            className="heart-icon"
            size={16}
            fill={isLiked ? 'var(--accent)' : 'none'}
            stroke={isLiked ? 'var(--accent)' : 'currentColor'}
            strokeWidth={2}
          />
          <span>{artwork.likes}</span>
        </button>
        <span className="card-date">{timeAgo}</span>
      </div>
    </div>
  );
}
