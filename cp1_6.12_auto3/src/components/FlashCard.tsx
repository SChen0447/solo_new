import React, { useState, useCallback } from 'react';
import type { Card } from '../types';

interface FlashCardProps {
  card: Card;
  onReview?: (cardId: string, correct: boolean) => void;
  showActions?: boolean;
  tagColors: Record<string, string>;
}

const FlipBackDelay = 600;

const FlashCard: React.FC<FlashCardProps> = ({ card, onReview, showActions = false, tagColors }) => {
  const [flipped, setFlipped] = useState(false);
  const [answering, setAnswering] = useState(false);

  const handleFlip = useCallback(() => {
    if (answering) return;
    setFlipped((f) => !f);
  }, [answering]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (answering) return;
      setAnswering(true);
      setFlipped(false);
      window.setTimeout(() => {
        onReview?.(card.id, correct);
        setAnswering(false);
      }, FlipBackDelay);
    },
    [answering, card.id, onReview]
  );

  return (
    <div className="flashcard-container">
      <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-face flashcard-front">
          <div className="flashcard-tags">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="flashcard-tag"
                style={{ backgroundColor: tagColors[tag] || '#95A5A6' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="flashcard-text">{card.front}</p>
          <span className="flashcard-hint">点击翻转查看答案</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className="flashcard-tags">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="flashcard-tag"
                style={{ backgroundColor: tagColors[tag] || '#95A5A6' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="flashcard-text">{card.back}</p>
          <span className="flashcard-hint">点击翻回正面</span>
        </div>
      </div>
      {showActions && flipped && !answering && (
        <div className="flashcard-actions">
          <button
            className="btn btn-wrong"
            onClick={(e) => {
              e.stopPropagation();
              handleAnswer(false);
            }}
          >
            不记得
          </button>
          <button
            className="btn btn-correct"
            onClick={(e) => {
              e.stopPropagation();
              handleAnswer(true);
            }}
          >
            记住了
          </button>
        </div>
      )}
    </div>
  );
};

export default FlashCard;
