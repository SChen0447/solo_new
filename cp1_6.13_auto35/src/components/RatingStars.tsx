import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RatingStarsProps {
  value: number;
  onChange: (rating: number) => void;
}

interface SingleStarGlow {
  x: number;
  y: number;
}

const StarButton = ({
  index,
  isFilled,
  onClick
}: {
  index: number;
  isFilled: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const [glow, setGlow] = useState<SingleStarGlow | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setTimeout(() => setGlow(null), 210);
    onClick(e);
  };

  return (
    <motion.button
      type="button"
      style={styles.starButton}
      onClick={handleClick}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
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
        {glow && (
          <motion.span
            style={{
              ...styles.glow,
              left: glow.x,
              top: glow.y
            }}
            initial={{ scale: 0, opacity: 0.95 }}
            animate={{ scale: 4.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export const RatingStars = ({ value, onChange }: RatingStarsProps) => {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue > 0 ? hoverValue : value;

  return (
    <div style={styles.container}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isFilled = index < displayValue;
        return (
          <div
            key={index}
            onMouseEnter={() => setHoverValue(index + 1)}
            onMouseLeave={() => setHoverValue(0)}
          >
            <StarButton
              index={index}
              isFilled={isFilled}
              onClick={() => onChange(index + 1)}
            />
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
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
    width: 28,
    height: 28
  },
  glow: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(212,163,115,0.95) 0%, rgba(212,163,115,0.5) 35%, rgba(212,163,115,0) 70%)',
    pointerEvents: 'none',
    zIndex: 1,
    transform: 'translate(-50%, -50%)'
  }
};
