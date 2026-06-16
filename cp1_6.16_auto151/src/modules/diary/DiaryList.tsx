import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { format, formatRelative } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { DiaryEntry as DiaryEntryType } from '../../types';
import { EMOTIONS, STRATEGY_LABELS } from '../../constants';
import { deleteDiary } from '../../utils/storage';

interface DiaryListProps {
  diaries: DiaryEntryType[];
  onDelete: () => void;
}

interface DiaryCardProps {
  entry: DiaryEntryType;
  onDelete: (id: string) => void;
}

const DiaryCard: React.FC<DiaryCardProps> = React.memo(({ entry, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emotion = EMOTIONS[entry.emotion];
  const relativeTime = formatRelative(new Date(entry.date), new Date(), { locale: zhCN });
  const formattedDate = format(new Date(entry.date), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.delete-btn')) return;
    setIsExpanded(!isExpanded);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteDiary(entry.id);
    setShowConfirm(false);
    onDelete(entry.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <div
        className="diary-card"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="diary-card-header">
          <div className="diary-emoji">{emotion.emoji}</div>
          <div className="diary-meta">
            <span className="diary-relative-time">{relativeTime}</span>
            <button
              className="delete-btn"
              onClick={handleDeleteClick}
              aria-label="删除日记"
            >
              ×
            </button>
          </div>
        </div>
        <div className="diary-summary">
          <strong style={{ color: emotion.color }}>{emotion.name}</strong>
          {' · '}
          {entry.event}
        </div>
        {isExpanded && (
          <div className="diary-details">
            <div className="detail-row">
              <span className="detail-label">日期：</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">情绪强度：</span>
              <span className="detail-value">{entry.intensity} / 10</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">事件描述：</span>
              <span className="detail-value">{entry.event}</span>
            </div>
            {entry.strategy && (
              <div className="detail-row">
                <span className="detail-label">应对策略：</span>
                <span className="detail-value">{STRATEGY_LABELS[entry.strategy]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">确认删除</h3>
            <p style={{ fontSize: '14px', color: '#616161', marginBottom: '8px' }}>
              确定要删除这条日记吗？此操作不可撤销。
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

DiaryCard.displayName = 'DiaryCard';

const DiaryList: React.FC<DiaryListProps> = ({ diaries, onDelete }) => {
  const sortedDiaries = useMemo(() => {
    return [...diaries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [diaries]);

  const handleDelete = useCallback((id: string) => {
    onDelete();
  }, [onDelete]);

  const Row: React.FC<ListChildComponentProps> = ({ index, style }) => {
    const entry = sortedDiaries[index];
    return (
      <div style={{ ...style, paddingBottom: '16px' }}>
        <DiaryCard entry={entry} onDelete={handleDelete} />
      </div>
    );
  };

  if (sortedDiaries.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">我的日记</h2>
        <div className="empty-state">
          <div className="empty-emoji">📝</div>
          <div className="empty-text">还没有日记，去记录第一条吧！</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">我的日记 · 共 {sortedDiaries.length} 条</h2>
      <div className="diary-list-container">
        <List
          height={600}
          itemCount={sortedDiaries.length}
          itemSize={100}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default DiaryList;
