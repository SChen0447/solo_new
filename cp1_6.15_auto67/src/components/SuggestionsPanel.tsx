import React, { useCallback } from 'react';
import useCarbonStore from '../store/carbonStore';
import type { Suggestion } from '../store/carbonStore';

interface SuggestionsPanelProps {
  onApplySuggestion: (suggestion: Suggestion) => void;
}

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ onApplySuggestion }) => {
  const suggestions = useCarbonStore((s) => s.suggestions);

  const handleApply = useCallback(
    (suggestion: Suggestion) => {
      onApplySuggestion(suggestion);
    },
    [onApplySuggestion],
  );

  return (
    <div className="suggestions-panel">
      <h3 className="panel-title">🌿 减排建议</h3>
      {suggestions.length === 0 ? (
        <p className="no-suggestions">暂无建议，请先记录活动</p>
      ) : (
        <div className="suggestions-list">
          {suggestions.map((s) => (
            <div key={s.id} className="suggestion-card" onClick={() => handleApply(s)}>
              <p className="suggestion-text">{s.text}</p>
              <div className="suggestion-meta">
                <span className="carbon-saving">
                  可减少 <strong>{s.carbonSaving.toFixed(2)}</strong> kg CO₂e
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.max(s.progress * 100, 5)}%` }}
                />
              </div>
              <button className="apply-btn" type="button">
                模拟调整 →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionsPanel;
