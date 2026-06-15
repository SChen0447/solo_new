import { useState } from 'react';
import { useEmotionContext } from '../context';
import { EMOTIONS, EMOTION_MAP, EmotionType } from '../types';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${hh}:${mm}`;
}

export default function EmotionSelector() {
  const { recentRecords, addRecord, deleteRecord } = useEmotionContext();
  const [confirmType, setConfirmType] = useState<EmotionType | null>(null);
  const [clicked, setClicked] = useState<EmotionType | null>(null);

  const handleClick = (type: EmotionType) => {
    setClicked(type);
    setConfirmType(type);
    setTimeout(() => setClicked(null), 300);
  };

  const handleConfirm = () => {
    if (confirmType) {
      addRecord(confirmType);
      setConfirmType(null);
    }
  };

  return (
    <div className="card emotion-selector-card">
      <h2 className="card-title">今日心情</h2>
      <div className="emotion-buttons">
        {EMOTIONS.map((em) => (
          <button
            key={em.type}
            className={`emotion-btn ${clicked === em.type ? 'clicked' : ''}`}
            onClick={() => handleClick(em.type)}
            style={{ '--em-color': em.color } as React.CSSProperties}
            title={em.label}
          >
            <span className="emoji">{em.emoji}</span>
          </button>
        ))}
      </div>

      <div className="recent-section">
        <h3 className="section-subtitle">最近记录</h3>
        {recentRecords.length === 0 ? (
          <p className="empty-tip">还没有记录，点击上方表情开始记录吧～</p>
        ) : (
          <ul className="record-list">
            {recentRecords.map((r) => {
              const info = EMOTION_MAP[r.type];
              return (
                <li key={r.id} className="record-item">
                  <span className="record-emoji">{info.emoji}</span>
                  <div className="record-info">
                    <span className="record-label">{info.label}</span>
                    <span className="record-time">{formatTime(r.timestamp)}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => deleteRecord(r.id)}
                    title="删除此记录"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmType && (
        <div className="modal-overlay" onClick={() => setConfirmType(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">{EMOTION_MAP[confirmType].emoji}</div>
            <div className="modal-text">确认记录 <strong>{EMOTION_MAP[confirmType].label}</strong> 吗？</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmType(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: EMOTION_MAP[confirmType].color }}
                onClick={handleConfirm}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
