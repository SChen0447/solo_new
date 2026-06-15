import React from 'react';
import { getScoreColor, getScoreLabel } from '../fonts';
import './ScoreBar.css';

interface ScoreBarProps {
  score: number;
  advice: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ score, advice }) => {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="score-bar">
      <div className="score-bar__header">
        <span className="score-bar__label">协调性评分</span>
        <span className="score-bar__value" style={{ color }}>
          {score} 分 · {label}
        </span>
      </div>
      <div className="score-bar__track">
        <div
          className="score-bar__fill"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
        <div className="score-bar__gradient" />
      </div>
      <p className="score-bar__advice">{advice}</p>
    </div>
  );
};

export default ScoreBar;
