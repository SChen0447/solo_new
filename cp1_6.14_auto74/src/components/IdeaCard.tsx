import { useRef, useState, useEffect, useCallback } from 'react';
import {
  useIdeaStore,
  IdeaCard as IdeaCardType,
  getEmotionById,
} from '../store/useIdeaStore';
import styles from './IdeaCard.module.css';

interface IdeaCardProps {
  card: IdeaCardType;
  scale: number;
}

export function IdeaCard({ card, scale }: IdeaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    cardStartX: 0,
    cardStartY: 0,
    rafId: null as number | null,
    lastX: 0,
    lastY: 0,
  });

  const updateCardPosition = useIdeaStore((s) => s.updateCardPosition);
  const removeCard = useIdeaStore((s) => s.removeCard);
  const filterEmotion = useIdeaStore((s) => s.filterEmotion);
  const highlightedCards = useIdeaStore((s) => s.highlightedCards);

  const emotion = getEmotionById(card.emotion);
  const isFilteredOut = filterEmotion !== null && filterEmotion !== card.emotion;
  const isHighlighted = highlightedCards.has(card.id);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isFilteredOut) return;
      e.preventDefault();
      e.stopPropagation();

      const target = cardRef.current;
      if (!target) return;

      setIsDragging(true);

      dragState.current.startX = e.clientX;
      dragState.current.startY = e.clientY;
      dragState.current.cardStartX = card.x;
      dragState.current.cardStartY = card.y;
      dragState.current.lastX = card.x;
      dragState.current.lastY = card.y;

      target.setPointerCapture(e.pointerId);
    },
    [card.x, card.y, isFilteredOut]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaX = (e.clientX - dragState.current.startX) / scale;
      const deltaY = (e.clientY - dragState.current.startY) / scale;

      const newX = dragState.current.cardStartX + deltaX;
      const newY = dragState.current.cardStartY + deltaY;

      if (dragState.current.rafId !== null) {
        cancelAnimationFrame(dragState.current.rafId);
      }

      dragState.current.rafId = requestAnimationFrame(() => {
        dragState.current.lastX = newX;
        dragState.current.lastY = newY;
        if (cardRef.current) {
          cardRef.current.style.transform = `translate(${newX}px, ${newY}px) rotate(${card.rotation}deg)`;
        }
      });
    },
    [isDragging, scale, card.rotation]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      if (dragState.current.rafId !== null) {
        cancelAnimationFrame(dragState.current.rafId);
        dragState.current.rafId = null;
      }

      setIsDragging(false);

      const target = cardRef.current;
      if (target) {
        target.releasePointerCapture(e.pointerId);
      }

      updateCardPosition(card.id, dragState.current.lastX, dragState.current.lastY);
    },
    [isDragging, card.id, updateCardPosition]
  );

  useEffect(() => {
    return () => {
      if (dragState.current.rafId !== null) {
        cancelAnimationFrame(dragState.current.rafId);
      }
    };
  }, []);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeCard(card.id);
  };

  return (
    <div
      ref={cardRef}
      className={[
        styles.card,
        isDragging ? styles.dragging : '',
        isHighlighted ? styles.highlighted : '',
        isFilteredOut ? styles.filteredOut : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        transform: `translate(${card.x}px, ${card.y}px) rotate(${card.rotation}deg)`,
        borderColor: emotion?.borderColor || 'rgba(0,0,0,0.05)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.cardInner}>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          title="删除卡片"
        >
          ×
        </button>

        <div className={styles.emotionDotWrapper}>
          {isHovered && emotion && (
            <span className={styles.emotionTooltip}>{emotion.name}</span>
          )}
          <div
            className={styles.emotionDot}
            style={{ backgroundColor: emotion?.color || '#ccc' }}
          />
        </div>

        <h3 className={styles.title}>{card.title}</h3>
        <p className={styles.content}>{card.content}</p>
      </div>

      <div
        className={styles.emotionBar}
        style={{ backgroundColor: emotion?.color || '#ccc' }}
      />
    </div>
  );
}
