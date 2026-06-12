import { useState } from 'react';
import {
  Alternative,
  Criterion,
  calculateWeightedScore,
  calculateTotalWeight,
} from './utils/generateMatrixData';

interface MatrixPanelProps {
  alternatives: Alternative[];
  criteria: Criterion[];
  onScoreChange: (altId: string, criterionId: string, value: number) => void;
  onWeightChange: (criterionId: string, weight: number) => void;
  rankedAlternatives: (Alternative & { weightedScore: number })[];
}

export default function MatrixPanel({
  alternatives,
  criteria,
  onScoreChange,
  onWeightChange,
  rankedAlternatives,
}: MatrixPanelProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const totalWeight = calculateTotalWeight(criteria);

  return (
    <div className="matrix-panel">
      <div className="card matrix-card">
        <h2 className="card-title">评分矩阵</h2>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="corner-cell">方案 \ 标准</th>
                {criteria.map((c) => (
                  <th key={c.id} className="criterion-header">
                    <div className="criterion-name">{c.name}</div>
                    <div className="weight-control">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={c.weight}
                        onChange={(e) =>
                          onWeightChange(c.id, Number(e.target.value))
                        }
                        className="weight-slider"
                      />
                      <span className="weight-value">{c.weight}</span>
                    </div>
                    <div
                      className="weight-bar-outer"
                      title={`权重: ${c.weight}`}
                    >
                      <div
                        className="weight-bar-inner"
                        style={{
                          width: `${(c.weight / 5) * 100}%`,
                          background:
                            'linear-gradient(90deg, #BFDBFE 0%, #3B82F6 100%)',
                        }}
                      />
                    </div>
                  </th>
                ))}
                <th className="score-header">加权得分</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt) => {
                const weighted = calculateWeightedScore(alt, criteria);
                const normalized = totalWeight > 0 ? (weighted / (totalWeight * 10)) * 100 : 0;
                return (
                  <tr key={alt.id} className="matrix-row">
                    <td className="alt-cell">
                      <span
                        className="alt-dot"
                        style={{ backgroundColor: alt.color }}
                      />
                      <span className="alt-name">{alt.name}</span>
                    </td>
                    {criteria.map((c) => {
                      const cellKey = `${alt.id}-${c.id}`;
                      const isFocused = focusedCell === cellKey;
                      return (
                        <td key={c.id} className="score-cell">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            value={alt.scores[c.id] ?? 0}
                            onChange={(e) => {
                              let v = Number(e.target.value);
                              if (isNaN(v)) v = 0;
                              v = Math.max(0, Math.min(10, Math.round(v)));
                              onScoreChange(alt.id, c.id, v);
                            }}
                            onFocus={() => setFocusedCell(cellKey)}
                            onBlur={() => setFocusedCell(null)}
                            className={`score-input ${
                              isFocused ? 'score-input-focus' : ''
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="weighted-score-cell">
                      <div className="weighted-score-value">
                        {weighted.toFixed(1)}
                      </div>
                      <div className="score-percent-bar-outer">
                        <div
                          className="score-percent-bar-inner"
                          style={{
                            width: `${Math.min(100, normalized)}%`,
                            background: `linear-gradient(90deg, ${alt.color}88 0%, ${alt.color} 100%)`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card ranking-card">
        <h2 className="card-title">综合评分排名</h2>
        {rankedAlternatives.length === 0 ? (
          <p className="empty-hint">暂无数据</p>
        ) : (
          <ol className="ranking-list">
            {rankedAlternatives.map((alt, idx) => (
              <li key={alt.id} className="ranking-item">
                <span
                  className={`ranking-badge rank-${Math.min(idx + 1, 4)}`}
                >
                  {idx + 1}
                </span>
                <span
                  className="ranking-dot"
                  style={{ backgroundColor: alt.color }}
                />
                <span className="ranking-name">{alt.name}</span>
                <span className="ranking-score">
                  {alt.weightedScore.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
