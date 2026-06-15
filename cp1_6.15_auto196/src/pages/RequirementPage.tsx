import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedbackStore, Requirement } from '../stores/feedbackStore';

const RequirementPage = () => {
  const navigate = useNavigate();
  const { requirements, fetchRequirements, createRequirement, isLoading, error } = useFeedbackStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    style_tags: '',
    lyrics_direction: '',
    reference_style: '',
    deadline: '',
  });

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRequirement(formData);
    setFormData({
      title: '',
      style_tags: '',
      lyrics_direction: '',
      reference_style: '',
      deadline: '',
    });
    setShowForm(false);
  };

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isExpired = (deadline: string) => {
    return getDaysRemaining(deadline) < 0;
  };

  const isUrgent = (deadline: string) => {
    const days = getDaysRemaining(deadline);
    return days >= 0 && days <= 3;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const RequirementCard = ({ req }: { req: Requirement }) => {
    const expired = isExpired(req.deadline);
    const urgent = isUrgent(req.deadline);
    const daysRemaining = getDaysRemaining(req.deadline);
    const totalDays = 30;
    const progress = expired ? 100 : Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

    return (
      <div
        style={{
          width: '320px',
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          opacity: expired ? 0.6 : 1,
          filter: expired ? 'grayscale(50%)' : 'none',
          border: urgent && !expired ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(124, 58, 237, 0.2)',
        }}
        onMouseEnter={(e) => {
          if (!expired) {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#e0e0e0' }}>{req.title}</h3>
          {expired && (
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'rgba(156, 163, 175, 0.2)',
              borderRadius: '4px',
              color: '#9ca3af',
            }}>
              已截止
            </span>
          )}
          {!expired && urgent && (
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '4px',
              color: '#ef4444',
            }}>
              即将截止
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {req.style_tags.split(',').map((tag, i) => (
            <span key={i} style={{
              fontSize: '12px',
              padding: '4px 10px',
              background: 'rgba(124, 58, 237, 0.2)',
              borderRadius: '12px',
              color: '#a78bfa',
            }}>
              {tag.trim()}
            </span>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px', lineHeight: 1.5 }}>
          {req.lyrics_direction}
        </p>

        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          参考曲风: {req.reference_style}
        </p>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#9ca3af' }}>截止日期</span>
            <span style={{ color: urgent && !expired ? '#ef4444' : '#e0e0e0', fontWeight: 500 }}>
              {formatDate(req.deadline)}
            </span>
          </div>
          <div style={{
            height: '6px',
            background: 'rgba(55, 65, 81, 0.5)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: expired
                ? 'linear-gradient(90deg, #6b7280, #9ca3af)'
                : urgent
                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {!expired && (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
              剩余 {daysRemaining} 天
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            useFeedbackStore.getState().setCurrentRequirement(req);
            navigate('/demos');
          }}
          disabled={expired}
          style={{
            width: '100%',
            padding: '10px',
            background: expired ? '#374151' : 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: expired ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!expired) {
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {expired ? '已截止' : '投稿Demo'}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>征集需求</h1>
          <p style={{ color: '#9ca3af' }}>浏览和发布词曲征集需求</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {showForm ? '取消' : '+ 发布新需求'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>发布新征集</h2>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                征集标题 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：夏季主题流行歌征集"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 15, 35, 0.8)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                  风格标签 *
                </label>
                <input
                  type="text"
                  value={formData.style_tags}
                  onChange={(e) => setFormData({ ...formData, style_tags: e.target.value })}
                  placeholder="摇滚, 民谣, 电子"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 15, 35, 0.8)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c3aed';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                  参考曲风 *
                </label>
                <input
                  type="text"
                  value={formData.reference_style}
                  onChange={(e) => setFormData({ ...formData, reference_style: e.target.value })}
                  placeholder="例如：周杰伦式中国风"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 15, 35, 0.8)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c3aed';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                歌词方向说明 *
              </label>
              <textarea
                value={formData.lyrics_direction}
                onChange={(e) => setFormData({ ...formData, lyrics_direction: e.target.value })}
                placeholder="描述歌词的主题、情感方向等"
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 15, 35, 0.8)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                投稿截止日期 *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 15, 35, 0.8)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(124, 58, 237, 0.5)',
                color: '#a78bfa',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isLoading ? '发布中...' : '发布需求'}
            </button>
          </div>
        </form>
      )}

      {isLoading && requirements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          加载中...
        </div>
      ) : requirements.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(26, 26, 46, 0.5)',
          borderRadius: '12px',
          border: '1px dashed rgba(124, 58, 237, 0.3)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>暂无征集需求</h3>
          <p style={{ color: '#6b7280' }}>点击上方"发布新需求"按钮创建第一个征集</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 320px)',
          gap: '24px',
          justifyContent: 'center',
        }}>
          {requirements.map((req) => (
            <RequirementCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RequirementPage;
