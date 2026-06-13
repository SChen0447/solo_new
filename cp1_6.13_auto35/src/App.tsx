import { useEffect } from 'react';
import { useGalleryStore } from './store';
import { GalleryView } from './components/GalleryView';

const SHIMMER = 'shimmer-block';

const SkeletonScreen = () => (
  <div style={skeletonStyles.wrapper}>
    <div style={skeletonStyles.header}>
      <div
        className={SHIMMER}
        style={{
          height: 28,
          width: 200,
          borderRadius: 8
        }}
      />
    </div>

    <div style={skeletonStyles.galleryRow}>
      <div
        className={SHIMMER}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          flexShrink: 0
        }}
      />

      <div style={skeletonStyles.cardColumn}>
        <div
          className={SHIMMER}
          style={{
            width: '100%',
            paddingTop: '133.33%',
            borderRadius: '16px 16px 0 0'
          }}
        />

        <div style={skeletonStyles.textBlock}>
          <div className={SHIMMER} style={{ height: 14, width: '60%', borderRadius: 4 }} />
          <div className={SHIMMER} style={{ height: 12, width: '40%', borderRadius: 4 }} />
          <div className={SHIMMER} style={{ height: 14, width: '80%', borderRadius: 4 }} />
          <div className={SHIMMER} style={{ height: 14, width: '70%', borderRadius: 4 }} />
        </div>

        <div style={skeletonStyles.starsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={SHIMMER}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%'
              }}
            />
          ))}
        </div>

        <div
          className={SHIMMER}
          style={{
            height: 80,
            borderRadius: 8,
            margin: '0 24px 24px'
          }}
        />
      </div>

      <div
        className={SHIMMER}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          flexShrink: 0
        }}
      />
    </div>

    <div style={skeletonStyles.dotsRow}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div
          key={i}
          className={SHIMMER}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%'
          }}
        />
      ))}
    </div>
  </div>
);

const skeletonStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0 40px',
    width: '100%'
  },
  header: {
    width: '100%',
    maxWidth: 600,
    padding: '0 20px',
    marginBottom: 24,
    boxSizing: 'border-box'
  },
  galleryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 1200,
    padding: '0 20px',
    boxSizing: 'border-box'
  },
  cardColumn: {
    flex: 1,
    maxWidth: 600,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  textBlock: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  starsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    padding: '12px 0'
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24
  }
};

export const App = () => {
  const isInitialized = useGalleryStore((s) => s.isInitialized);
  const initialize = useGalleryStore((s) => s.initialize);
  const resetCurrent = useGalleryStore((s) => s.resetCurrent);
  const artworks = useGalleryStore((s) => s.artworks);
  const currentIndex = useGalleryStore((s) => s.currentIndex);

  useEffect(() => {
    const timer = setTimeout(() => {
      initialize();
    }, 700);
    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }

      switch (e.key) {
        case 'r':
        case 'R': {
          e.preventDefault();
          if (artworks.length > 0 && currentIndex >= 0 && currentIndex < artworks.length) {
            resetCurrent();
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetCurrent, artworks.length, currentIndex]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>画廊漫步</h1>
        <p style={styles.subtitle}>
          ← → 切换作品 · R 重置 · 沉浸式浏览数字艺术
        </p>
      </header>
      {!isInitialized ? <SkeletonScreen /> : <GalleryView />}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f9f4e8',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
  },
  header: {
    textAlign: 'center',
    padding: '32px 20px 8px'
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: '#6b4226',
    letterSpacing: '4px'
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#999',
    letterSpacing: '1px'
  }
};
