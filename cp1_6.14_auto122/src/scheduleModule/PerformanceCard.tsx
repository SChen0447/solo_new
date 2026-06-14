import { useRef, useState, useEffect } from 'react';
import type { Performance } from '../../types';
import { useStore } from '../../store';
import './PerformanceCard.css';

interface PerformanceCardProps {
  performance: Performance;
  isConflict: boolean;
  onDragStart: (e: React.DragEvent, perf: Performance) => void;
  onDragEnd: () => void;
}

export default function PerformanceCard({
  performance,
  isConflict,
  onDragStart,
  onDragEnd,
}: PerformanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const {
    actors,
    feedbacks,
    performances,
    setSelectedPerformanceId,
    selectedPerformanceId,
    setFeedbackPanelOpen,
    getActorParticipation,
    deletePerformance,
    setEditingPerformance,
    setCreateModalOpen,
  } = useStore();

  const averageRating = useStore.getState().getPerformanceAverageRating(performance.id);
  const perfFeedbacks = feedbacks.filter((f) => f.performanceId === performance.id);
  const conflictIds = useStore.getState().getConflicts().get(performance.id) || [];
  const conflictingPerfs = performances.filter((p) => conflictIds.includes(p.id));

  const ratingGradient = () => {
    if (averageRating === 0) return 'linear-gradient(135deg, #7f8c8d, #95a5a6)';
    const ratio = (averageRating - 1) / 4;
    const r = Math.round(231 - ratio * (231 - 46));
    const g = Math.round(76 + ratio * (204 - 76));
    const b = Math.round(60 + ratio * (113 - 60));
    return `linear-gradient(135deg, rgb(${r}, ${g}, ${b}), rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)}))`;
  };

  const statusText: Record<string, string> = {
    scheduled: '已排期',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };

  const typeText = performance.type === 'rehearsal' ? '排练' : '正式演出';

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.animation = 'none';
      const offsetHeight = cardRef.current.offsetHeight;
      void offsetHeight;
      cardRef.current.style.animation = '';
    }
  }, [performance.id]);

  const handleClick = (e: React.MouseEvent) => {
    if (isConflict && e.detail === 1) {
      if (conflictingPerfs.length > 0) {
        setShowConflictModal(true);
        return;
      }
    }
    setExpanded(!expanded);
    if (!expanded) {
      setSelectedPerformanceId(performance.id);
    }
  };

  const handleEdit = () => {
    setEditingPerformance(performance);
    setCreateModalOpen(true);
  };

  const handleDelete = () => {
    if (confirm('确定要删除此演出吗？')) {
      deletePerformance(performance.id);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`perf-card ${isConflict ? 'conflict' : ''} ${expanded ? 'expanded' : ''} ${selectedPerformanceId === performance.id ? 'selected' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, performance)}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        style={{
          borderLeft: isConflict ? '4px solid #E74C3C' : `4px solid ${performance.color}`,
        }}
      >
        {isConflict && <div className="conflict-flash" />}

        <div className="card-header">
          <span
            className="type-badge"
            style={{
              backgroundColor:
                performance.type === 'rehearsal' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(230, 126, 34, 0.2)',
              color: performance.type === 'rehearsal' ? '#3498DB' : '#E67E22',
            }}
          >
            {typeText}
          </span>
          {averageRating > 0 && (
            <span
              className="rating-badge"
              style={{ background: ratingGradient() }}
              title={`平均评分: ${averageRating} (${perfFeedbacks.length}条反馈)`}
            >
              {averageRating}
            </span>
          )}
        </div>

        <div className="card-title">{performance.name}</div>
        <div className="card-time">
          🕐 {performance.startTime} - {performance.endTime}
        </div>
        <div className="card-location">📍 {performance.location}</div>
        <div
          className="card-status"
          style={{
            color:
              performance.status === 'completed'
                ? '#2ECC71'
                : performance.status === 'cancelled'
                ? '#E74C3C'
                : performance.status === 'in-progress'
                ? '#E67E22'
                : '#95a5a6',
          }}
        >
          ● {statusText[performance.status]}
        </div>

        {expanded && (
          <div className="card-expanded">
            <div className="expanded-section">
              <div className="expanded-label">参与演员：</div>
              <div className="actor-tags">
                {performance.actorIds.map((aid) => {
                  const actor = actors.find((a) => a.id === aid);
                  return actor ? (
                    <span
                      key={aid}
                      className="actor-tag"
                      style={{ borderColor: actor.avatarColor, color: actor.avatarColor }}
                      onClick={(e) => {
                        e.stopPropagation();
                        useStore.getState().setSelectedActorId(aid);
                        useStore.getState().setActorPanelOpen(true);
                      }}
                    >
                      {actor.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {perfFeedbacks.length > 0 && (
              <div className="expanded-section">
                <div className="expanded-label">最近反馈：</div>
                {perfFeedbacks.slice(-3).map((f) => {
                  const actor = actors.find((a) => a.id === f.actorId);
                  return (
                    <div key={f.id} className="feedback-mini">
                      <span style={{ color: actor?.avatarColor }}>{actor?.name}</span>
                      <span className="stars">
                        {'★'.repeat(f.rating)}
                        <span className="stars-gray">{'★'.repeat(5 - f.rating)}</span>
                      </span>
                      <span className="feedback-text">{f.comment}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card-actions">
              <button
                className="btn btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPerformanceId(performance.id);
                  setFeedbackPanelOpen(true);
                }}
              >
                提交反馈
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
              >
                编辑
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {showConflictModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowConflictModal(false)}
        >
          <div className="modal-content conflict-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ 档期冲突检测</h3>
            <p style={{ color: '#E74C3C' }}>
              《{performance.name}》存在 {conflictingPerfs.length} 个时间冲突：
            </p>
            <ul className="conflict-list">
              {conflictingPerfs.map((cp) => (
                <li key={cp.id}>
                  <span className="conflict-dot" style={{ backgroundColor: cp.color }} />
                  <strong>{cp.name}</strong>
                  <span className="conflict-time">
                    {cp.startTime} - {cp.endTime} · {cp.location}
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" onClick={() => setShowConflictModal(false)}>
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
