import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GalleryItem } from '../types';
import { useGalleryStore } from '../store';
import { RatingStars } from './RatingStars';

interface ArtCardProps {
  artwork: GalleryItem;
}

export const ArtCard = ({ artwork }: ArtCardProps) => {
  const scores = useGalleryStore((state) => state.scores);
  const notes = useGalleryStore((state) => state.notes);
  const setScore = useGalleryStore((state) => state.setScore);
  const setNote = useGalleryStore((state) => state.setNote);

  const score = scores[artwork.id] || 0;
  const note = notes[artwork.id] || '';

  const [localNote, setLocalNote] = useState(note);
  const [isFocused, setIsFocused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalNote(note);
  }, [note, artwork.id]);

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, 500);
      setLocalNote(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setNote(artwork.id, value);
      }, 300);
    },
    [artwork.id, setNote]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      style={styles.card}
      whileHover={{ translateY: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div style={styles.imageWrapper}>
        {!imageLoaded && (
          <motion.div
            style={styles.skeleton}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          style={{
            ...styles.image,
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease-in-out'
          }}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      </div>

      <div style={styles.content}>
        <h2 style={styles.title}>{artwork.title}</h2>
        <p style={styles.artist}>— {artwork.artist}</p>
        <p style={styles.description}>{artwork.description}</p>

        <div style={styles.ratingSection}>
          <RatingStars value={score} onChange={(s) => setScore(artwork.id, s)} />
          {score > 0 && <span style={styles.scoreText}>{score} / 5</span>}
        </div>

        <div style={styles.noteSection}>
          <motion.div style={{ position: 'relative' }}>
            <textarea
              value={localNote}
              onChange={handleNoteChange}
              placeholder={isFocused ? '' : '写下你的感受...'}
              maxLength={500}
              rows={3}
              style={{
                ...styles.noteInput,
                borderColor: isFocused ? '#d4a373' : '#ddd',
                opacity: isFocused || localNote ? 1 : 0.7
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <motion.div
              style={styles.underline}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isFocused ? 1 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            />
          </motion.div>
          <span style={styles.charCount}>{localNote.length}/500</span>
        </div>
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    width: '100%'
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '133.33%',
    background: '#f5f5f5'
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%'
  },
  content: {
    padding: '24px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 600,
    color: '#6b4226'
  },
  artist: {
    margin: '4px 0 12px',
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic'
  },
  description: {
    margin: 0,
    fontSize: '15px',
    color: '#333',
    lineHeight: 1.6
  },
  ratingSection: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  scoreText: {
    marginTop: '4px',
    fontSize: '13px',
    color: '#d4a373',
    fontWeight: 500
  },
  noteSection: {
    marginTop: '20px',
    position: 'relative'
  },
  noteInput: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
    color: '#333',
    background: 'transparent',
    outline: 'none',
    transition: 'border-color 0.2s, opacity 0.2s',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1
  },
  underline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    background: 'linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(212,163,115,0.15) 85%, #d4a373 100%)',
    transformOrigin: 'top',
    borderRadius: '8px',
    pointerEvents: 'none',
    zIndex: 0
  },
  charCount: {
    position: 'absolute',
    right: 0,
    bottom: '-20px',
    fontSize: '12px',
    color: '#999'
  }
};
