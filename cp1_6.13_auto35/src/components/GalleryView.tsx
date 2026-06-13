import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGalleryStore } from '../store';
import { ArtCard } from './ArtCard';

const ANIMATION_DURATION = 400;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0
  })
};

const slideTransition = {
  x: { type: 'tween', duration: ANIMATION_DURATION / 1000, ease: [0.4, 0, 0.2, 1] },
  opacity: { type: 'tween', duration: ANIMATION_DURATION / 1000, ease: 'easeInOut' }
};

export const GalleryView = () => {
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const artworks = useGalleryStore((s) => s.artworks);
  const isSortedByRating = useGalleryStore((s) => s.isSortedByRating);
  const next = useGalleryStore((s) => s.next);
  const prev = useGalleryStore((s) => s.prev);
  const goTo = useGalleryStore((s) => s.goTo);
  const setAnimating = useGalleryStore((s) => s.setAnimating);
  const toggleSortOrder = useGalleryStore((s) => s.toggleSortOrder);

  const directionRef = useRef(1);
  const switchLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tappedDotId, setTappedDotId] = useState<number | null>(null);

  const trySwitch = useCallback(
    (dir: number, action: () => void) => {
      if (switchLockRef.current) return;
      switchLockRef.current = true;
      directionRef.current = dir;
      setAnimating(true);
      action();

      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(() => {
        switchLockRef.current = false;
        setAnimating(false);
      }, ANIMATION_DURATION + 20);
    },
    [setAnimating]
  );

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      switchLockRef.current = false;
    };
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex >= artworks.length - 1) return;
    trySwitch(1, next);
  }, [currentIndex, artworks.length, trySwitch, next]);

  const handlePrev = useCallback(() => {
    if (currentIndex <= 0) return;
    trySwitch(-1, prev);
  }, [currentIndex, trySwitch, prev]);

  const handleDotClick = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      const dir = index > currentIndex ? 1 : -1;

      const artworkId = artworks[index]?.id;
      if (artworkId != null) {
        setTappedDotId(artworkId);
        setTimeout(() => {
          setTappedDotId((id) => (id === artworkId ? null : id));
        }, 400);
      }

      trySwitch(dir, () => goTo(index));
    },
    [currentIndex, artworks, trySwitch, goTo]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (!artworks.length) return null;
  const currentArtwork = artworks[currentIndex];
  if (!currentArtwork) return null;

  const atStart = currentIndex <= 0;
  const atEnd = currentIndex >= artworks.length - 1;

  return (
    <div style={styles.wrapper}>
      <div style={styles.galleryContainer}>
        <motion.button
          style={{
            ...styles.arrowButton,
            opacity: atStart ? 0.3 : 0.7,
            pointerEvents: atStart || switchLockRef.current ? 'none' : 'auto'
          }}
          whileHover={{ opacity: atStart ? 0.3 : 1, scale: atStart ? 1 : 1.1 }}
          whileTap={{ scale: atStart ? 1 : 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={handlePrev}
          aria-label="上一幅"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>

        <div style={styles.stage}>
          <AnimatePresence initial={false} custom={directionRef.current} mode="wait">
            <motion.div
              key={currentArtwork.id}
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
              style={styles.slideItem}
            >
              <ArtCard artwork={currentArtwork} />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.button
          style={{
            ...styles.arrowButton,
            opacity: atEnd ? 0.3 : 0.7,
            pointerEvents: atEnd || switchLockRef.current ? 'none' : 'auto'
          }}
          whileHover={{ opacity: atEnd ? 0.3 : 1, scale: atEnd ? 1 : 1.1 }}
          whileTap={{ scale: atEnd ? 1 : 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={handleNext}
          aria-label="下一幅"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
      </div>

      <div style={styles.dotsRow}>
        {artworks.map((aw, index) => (
          <Dot
            key={aw.id}
            isActive={index === currentIndex}
            justTapped={tappedDotId === aw.id}
            onClick={() => handleDotClick(index)}
          />
        ))}
      </div>

      <motion.button
        style={styles.sortButton}
        onClick={toggleSortOrder}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b4226" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <line x1="4" y1="18" x2="12" y2="18" />
        </svg>
        <span style={styles.sortText}>
          {isSortedByRating ? '恢复原序' : '按评分排序'}
        </span>
      </motion.button>
    </div>
  );
};

interface DotProps {
  isActive: boolean;
  justTapped: boolean;
  onClick: () => void;
}

const Dot = ({ isActive, justTapped, onClick }: DotProps) => {
  return (
    <motion.button
      style={styles.dotBase}
      onClick={onClick}
      animate={
        justTapped
          ? { scale: [1, 1.6, 0.85, 1.08, 1] }
          : isActive
          ? { scale: 1, backgroundColor: '#d4a373' }
          : { scale: 0.85, backgroundColor: 'transparent' }
      }
      transition={
        justTapped
          ? { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
          : { type: 'spring', stiffness: 400, damping: 20 }
      }
    >
      <motion.div
        animate={{
          opacity: isActive ? 0 : 1
        }}
        transition={{ duration: 0.2 }}
        style={styles.dotInnerBorder}
      />
    </motion.button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0 40px',
    width: '100%'
  },
  galleryContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '1200px',
    padding: '0 20px',
    boxSizing: 'border-box'
  },
  arrowButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(4px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    transition: 'opacity 0.2s',
    zIndex: 2
  },
  stage: {
    flex: 1,
    maxWidth: '600px',
    minHeight: '720px',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '16px'
  },
  slideItem: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '24px',
    padding: '0 20px'
  },
  dotBase: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dotInnerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid rgba(107,66,38,0.35)',
    position: 'absolute',
    boxSizing: 'border-box'
  },
  sortButton: {
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(107,66,38,0.3)',
    background: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  sortText: {
    fontSize: '13px',
    color: '#6b4226'
  }
};
