import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SuggestionCardProps {
  lineNumber: number;
  type: 'redundant' | 'inaccurate' | 'missing' | 'offensive' | 'commented-out';
  severity: 'low' | 'medium' | 'high';
  message: string;
  originalComment?: string;
  suggestion?: string;
  originalCode: string;
  suggestedCode?: string;
  onApply: () => void;
  onRevert: () => void;
  isApplied?: boolean;
  isApplying?: boolean;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  lineNumber,
  type,
  severity,
  message,
  originalComment,
  suggestion,
  originalCode,
  suggestedCode,
  onApply,
  onRevert,
  isApplied = false,
  isApplying = false,
}) => {
  const [isFading, setIsFading] = useState(false);

  const getSeverityColor = () => {
    switch (severity) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#4CAF50';
      default:
        return '#888';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'redundant':
        return '冗余注释';
      case 'inaccurate':
        return '不准确';
      case 'missing':
        return '缺失注释';
      case 'offensive':
        return '不当语言';
      case 'commented-out':
        return '注释代码';
      default:
        return '问题';
    }
  };

  const handleApply = () => {
    setIsFading(true);
    setTimeout(() => {
      onApply();
      setTimeout(() => setIsFading(false), 300);
    }, 150);
  };

  const handleRevert = () => {
    setIsFading(true);
    setTimeout(() => {
      onRevert();
      setTimeout(() => setIsFading(false), 300);
    }, 150);
  };

  const language = 'typescript';

  return (
    <div className={`suggestion-card ${isFading ? 'fade' : ''}`}>
      <div className="suggestion-header">
        <div className="suggestion-type" style={{ backgroundColor: getSeverityColor() }}>
          {getTypeLabel()}
        </div>
        <div className="suggestion-line">第 {lineNumber} 行</div>
      </div>

      <p className="suggestion-message">{message}</p>

      <div className="code-comparison">
        <div className="code-block">
          <div className="code-label">原始代码</div>
          <div className="code-snippet-wrapper">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '10px',
                fontSize: '12px',
                borderRadius: '4px',
                background: '#1E1E1E',
              }}
            >
              {originalCode || '// 无'}
            </SyntaxHighlighter>
          </div>
        </div>

        {suggestedCode && suggestedCode !== originalCode && (
          <div className="code-block">
            <div className="code-label suggested">建议修改</div>
            <div className="code-snippet-wrapper">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  background: '#1E3A1E',
                }}
              >
                {suggestedCode}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>

      {originalComment && (
        <div className="comment-info">
          <span className="comment-label">原注释：</span>
          <span className="comment-text">{originalComment}</span>
        </div>
      )}

      {suggestion && (
        <div className="suggestion-text">
          <span className="suggestion-label">💡 建议：</span>
          <span>{suggestion}</span>
        </div>
      )}

      <div className="suggestion-actions">
        {!isApplied ? (
          <button
            className="apply-btn"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? '应用中...' : '应用建议'}
          </button>
        ) : (
          <button
            className="revert-btn"
            onClick={handleRevert}
          >
            撤销修改
          </button>
        )}
      </div>
    </div>
  );
};

export default SuggestionCard;
