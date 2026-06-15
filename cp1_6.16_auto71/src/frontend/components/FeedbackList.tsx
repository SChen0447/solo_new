import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Feedback,
  FeedbackListResponse,
  Category,
  Status,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ORDER
} from '../types';

interface FeedbackListProps {
  refreshTrigger: number;
}

const CATEGORY_TABS: Array<{ key: Category | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'feature', label: '功能建议' },
  { key: 'bug', label: 'Bug报告' },
  { key: 'ux', label: '用户体验' },
  { key: 'other', label: '其他' }
];

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN');
};

const nextStatus = (current: Status): Status => {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
};

const FeedbackList: React.FC<FeedbackListProps> = ({ refreshTrigger }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [listKey, setListKey] = useState(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: 10
      };
      if (category !== 'all') params.category = category;
      if (status !== 'all') params.status = status;

      const res = await axios.get<FeedbackListResponse>('/api/feedbacks', { params });
      setFeedbacks(res.data.feedbacks);
      setTotalPages(res.data.totalPages);
      setListKey(prev => prev + 1);
    } catch {
      showToast('error', '加载反馈列表失败');
    } finally {
      setLoading(false);
    }
  }, [category, status, page]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks, refreshTrigger]);

  const handleCategoryChange = (cat: Category | 'all') => {
    setCategory(cat);
    setPage(1);
  };

  const handleVote = async (feedbackId: string) => {
    if (votingIds.has(feedbackId)) return;

    setVotingIds(prev => new Set(prev).add(feedbackId));

    try {
      const res = await axios.post<{ votes: number }>(`/api/feedbacks/${feedbackId}/vote`);
      setFeedbacks(prev => {
        const updated = prev.map(f =>
          f.id === feedbackId ? { ...f, votes: res.data.votes } : f
        );
        updated.sort((a, b) => {
          if (b.votes !== a.votes) return b.votes - a.votes;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return updated;
      });
      showToast('success', '投票成功！');
    } catch (err: any) {
      const msg = err.response?.data?.error || '投票失败';
      showToast('error', msg);
    } finally {
      setTimeout(() => {
        setVotingIds(prev => {
          const next = new Set(prev);
          next.delete(feedbackId);
          return next;
        });
      }, 500);
    }
  };

  const handleStatusChange = async (feedbackId: string, currentStatus: Status) => {
    const newStatus = nextStatus(currentStatus);
    try {
      const res = await axios.patch<Feedback>(`/api/feedbacks/${feedbackId}/status`, {
        status: newStatus
      });
      setFeedbacks(prev =>
        prev.map(f => (f.id === feedbackId ? res.data : f))
      );
      showToast('success', `状态已变更为"${STATUS_LABELS[newStatus]}"`);
    } catch {
      showToast('error', '状态变更失败');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="category-tabs">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            className={`category-tab ${category === tab.key ? 'active' : ''}`}
            onClick={() => handleCategoryChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="category-tabs">
        <button
          className={`category-tab ${status === 'all' ? 'active' : ''}`}
          onClick={() => { setStatus('all'); setPage(1); }}
        >
          全部状态
        </button>
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            className={`category-tab ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1); }}
            style={status === s ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="divider-gradient" />

      {feedbacks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">暂无反馈，点击右上角提交第一条反馈吧！</div>
        </div>
      ) : (
        <>
          <div className="feedback-list" key={listKey}>
            {feedbacks.map(feedback => {
              const isVoting = votingIds.has(feedback.id);
              return (
                <div className="feedback-card" key={feedback.id}>
                  <div
                    className="category-bar"
                    style={{ background: CATEGORY_COLORS[feedback.category] }}
                  />
                  <div className="feedback-content">
                    <div className="feedback-header">
                      <h3 className="feedback-title">{feedback.title}</h3>
                      <div className="feedback-meta">
                        <span
                          className="category-tag"
                          style={{ background: CATEGORY_COLORS[feedback.category] }}
                        >
                          {CATEGORY_LABELS[feedback.category]}
                        </span>
                        <button
                          className="status-tag"
                          onClick={() => handleStatusChange(feedback.id, feedback.status)}
                          style={{ background: STATUS_COLORS[feedback.status] }}
                          title="点击切换状态"
                        >
                          {STATUS_LABELS[feedback.status]}
                        </button>
                      </div>
                    </div>
                    <p className="feedback-description">{feedback.description}</p>
                    <div className="feedback-footer">
                      <span>创建于 {formatDate(feedback.created_at)}</span>
                    </div>
                  </div>
                  <div className="vote-section">
                    <button
                      className={`vote-btn ${isVoting ? 'voting' : ''}`}
                      onClick={() => handleVote(feedback.id)}
                      aria-label="投票"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <span className="vote-count">{feedback.votes}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
