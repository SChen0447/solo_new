import { useState, useMemo } from 'react';
import { getRhymeCandidates, getLastCharOfLine } from '../modules/RhymeEngine';
import { getAllThemes, getImageryByTheme, type ImageryTheme, type ImageryWord } from '../modules/ImageryLibrary';

interface ReferencePanelProps {
  text: string;
  onWordSelect: (word: string) => void;
  isVisible: boolean;
}

interface RhymeCandidate {
  word: string;
  similarity: number;
}

export function ReferencePanel({ text, onWordSelect, isVisible }: ReferencePanelProps) {
  const [expandedTheme, setExpandedTheme] = useState<ImageryTheme | null>(null);
  const themes = getAllThemes();

  const rhymeCandidates = useMemo(() => {
    const lastChar = getLastCharOfLine(text);
    if (!lastChar) return [];
    return getRhymeCandidates(lastChar, 10);
  }, [text]);

  const handleThemeClick = (themeKey: ImageryTheme) => {
    setExpandedTheme(expandedTheme === themeKey ? null : themeKey);
  };

  const handleRhymeClick = (word: string) => {
    onWordSelect(word);
  };

  const handleImageryClick = (word: string) => {
    onWordSelect(word);
  };

  if (!isVisible) return null;

  return (
    <div className="reference-panel">
      <div className="panel-section rhyme-section">
        <h3 className="panel-title">押韵推荐</h3>
        <div className="rhyme-list">
          {rhymeCandidates.length > 0 ? (
            rhymeCandidates.map((candidate, index) => (
              <RhymeCard
                key={index}
                candidate={candidate}
                onClick={() => handleRhymeClick(candidate.word)}
              />
            ))
          ) : (
            <div className="empty-hint">输入文字后显示押韵推荐</div>
          )}
        </div>
      </div>

      <div className="panel-section imagery-section">
        <h3 className="panel-title">意象主题</h3>
        <div className="theme-buttons">
          {themes.map((theme) => (
            <button
              key={theme.themeKey}
              className={`theme-btn ${expandedTheme === theme.themeKey ? 'active' : ''}`}
              onClick={() => handleThemeClick(theme.themeKey)}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {expandedTheme && (
          <div className="imagery-list">
            {getImageryByTheme(expandedTheme).map((word, index) => (
              <ImageryItem
                key={index}
                word={word}
                onClick={() => handleImageryClick(word.word)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RhymeCard({ candidate, onClick }: { candidate: RhymeCandidate; onClick: () => void }) {
  const similarityPercent = Math.round(candidate.similarity * 100);

  return (
    <div className="rhyme-card" onClick={onClick}>
      <span className="rhyme-word">{candidate.word}</span>
      <span className="similarity-tag">{similarityPercent}%</span>
    </div>
  );
}

function ImageryItem({ word, onClick }: { word: ImageryWord; onClick: () => void }) {
  return (
    <div className="imagery-item" onClick={onClick}>
      <span className="imagery-word">{word.word}</span>
      <span className="imagery-meaning">{word.meaning}</span>
    </div>
  );
}
