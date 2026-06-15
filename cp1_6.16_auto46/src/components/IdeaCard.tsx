import { useState, useRef, useEffect } from 'react';
import type { Scores } from '../utils/scoringEngine';
import { DIMENSION_LABELS } from '../utils/scoringEngine';

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  scores: Scores;
  averageScore: number;
  rank: number;
  onScoreChange: (ideaId: string, dimension: keyof Scores, score: number) => void;
}

export default function IdeaCard({
  id,
  title,
  description,
  scores,
  averageScore,
  rank,
  onScoreChange,
}: IdeaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredDimension, setHoveredDimension] = useState<keyof Scores | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const descRef = useRef<HTMLDivElement>(null);
  const [descHeight, setDescHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    if (descRef.current) {
      if (isExpanded) {
        setDescHeight(descRef.current.scrollHeight);
      } else {
        setDescHeight(48);
      }
    }
  }, [isExpanded, description]);

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const handleScoreChange = (dimension: keyof Scores, score: number) => {
    if (scores[dimension] !== score) {
      setIsAnimating(true);
    }
    onScoreChange(id, dimension, score);
  };

  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return 'transparent';
    }
  };

  const renderStars = (dimension: keyof Scores) => {
    const currentScore = scores[dimension];
    const displayScore = hoveredDimension === dimension ? hoveredStar : currentScore;

    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${star <= displayScore ? 'active' : ''}`}
            onMouseEnter={() => {
              setHoveredDimension(dimension);
              setHoveredStar(star);
            }}
            onMouseLeave={() => {
              setHoveredDimension(null);
              setHoveredStar(0);
            }}
            onClick={() => handleScoreChange(dimension, star)}
            aria-label={`${DIMENSION_LABELS[dimension]} ${star}星`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="star-icon">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  const dimensions = Object.keys(scores) as (keyof Scores)[];

  return (
    <div className={`idea-card ${isAnimating ? 'score-animation' : ''}`}>
      {rank <= 3 && (
        <div 
          className="trophy-icon"
          style={{ color: getTrophyColor(rank) }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="trophy-svg">
            <path d="M12 15c-2.76 0-5-2.24-5-5V3h10v7c0 2.76-2.24 5-5 5zm-3-9v4c0 1.66 1.34 3 3 3s3-1.34 3-3V6H9zm9-2h-1V2H7v2H6C4.9 4 4 4.9 4 6v1c0 2.55 1.92 4.63 4.39 4.94C9.15 13.88 10.46 15 12 15s2.85-1.12 3.61-3.06C18.08 11.63 20 9.55 20 7V6c0-1.1-.9-2-2-2zm0 3c0 1.86-1.28 3.41-3 3.86V6h3v1zM7 9.86C5.28 9.41 4 7.86 4 6V6h3v3.86zM11 18h2v3h-2zm-4 2h10v2H7z" />
          </svg>
          <span className="rank-number">第{rank}名</span>
        </div>
      )}

      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div className="average-score">
          <span className="score-value">{averageScore.toFixed(1)}</span>
          <span className="score-label">平均</span>
        </div>
      </div>

      <div
        className={`description-container ${isExpanded ? 'expanded' : ''}`}
        style={{ height: typeof descHeight === 'number' ? `${descHeight}px` : 'auto' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div ref={descRef} className="description-text">
          {description || '暂无描述'}
        </div>
        {description.length > 40 && (
          <span className="expand-toggle">
            {isExpanded ? '收起' : '展开全文'}
          </span>
        )}
      </div>

      <div className="scoring-dimensions">
        {dimensions.map((dimension) => (
          <div key={dimension} className="dimension-item">
            <span className="dimension-label">{DIMENSION_LABELS[dimension]}</span>
            {renderStars(dimension)}
          </div>
        ))}
      </div>
    </div>
  );
}
