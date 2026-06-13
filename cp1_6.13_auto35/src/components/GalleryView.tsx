import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGalleryStore } from '../store';
import { ArtCard } from './ArtCard';

const ANIMATION_DURATION = 400;
const DEBOUNCE_MS = ANIMATION_DURATION + 50;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    backgroundColor: 'rgba(249,244,232,0.3)'
  }),
  center: {
    x: 0,
    opacity: 1,
    backgroundColor: 'rgba(249,244,232,0)'
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    backgroundColor: 'rgba(249,244,232,0.3)'
  })
};

const slideTransition = {
  x: { type: 'tween', duration: ANIMATION_DURATION / 1000, ease: [0.4, 0, 0.2, 1] },
  opacity: { type: 'tween', duration: ANIMATION_DURATION / 1000, ease: 'easeInOut' },
  backgroundColor: { type: 'tween', duration: ANIMATION_DURATION / 1000, ease: 'easeInOut' }
};

export const GalleryView = () => {
  const currentIndex = useGalleryStore((s) => s.currentIndex);
  const artworks = useGalleryStore((s) => s.artworks);
  const isAnimating = useGalleryStore((s) => s.isAnimating);
  const isSortedByRating = useGalleryStore((s) => s.isSortedByRating);
  const next = useGalleryStore((s) => s.next);
  const prev = useGalleryStore((s) => s.prev);
  const goTo = useGalleryStore((s) => s.goTo);
  const setAnimating = useGalleryStore((s) => s.setAnimating);
  const toggleSortOrder = useGalleryStore((s) => s.toggleSortOrder);

  const directionRef = useRef(1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [[, directionKey], setPage] = useRef<[number, number]>([0, 1]).current
    ? [useGalleryStore.getState().currentIndex, 1] as [number, number]
    : [0, 1] as [number, number];

  const triggerSwitch = useCallback(
    (action: () => void, dir: number) => {
      if (isAnimating) return;
      directionRef.current = dir;
      setAnimating(true);
      action();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setAnimating(false);
      }, DEBOUNCE_MS);
    },
    [isAnimating, setAnimating]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < artworks.length - 1) {
      triggerSwitch(next, 1);
    }
  }, [currentIndex, artworks.length, next, triggerSwitch]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      triggerSwitch(prev, -1);
    }
  }, [currentIndex, prev, triggerSwitch]);

  const handleDotClick = useCallback(
    (index: number) => {
      if (index === currentIndex || isAnimating) return;
      const dir = index > currentIndex ? 1 : -1;
      triggerSwitch(() => goTo(index), dir);
    },
    [currentIndex, isAnimating, goTo, triggerSwitch]
  );

  const currentArtwork = artworks[currentIndex];

  return (
    <div style={styles.wrapper}>
      <div style={styles.galleryContainer}>
        <motion.button
          style={{
            ...styles.arrowButton,
            opacity: currentIndex <= 0 ? 0.3 : 1,
            pointerEvents: currentIndex <= 0 || isAnimating ? 'none' : 'auto'
          }}
          whileHover={{ opacity: 1, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={handlePrev}
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
              onAnimationStart={() => setAnimating(true)}
              onAnimationComplete={() => {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                debounceTimerRef.current = setTimeout(() => {
                  setAnimating(false);
                }, 50);
              }}
            >
              <ArtCard artwork={currentArtwork} />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.button
          style={{
            ...styles.arrowButton,
            opacity: currentIndex >= artworks.length - 1 ? 0.3 : 1,
            pointerEvents: currentIndex >= artworks.length - 1 || isAnimating ? 'none' : 'auto'
          }}
          whileHover={{ opacity: 1, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={handleNext}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b4226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
      </div>

      <div style={styles.dotsRow}>
        {artworks.map((_, index) => (
          <Dot
            key={artworks[index].id}
            isActive={index === currentIndex}
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
  onClick: () => void;
}

const Dot = ({ isActive, onClick }: DotProps) => {
  return (
    <motion.button
      style={styles.dot}
      onClick={onClick}
      animate={{
        scale: isActive ? 1 : 1,
        backgroundColor: isActive ? '#d4a373' : 'transparent'
      }}
      whileTap={{
        scale: [1, 1.5, 0.9, 1.1, 1],
        transition: { duration: 0.4, ease: 'easeInOut' }
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <motion.div
        animate={{
          scale: isActive ? 1 : 0.6
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: isActive ? 'none' : '2px solid rgba(107,66,38,0.3)',
          boxSizing: 'border-box'
        }}
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
    padding: '0 20px'
  },
  arrowButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(4px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'background 0.2s'
  },
  stage: {
    flex: 1,
    maxWidth: '600px',
    minHeight: '700px',
    position: 'relative',
    overflow: 'hidden'
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
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    overflow: 'visible'
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
