import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGalleryStore } from './store';
import { GalleryView } from './components/GalleryView';

const SkeletonScreen = () => (
  <div style={skeletonStyles.wrapper}>
    <div style={skeletonStyles.header}>
      <motion.div
        style={skeletonStyles.headerBar}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
    <div style={skeletonStyles.galleryRow}>
      <motion.div
        style={skeletonStyles.arrowCircle}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <div style={skeletonStyles.cardColumn}>
        <motion.div
          style={skeletonStyles.imageRect}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <div style={skeletonStyles.textBlock}>
          <motion.div
            style={{ ...skeletonStyles.textLine, width: '60%' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
          <motion.div
            style={{ ...skeletonStyles.textLine, width: '40%' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            style={{ ...skeletonStyles.textLine, width: '80%' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
          <motion.div
            style={{ ...skeletonStyles.textLine, width: '70%' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
          />
        </div>
        <div style={skeletonStyles.starsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              style={skeletonStyles.starPlaceholder}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 + i * 0.1 }}
            />
          ))}
        </div>
        <motion.div
          style={skeletonStyles.noteRect}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }}
        />
      </div>
      <motion.div
        style={skeletonStyles.arrowCircle}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
    <div style={skeletonStyles.dotsRow}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <motion.div
          key={i}
          style={skeletonStyles.dotPlaceholder}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.4 + i * 0.05 }}
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
    maxWidth: '600px',
    padding: '0 20px',
    marginBottom: '24px'
  },
  headerBar: {
    height: '28px',
    borderRadius: '8px',
    background: '#e8e0d0',
    width: '200px'
  },
  galleryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '1200px',
    padding: '0 20px'
  },
  arrowCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#e8e0d0',
    flexShrink: 0
  },
  cardColumn: {
    flex: 1,
    maxWidth: '600px'
  },
  imageRect: {
    width: '100%',
    paddingTop: '133.33%',
    background: '#e8e0d0',
    borderRadius: '16px 16px 0 0'
  },
  textBlock: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  textLine: {
    height: '14px',
    borderRadius: '4px',
    background: '#e8e0d0'
  },
  starsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px 0'
  },
  starPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#e8e0d0'
  },
  noteRect: {
    height: '80px',
    borderRadius: '8px',
    background: '#e8e0d0',
    margin: '0 24px 24px'
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '24px'
  },
  dotPlaceholder: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#e8e0d0'
  }
};

export const App = () => {
  const isInitialized = useGalleryStore((s) => s.isInitialized);
  const initialize = useGalleryStore((s) => s.initialize);
  const next = useGalleryStore((s) => s.next);
  const prev = useGalleryStore((s) => s.prev);
  const resetCurrent = useGalleryStore((s) => s.resetCurrent);
  const isAnimating = useGalleryStore((s) => s.isAnimating);
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const artworks = useGalleryStore((s) => s.artworks);

  useEffect(() => {
    const timer = setTimeout(() => {
      initialize();
    }, 600);
    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (!isAnimating && currentIndex < artworks.length - 1) {
            next();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!isAnimating && currentIndex > 0) {
            prev();
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          resetCurrent();
          break;
        case 'Escape':
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, resetCurrent, isAnimating, currentIndex, artworks.length]);

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
    fontSize: '32px',
    fontWeight: 700,
    color: '#6b4226',
    letterSpacing: '4px'
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: '13px',
    color: '#999',
    letterSpacing: '1px'
  }
};
