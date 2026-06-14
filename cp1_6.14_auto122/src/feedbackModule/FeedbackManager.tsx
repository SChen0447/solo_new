import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useStore } from '../store';
import FeedbackChart from './FeedbackChart';
import './FeedbackManager.css';

export default function FeedbackManager() {
  const {
    selectedPerformanceId,
    setSelectedPerformanceId,
    performances,
    actors,
    feedbacks,
    checkIns,
    addFeedback,
    addCheckIn,
  } = useStore();

  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const selectedPerformance = useMemo(
    () => performances.find((p) => p.id === selectedPerformanceId),
    [performances, selectedPerformanceId]
  );

  const perfFeedbacks = useMemo(
    () => feedbacks.filter((f) => f.performanceId === selectedPerformanceId),
    [feedbacks, selectedPerformanceId]
  );

  const perfCheckIns = useMemo(
    () => checkIns.filter((c) => c.performanceId === selectedPerformanceId),
    [checkIns, selectedPerformanceId]
  );

  const averageRating = useMemo(() => {
    if (perfFeedbacks.length === 0) return 0;
    const sum = perfFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    return Math.round((sum / perfFeedbacks.length) * 10) / 10;
  }, [perfFeedbacks]);

  const hasCheckedIn = (actorId: string) =>
    perfCheckIns.some((c) => c.actorId === actorId);

  const hasSubmittedFeedback = (actorId: string) =>
    perfFeedbacks.some((f) => f.actorId === actorId);

  const handleCheckIn = (actorId: string) => {
    if (!selectedPerformanceId) return;
    if (hasCheckedIn(actorId)) return;
    addCheckIn({
      actorId,
      performanceId: selectedPerformanceId,
      checkInTime: new Date().toISOString(),
    });
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerformanceId || !selectedActorId || rating === 0) {
      alert('请选择演员并填写评分');
      return;
    }
    if (hasSubmittedFeedback(selectedActorId)) {
      alert('该演员已提交过反馈');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    await addFeedback({
      performanceId: selectedPerformanceId,
      actorId: selectedActorId,
      rating,
      comment,
    });
    setIsSubmitting(false);
    setRating(5);
    setComment('');
    setSelectedActorId('');
  };

  const handleExportReport = () => {
    const sortedPerfs = [...performances]
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .filter((p) => feedbacks.some((f) => f.performanceId === p.id));

    const report = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalPerformances: performances.length,
        totalFeedbacks: feedbacks.length,
        totalActors: actors.length,
        overallAverage: (() => {
          if (feedbacks.length === 0) return 0;
          return Math.round(
            (feedbacks.reduce((a, f) => a + f.rating, 0) / feedbacks.length) * 10
          ) / 10;
        })(),
      },
      qualityTrend: sortedPerfs.map((p) => {
        const pf = feedbacks.filter((f) => f.performanceId === p.id);
        const avg = pf.length > 0 ? pf.reduce((a, f) => a + f.rating, 0) / pf.length : 0;
        return {
          date: p.date,
          name: p.name,
          averageRating: Math.round(avg * 10) / 10,
          feedbackCount: pf.length,
          type: p.type,
        };
      }),
      actorParticipation: actors.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        totalParticipations: performances.filter((p) => p.actorIds.includes(a.id)).length,
        feedbacksGiven: feedbacks.filter((f) => f.actorId === a.id).length,
        checkIns: checkIns.filter((c) => c.actorId === a.id).length,
      })),
      feedbacks: feedbacks.map((f) => ({
        ...f,
        performanceName: performances.find((p) => p.id === f.performanceId)?.name,
        actorName: actors.find((a) => a.id === f.actorId)?.name,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theater-report-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    useStore.getState().showToast('报告已导出', 'success');
  };

  return (
    <div className="feedback-manager">
      <div className="feedback-header">
        <h3>🎭 排练反馈与质量分析</h3>
        <button className="btn btn-primary btn-sm" onClick={handleExportReport}>
          📊 导出报告
        </button>
      </div>

      <div className="perf-selector">
        <label>选择演出：</label>
        <select
          value={selectedPerformanceId || ''}
          onChange={(e) => setSelectedPerformanceId(e.target.value || null)}
        >
          <option value="">-- 请选择演出 --</option>
          {performances
            .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
            .map((p) => (
              <option key={p.id} value={p.id}>
                [{format(new Date(p.date + 'T00:00:00'), 'M/d')}] {p.name}
              </option>
            ))}
        </select>
      </div>

      {selectedPerformance && (
        <div className="selected-perf-info" style={{ borderLeftColor: selectedPerformance.color }}>
          <div className="perf-info-main">
            <h4>{selectedPerformance.name}</h4>
            <div className="perf-meta">
              <span>📅 {format(new Date(selectedPerformance.date + 'T00:00:00'), 'yyyy年M月d日')}</span>
              <span>🕐 {selectedPerformance.startTime} - {selectedPerformance.endTime}</span>
              <span>📍 {selectedPerformance.location}</span>
            </div>
          </div>
          <div className="perf-stats">
            <div className="stat-item">
              <div className="stat-value">{averageRating || '-'}</div>
              <div className="stat-label">平均分</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{perfFeedbacks.length}</div>
              <div className="stat-label">反馈数</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{perfCheckIns.length}/{selectedPerformance.actorIds.length}</div>
              <div className="stat-label">打卡</div>
            </div>
          </div>
        </div>
      )}

      {selectedPerformanceId && (
        <>
          <div className="section-title">演员打卡与反馈提交</div>
          <div className="actors-panel">
            {selectedPerformance?.actorIds.map((aid) => {
              const actor = actors.find((a) => a.id === aid);
              if (!actor) return null;
              const checkedIn = hasCheckedIn(aid);
              const gaveFeedback = hasSubmittedFeedback(aid);
              return (
                <div
                  key={aid}
                  className={`actor-panel-card ${selectedActorId === aid ? 'active' : ''}`}
                  onClick={() => !gaveFeedback && setSelectedActorId(aid)}
                >
                  <div className="actor-panel-header">
                    <div
                      className="actor-panel-avatar"
                      style={{ backgroundColor: actor.avatarColor }}
                    >
                      {actor.name[0]}
                    </div>
                    <div className="actor-panel-info">
                      <div className="actor-panel-name">{actor.name}</div>
                      <div className="actor-panel-role">{actor.role}</div>
                    </div>
                    <div className="actor-status-badges">
                      <span className={`status-badge ${checkedIn ? 'success' : 'gray'}`}>
                        {checkedIn ? '✓ 已打卡' : '待打卡'}
                      </span>
                      {!checkedIn && (
                        <button
                          className="btn btn-small btn-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(aid);
                          }}
                        >
                          打卡
                        </button>
                      )}
                      {gaveFeedback && (
                        <span className="status-badge success">✓ 已反馈</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedActorId && !hasSubmittedFeedback(selectedActorId) && (
            <form onSubmit={handleSubmitFeedback} className="feedback-form">
              <div className="form-row">
                <label>排练满意度评分</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`star ${(hoverRating || rating) >= n ? 'filled' : ''}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </span>
                  ))}
                  <span className="rating-text">
                    {(hoverRating || rating)} / 5
                  </span>
                </div>
              </div>
              <div className="form-row">
                <label>反馈备注</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="请输入本次排练的感受、建议或需要改进的地方..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    提交中...
                  </>
                ) : (
                  '提交反馈'
                )}
              </button>
            </form>
          )}

          {perfFeedbacks.length > 0 && (
            <div className="feedbacks-list">
              <div className="section-title">全部反馈</div>
              {perfFeedbacks.map((f) => {
                const actor = actors.find((a) => a.id === f.actorId);
                const checkIn = perfCheckIns.find((c) => c.actorId === f.actorId);
                return (
                  <div key={f.id} className="feedback-item">
                    <div className="feedback-header-item">
                      <div
                        className="feedback-avatar"
                        style={{ backgroundColor: actor?.avatarColor }}
                      >
                        {actor?.name[0]}
                      </div>
                      <div className="feedback-meta">
                        <span className="feedback-author" style={{ color: actor?.avatarColor }}>
                          {actor?.name}
                        </span>
                        <span className="feedback-date">
                          {format(new Date(f.createdAt), 'M/d HH:mm')}
                        </span>
                        {checkIn && (
                          <span className="feedback-checkin">
                            打卡 {format(new Date(checkIn.checkInTime), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="feedback-rating">
                        {'★'.repeat(f.rating)}
                        <span className="stars-gray">{'★'.repeat(5 - f.rating)}</span>
                      </div>
                    </div>
                    {f.comment && <div className="feedback-comment">{f.comment}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="charts-section">
        <div className="section-title">📈 质量分析报告</div>
        <FeedbackChart />
      </div>
    </div>
  );
}
