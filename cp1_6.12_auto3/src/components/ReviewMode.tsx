import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FlashCard from './FlashCard';
import type { Card, ReviewRecord, ReviewSession } from '../types';

interface ReviewModeProps {
  cards: Card[];
  onComplete: (session: ReviewSession, records: ReviewRecord[]) => void;
  tagColors: Record<string, string>;
}

const ReviewMode: React.FC<ReviewModeProps> = ({ cards, onComplete, tagColors }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [startTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  const shuffledCards = useMemo(() => {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [cards]);

  const currentCard = shuffledCards[currentIndex];
  const total = shuffledCards.length;
  const progress = total > 0 ? ((currentIndex) / total) * 100 : 0;

  const handleReview = useCallback(
    (cardId: string, correct: boolean) => {
      const record: ReviewRecord = { cardId, correct, timestamp: Date.now() };
      setRecords((prev) => [...prev, record]);

      if (currentIndex + 1 >= total) {
        const session: ReviewSession = {
          id: uuidv4(),
          records: [...records, record],
          startTime,
          endTime: Date.now(),
        };
        onComplete(session, [...records, record]);
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentIndex, total, records, startTime, onComplete]
  );

  if (cards.length === 0) {
    return (
      <div className="review-empty">
        <p>暂无卡片可以复习</p>
        <p className="review-empty-sub">请先创建一些知识卡片</p>
      </div>
    );
  }

  if (finished) {
    const correctCount = records.filter((r) => r.correct).length;
    return (
      <div className="review-complete">
        <h2>复习完成！</h2>
        <div className="review-result">
          <div className="review-result-item">
            <span className="review-result-number">{records.length}</span>
            <span className="review-result-label">总题数</span>
          </div>
          <div className="review-result-item">
            <span className="review-result-number correct">{correctCount}</span>
            <span className="review-result-label">正确</span>
          </div>
          <div className="review-result-item">
            <span className="review-result-number wrong">{records.length - correctCount}</span>
            <span className="review-result-label">错误</span>
          </div>
          <div className="review-result-item">
            <span className="review-result-number">
              {records.length > 0 ? Math.round((correctCount / records.length) * 100) : 0}%
            </span>
            <span className="review-result-label">正确率</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-mode">
      <div className="review-header">
        <h2>复习模式</h2>
        <span className="review-counter">
          {currentIndex + 1} / {total}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <FlashCard
        key={currentCard.id}
        card={currentCard}
        onReview={handleReview}
        showActions={true}
        tagColors={tagColors}
      />
    </div>
  );
};

export default ReviewMode;
