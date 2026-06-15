import type { Weights } from '../utils/scoringEngine';
import { DIMENSION_LABELS, DEFAULT_WEIGHTS } from '../utils/scoringEngine';

interface ScoringPanelProps {
  weights: Weights;
  onWeightChange: (dimension: keyof Weights, value: number) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ScoringPanel({
  weights,
  onWeightChange,
  onReset,
  isOpen,
  onToggle,
}: ScoringPanelProps) {
  const dimensions = Object.keys(weights) as (keyof Weights)[];
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const handleSliderChange = (dimension: keyof Weights, value: number) => {
    onWeightChange(dimension, value);
  };

  return (
    <>
      <button
        type="button"
        className={`settings-toggle ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        aria-label="设置面板"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <div className={`scoring-panel ${isOpen ? 'open' : 'closed'}`}>
        <div className="panel-header">
          <h2 className="panel-title">权重设置</h2>
          <button
            type="button"
            className="close-button"
            onClick={onToggle}
            aria-label="关闭面板"
          >
            ×
          </button>
        </div>

        <div className="weights-container">
          <div className={`total-weight ${Math.abs(totalWeight - 1) > 0.01 ? 'warning' : ''}`}>
            权重总和：{(totalWeight * 100).toFixed(0)}%
          </div>

          {dimensions.map((dimension) => (
            <div key={dimension} className="weight-item">
              <div className="weight-header">
                <span className="weight-label">{DIMENSION_LABELS[dimension]}</span>
                <span className="weight-value">{(weights[dimension] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(weights[dimension] * 100)}
                onChange={(e) => handleSliderChange(dimension, parseInt(e.target.value) / 100)}
                className="weight-slider"
              />
            </div>
          ))}
        </div>

        <button type="button" className="reset-button" onClick={onReset}>
          重置为默认值
        </button>

        <div className="default-info">
          <p>默认权重：</p>
          <ul>
            <li>创新性: {(DEFAULT_WEIGHTS.innovation * 100).toFixed(0)}%</li>
            <li>可行性: {(DEFAULT_WEIGHTS.feasibility * 100).toFixed(0)}%</li>
            <li>影响力: {(DEFAULT_WEIGHTS.impact * 100).toFixed(0)}%</li>
            <li>成本: {(DEFAULT_WEIGHTS.cost * 100).toFixed(0)}%</li>
            <li>风险: {(DEFAULT_WEIGHTS.risk * 100).toFixed(0)}%</li>
          </ul>
        </div>
      </div>
    </>
  );
}
