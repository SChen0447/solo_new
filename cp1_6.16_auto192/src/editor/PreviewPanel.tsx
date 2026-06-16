import React from 'react';
import { Theme } from '../highlight/themes';
import { Language } from '../highlight/Highlighter';

interface PreviewPanelProps {
  highlightedHtml: string;
  originalCode: string;
  theme: Theme;
  language: Language;
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  highlightedHtml,
  originalCode,
  theme,
  language
}) => {
  const lines = originalCode.split('\n');
  const lineCount = lines.length;
  const charCount = originalCode.length;
  const lineNumbersBg = adjustBrightness(theme.backgroundColor, -5);

  const renderLineNumbers = () => {
    return lines.map((_, index) => {
      const lineNum = index + 1;
      const isBold = lineNum % 10 === 0;
      return (
        <div
          key={index}
          className={`line-number ${isBold ? 'bold' : ''}`}
        >
          {lineNum}
        </div>
      );
    });
  };

  const languageLabels: Record<Language, string> = {
    javascript: 'JavaScript',
    python: 'Python',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL'
  };

  return (
    <div
      className="preview-panel"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        transition: 'background-color 0.4s ease, color 0.4s ease'
      }}
    >
      <div className="preview-metadata">
        <span className="metadata-item">
          <strong>语言:</strong> {languageLabels[language]}
        </span>
        <span className="metadata-item">
          <strong>行数:</strong> {lineCount}
        </span>
        <span className="metadata-item">
          <strong>字符:</strong> {charCount}
        </span>
      </div>
      <div className="preview-content">
        <div
          className="line-numbers"
          style={{
            backgroundColor: lineNumbersBg,
            transition: 'background-color 0.4s ease'
          }}
        >
          {renderLineNumbers()}
        </div>
        <pre className="code-preview">
          <code
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};
