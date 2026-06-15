import React, { useState } from 'react';
import { Note } from '../types';
import wsManager from '../utils/websocket';

interface VotePanelProps {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
}

const VotePanel: React.FC<VotePanelProps> = ({ notes, isOpen, onClose }) => {
  const [animatingVotes, setAnimatingVotes] = useState<Set<string>>(new Set());

  const sortedNotes = [...notes].sort((a, b) => {
    const scoreA = a.upvotes - a.downvotes;
    const scoreB = b.upvotes - b.downvotes;
    return scoreB - scoreA;
  });

  const handleVote = (noteId: string, voteType: 'up' | 'down') => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const currentVote = note.userVote;
    let newVote: 'up' | 'down' | null = voteType;

    if (currentVote === voteType) {
      newVote = null;
    }

    setAnimatingVotes((prev) => new Set(prev).add(noteId));
    setTimeout(() => {
      setAnimatingVotes((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }, 150);

    wsManager.vote(noteId, newVote);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="vote-panel-overlay" onClick={onClose}>
      <div className="vote-panel" onClick={(e) => e.stopPropagation()}>
        <div className="vote-panel-header">
          <h2>🏆 便签排名</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="vote-panel-content">
          {sortedNotes.length === 0 ? (
            <div className="empty-state">
              <p>白板上还没有便签</p>
              <p className="hint">点击白板添加创意便签开始投票吧！</p>
            </div>
          ) : (
            <div className="ranking-list">
              {sortedNotes.map((note, index) => {
                const score = note.upvotes - note.downvotes;
                const isAnimating = animatingVotes.has(note.id);
                const rankStyle = getRankStyle(index);

                return (
                  <div
                    key={note.id}
                    className={`ranking-item ${rankStyle}`}
                    style={{ borderLeftColor: note.color }}
                  >
                    <div className="rank-number">{index + 1}</div>

                    <div className="ranking-note-preview" style={{ backgroundColor: note.color }}>
                      <div className="preview-text">
                        {note.text.split('\n').slice(0, 2).map((line, i) => (
                          <div key={i}>{line || '\u00A0'}</div>
                        ))}
                      </div>
                    </div>

                    <div className="ranking-info">
                      <div className="ranking-score">
                        <span className="score-label">得分</span>
                        <span className={`score-value ${score >= 0 ? 'positive' : 'negative'}`}>
                          {score >= 0 ? '+' : ''}{score}
                        </span>
                      </div>
                      <div className="vote-buttons">
                        <button
                          className={`vote-btn up ${note.userVote === 'up' ? 'voted' : ''} ${isAnimating ? 'animating' : ''}`}
                          onClick={() => handleVote(note.id, 'up')}
                          title="赞成"
                        >
                          👍 <span>{note.upvotes}</span>
                        </button>
                        <button
                          className={`vote-btn down ${note.userVote === 'down' ? 'voted' : ''} ${isAnimating ? 'animating' : ''}`}
                          onClick={() => handleVote(note.id, 'down')}
                          title="反对"
                        >
                          👎 <span>{note.downvotes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotePanel;
