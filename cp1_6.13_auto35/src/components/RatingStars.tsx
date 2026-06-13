import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RatingStarsProps {
  value: number;
  onChange: (rating: number) => void;
}

interface GlowInfo {
  id: number;
  starIndex: number;
  x: number;
  y: number;
}

export const RatingStars = ({ value, onChange }: RatingStarsProps) => {
  const [hoverValue, setHoverValue] = useState(0);
  const [glows, setGlows] = useState<GlowInfo[]>([]);
  const glowIdRef = useRef(0);

  const handleClick = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = glowIdRef.current++;

    setGlows((prev) => [...prev, { id, starIndex: index, x, y }]);
    onChange(index + 1);

    setTimeout(() => {
      setGlows((prev) => prev.filter((g) => g.id !== id));
    }, 220);
  };

  const displayValue = hoverValue > 0 ? hoverValue : value;

  return (
    <div style={styles.container}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isFilled = index < displayValue;
        const starGlows = glows.filter((g) => g.starIndex === index);

        return (
          <motion.button
            key={index}
            type="button"
            style={styles.starButton}
            onMouseEnter={() => setHoverValue(index + 1)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={(e) => handleClick(index, e)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill={isFilled ? '#d4a373' : 'none'}
              stroke={isFilled ? '#d4a373' : '#ccc'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'relative', zIndex: 2 }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <AnimatePresence>
              {starGlows.map((g) => (
                <motion.span
                  key={g.id}
                  style={{
                    ...styles.glow,
                    left: g.x,
                    top: g.y
                  }}
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 0'
  },
  starButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    width: '28px',
    height: '28px'
  },
  glow: {
    position: 'absolute',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(212,163,115,0.95) 0%, rgba(212,163,115,0.5) 35%, rgba(212,163,115,0) 70%)',
    pointerEvents: 'none',
    zIndex: 1,
    transform: 'translate(-50%, -50%)'
  }
};
