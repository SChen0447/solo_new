import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatarStore, Avatar } from '../store/avatarStore';
import { getAvatars } from '../api/avatarApi';

function GalleryCard({ avatar }: { avatar: Avatar }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState(false);
  const likeCount = typeof avatar.likes === 'number' ? avatar.likes : (avatar.likes as string[])?.length || 0;
  const commentCount = typeof avatar.comments === 'number' ? avatar.comments : (avatar.comments as any[])?.length || 0;

  return (
    <div
      style={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/avatar/${avatar.id}`)}
    >
      <div style={styles.cardImageWrapper}>
        <img
          src={avatar.thumbnailUrl}
          alt="avatar"
          style={styles.cardImage}
          loading="lazy"
        />
        {hovered && (
          <div style={styles.cardOverlay}>
            <div style={styles.overlayContent}>
              <span style={styles.overlayAuthor}>{avatar.author}</span>
              <span style={styles.overlayLikes}>❤ {likeCount}</span>
            </div>
          </div>
        )}
      </div>
      <div style={styles.cardInfo}>
        <span style={styles.cardAuthor}>{avatar.author}</span>
        <div style={styles.cardStats}>
          <span style={styles.cardStat}>❤ {likeCount}</span>
          <span style={styles.cardStat}>💬 {commentCount}</span>
        </div>
      </div>
    </div>
  );
}

function MasonryGrid({ avatars }: { avatars: Avatar[] }) {
  const [cols, setCols] = React.useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 768) setCols(2);
      else if (w < 1024) setCols(3);
      else setCols(4);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const columnArrays = React.useMemo(() => {
    const result: Avatar[][] = Array.from({ length: cols }, () => []);
    avatars.forEach((avatar, i) => {
      result[i % cols].push(avatar);
    });
    return result;
  }, [avatars, cols]);

  return (
    <div ref={containerRef} style={styles.masonryContainer}>
      {columnArrays.map((col, colIdx) => (
        <div key={colIdx} style={styles.masonryColumn}>
          {col.map((avatar) => (
            <GalleryCard key={avatar.id} avatar={avatar} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CommunityGallery() {
  const {
    galleryAvatars,
    galleryTotal,
    galleryPage,
    galleryLoading,
    setGalleryAvatars,
    appendGalleryAvatars,
    setGalleryTotal,
    setGalleryPage,
    setGalleryLoading,
  } = useAvatarStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadAvatars = useCallback(async (page: number) => {
    if (galleryLoading) return;
    setGalleryLoading(true);
    try {
      const data = await getAvatars(page, 12);
      if (page === 1) {
        setGalleryAvatars(data.avatars);
      } else {
        appendGalleryAvatars(data.avatars);
      }
      setGalleryTotal(data.total);
      setGalleryPage(page);
    } catch (e) {
      console.error('Failed to load avatars:', e);
    }
    setGalleryLoading(false);
  }, [galleryLoading]);

  useEffect(() => {
    if (galleryAvatars.length === 0) {
      loadAvatars(1);
    }
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !galleryLoading) {
          const nextPage = galleryPage + 1;
          if (galleryAvatars.length < galleryTotal) {
            loadAvatars(nextPage);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [galleryPage, galleryLoading, galleryAvatars.length, galleryTotal]);

  const hasMore = galleryAvatars.length < galleryTotal;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎨 社区画廊</h2>
        <p style={styles.subtitle}>浏览社区成员创作的虚拟形象</p>
      </div>
      {galleryAvatars.length === 0 && !galleryLoading && (
        <div style={styles.empty}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🎭</p>
          <p>还没有头像作品，成为第一个创作者吧！</p>
        </div>
      )}
      <MasonryGrid avatars={galleryAvatars} />
      {hasMore && (
        <div ref={loadMoreRef} style={styles.loadMore}>
          {galleryLoading ? <span>加载中...</span> : <span>↓ 加载更多</span>}
        </div>
      )}
      {!hasMore && galleryAvatars.length > 0 && (
        <div style={styles.endMark}>— 已加载全部 —</div>
      )}
      <footer style={styles.footer}>
        <p>Avatar Studio © 2024 · 虚拟形象定制社区</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    background: '#1a1a2e',
    padding: '24px 24px 0',
  },
  header: {
    textAlign: 'center',
    padding: '24px 0 32px',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e0e0e0',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  masonryContainer: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    maxWidth: 1200,
    margin: '0 auto',
  },
  masonryColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
    maxWidth: 300,
  },
  card: {
    background: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    width: '100%',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    },
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    minHeight: 160,
    maxHeight: 260,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f3460',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.6)',
    padding: '10px 12px',
    animation: 'fadeIn 0.3s ease',
  },
  overlayContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayAuthor: {
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
  },
  overlayLikes: {
    color: '#e94560',
    fontSize: 13,
  },
  cardInfo: {
    padding: '10px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAuthor: {
    fontSize: 13,
    color: '#e0e0e0',
    fontWeight: 500,
  },
  cardStats: {
    display: 'flex',
    gap: 10,
  },
  cardStat: {
    fontSize: 12,
    color: '#888',
  },
  loadMore: {
    textAlign: 'center',
    padding: '32px 0',
    color: '#888',
    fontSize: 14,
  },
  endMark: {
    textAlign: 'center',
    padding: '32px 0',
    color: '#555',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    padding: '80px 0',
    color: '#888',
  },
  footer: {
    textAlign: 'center',
    padding: '24px 0',
    color: '#555',
    fontSize: 12,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    marginTop: 24,
  },
};
