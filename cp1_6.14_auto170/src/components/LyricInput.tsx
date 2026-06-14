import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { LyricEngine } from '../lyric/LyricEngine';

export const LyricInput: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isMyTurn = useAppStore((s) => s.isMyTurn());
  const room = useAppStore((s) => s.room);
  const memberId = useAppStore((s) => s.memberId);

  useEffect(() => {
    setKeywords(LyricEngine.getRandomKeywords());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await LyricEngine.submitLyric(content, selectedKeyword);
      if (result.success) {
        setContent('');
        setSelectedKeyword('');
        setKeywords(LyricEngine.getRandomKeywords());
      } else {
        setError(result.error || '提交失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [content, selectedKeyword, submitting]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const prevLyric = room && room.lyrics.length > 0 ? room.lyrics[room.lyrics.length - 1] : null;

  if (!isMyTurn) {
    const currentMember = room?.members[room?.currentTurnIndex];
    return (
      <div className="lyric-input-area waiting-turn">
        <div className="turn-indicator">
          🎤 轮到 <strong>{currentMember?.nickname || '...'}</strong> 创作了
        </div>
      </div>
    );
  }

  return (
    <div className="lyric-input-area my-turn">
      {prevLyric && (
        <div className="prev-lyric">
          上一句: <em>"{prevLyric.content}"</em> — {prevLyric.memberNickname}
        </div>
      )}

      <div className="input-row">
        <textarea
          className="lyric-textarea"
          placeholder="写下你的歌词..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={200}
        />
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? '...' : '提交'}
        </button>
      </div>

      <div className="keyword-hints">
        <span className="keyword-label">灵感词:</span>
        {keywords.map((kw) => (
          <button
            key={kw}
            className={`keyword-chip ${selectedKeyword === kw ? 'selected' : ''}`}
            onClick={() => setSelectedKeyword(selectedKeyword === kw ? '' : kw)}
          >
            {kw}
          </button>
        ))}
      </div>

      {error && <div className="input-error">{error}</div>}
    </div>
  );
};
