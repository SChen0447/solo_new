import { useState, useEffect, useRef } from 'react';
import { useFeedbackStore, Feedback } from '../stores/feedbackStore';

const FeedbackPage = () => {
  const {
    requirements,
    demos,
    feedback,
    currentDemo,
    isLoading,
    error,
    fetchRequirements,
    fetchDemos,
    fetchFeedback,
    submitFeedback,
    setCurrentDemo,
  } = useFeedbackStore();

  const [selectedReqId, setSelectedReqId] = useState('');
  const [selectedDemoId, setSelectedDemoId] = useState('');
  const [techScore, setTechScore] = useState(5);
  const [creativeScore, setCreativeScore] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'shortlisted' | 'rejected' | 'pending'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const sliderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [sliderPositions, setSliderPositions] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  useEffect(() => {
    if (currentDemo) {
      setSelectedDemoId(currentDemo.id);
      fetchFeedback(currentDemo.id);
      const demoReq = requirements.find(r => r.id === currentDemo.req_id);
      if (demoReq) {
        setSelectedReqId(demoReq.id);
        fetchDemos(demoReq.id);
      }
    }
  }, [currentDemo, fetchFeedback, fetchDemos, requirements]);

  useEffect(() => {
    if (selectedReqId) {
      fetchDemos(selectedReqId);
    }
  }, [selectedReqId, fetchDemos]);

  useEffect(() => {
    if (selectedDemoId) {
      fetchFeedback(selectedDemoId);
    }
  }, [selectedDemoId, fetchFeedback]);

  const handleSliderMouseDown = (sliderType: string) => {
    setActiveSlider(sliderType);
    updateSliderPosition(sliderType);
  };

  const handleSliderMouseUp = () => {
    setActiveSlider(null);
  };

  const updateSliderPosition = (sliderType: string) => {
    const slider = sliderRefs.current[sliderType];
    if (slider) {
      const rect = slider.getBoundingClientRect();
      const value = sliderType === 'tech' ? techScore : creativeScore;
      const percent = (value - 1) / 9;
      setSliderPositions(prev => ({
        ...prev,
        [sliderType]: rect.left + percent * rect.width,
      }));
    }
  };

  useEffect(() => {
    if (activeSlider) {
      updateSliderPosition(activeSlider);
    }
  }, [techScore, creativeScore, activeSlider]);

  useEffect(() => {
    const handleMouseMove = () => {
      if (activeSlider) {
        updateSliderPosition(activeSlider);
      }
    };
    const handleMouseUp = () => {
      handleSliderMouseUp();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeSlider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDemoId) return;

    await submitFeedback({
      demo_id: selectedDemoId,
      tech_score: techScore,
      creative_score: creativeScore,
      comment,
      status,
    });

    setTechScore(5);
    setCreativeScore(5);
    setComment('');
    setStatus('pending');
    setShowForm(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'shortlisted': return '入围';
      case 'rejected': return '淘汰';
      case 'pending': return '待定';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shortlisted': return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.5)' };
      case 'rejected': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.5)' };
      case 'pending': return { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308', border: 'rgba(234, 179, 8, 0.5)' };
      default: return { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.5)' };
    }
  };

  const SliderWithBubble = ({
    label,
    value,
    onChange,
    sliderKey,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    sliderKey: string;
  }) => {
    const colors = {
      low: '#ef4444',
      mid: '#eab308',
      high: '#22c55e',
    };
    const color = value <= 3 ? colors.low : value <= 6 ? colors.mid : colors.high;
    const isActive = activeSlider === sliderKey;

    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', color: '#d1d5db' }}>{label}</label>
          <span style={{ fontSize: '16px', fontWeight: 600, color }}>{value}</span>
        </div>
        <div
          ref={(el) => { sliderRefs.current[sliderKey] = el; }}
          style={{ position: 'relative', padding: '12px 0' }}
        >
          {isActive && (
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: sliderPositions[sliderKey] || 0,
                transform: 'translateX(-50%)',
                padding: '4px 10px',
                background: color,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                transition: 'left 0.05s linear',
                zIndex: 10,
              }}
            >
              {value} 分
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `6px solid ${color}`,
              }} />
            </div>
          )}
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            onMouseDown={() => handleSliderMouseDown(sliderKey)}
            style={{
              width: '100%',
              height: '6px',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - 1) / 9) * 100}%, rgba(55, 65, 81, 0.5) ${((value - 1) / 9) * 100}%, rgba(55, 65, 81, 0.5) 100%)`,
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '-8px' }}>
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    );
  };

  const FeedbackTimelineItem = ({ item, isLast }: { item: Feedback; isLast: boolean }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.2)',
          }} />
          {!isLast && (
            <div style={{
              width: '2px',
              flex: 1,
              background: 'rgba(124, 58, 237, 0.2)',
              marginTop: '4px',
            }} />
          )}
        </div>
        <div style={{
          flex: 1,
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          marginBottom: isLast ? 0 : '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  background: 'rgba(124, 58, 237, 0.2)',
                  borderRadius: '12px',
                  color: '#a78bfa',
                }}>
                  技术: {item.tech_score}
                </span>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  background: 'rgba(0, 212, 255, 0.2)',
                  borderRadius: '12px',
                  color: '#00d4ff',
                }}>
                  创意: {item.creative_score}
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '12px',
              padding: '4px 12px',
              background: statusColors.bg,
              color: statusColors.text,
              border: `1px solid ${statusColors.border}`,
              borderRadius: '12px',
              fontWeight: 500,
            }}>
              {getStatusLabel(item.status)}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: 1.6, marginBottom: '12px' }}>
            {item.comment}
          </p>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {formatDate(item.created_at)}
          </div>
        </div>
      </div>
    );
  };

  const selectedDemo = demos.find(d => d.id === selectedDemoId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>反馈管理</h1>
          <p style={{ color: '#9ca3af' }}>查看和管理Demo的结构化反馈</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!selectedDemoId}
          style={{
            padding: '12px 24px',
            background: !selectedDemoId
              ? '#374151'
              : 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: !selectedDemoId ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedDemoId) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {showForm ? '取消' : '+ 添加反馈'}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
            选择征集需求
          </label>
          <select
            value={selectedReqId}
            onChange={(e) => {
              setSelectedReqId(e.target.value);
              setSelectedDemoId('');
              setCurrentDemo(null);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(26, 26, 46, 0.8)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- 请选择 --</option>
            {requirements.map((req) => (
              <option key={req.id} value={req.id}>{req.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
            选择Demo
          </label>
          <select
            value={selectedDemoId}
            onChange={(e) => {
              const demo = demos.find(d => d.id === e.target.value);
              setSelectedDemoId(e.target.value);
              setCurrentDemo(demo || null);
            }}
            disabled={!selectedReqId}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(26, 26, 46, 0.8)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              outline: 'none',
              cursor: selectedReqId ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="">-- 请选择 --</option>
            {demos.map((demo) => (
              <option key={demo.id} value={demo.id}>{demo.title} - {demo.creator}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedDemo && (
        <div style={{
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
        }}>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{selectedDemo.title}</h3>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            创作者: {selectedDemo.creator} · 文件名: {selectedDemo.filename}
          </p>
        </div>
      )}

      {showForm && selectedDemoId && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>添加反馈</h2>

          <div style={{ display: 'grid', gap: '24px', marginBottom: '24px' }}>
            <SliderWithBubble
              label="技术评分 (混音、制作、演唱)"
              value={techScore}
              onChange={setTechScore}
              sliderKey="tech"
            />
            <SliderWithBubble
              label="词曲创意评分 (旋律、歌词、原创性)"
              value={creativeScore}
              onChange={setCreativeScore}
              sliderKey="creative"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
              详细评论
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setComment(e.target.value);
                }
              }}
              placeholder="请输入详细的反馈意见..."
              required
              rows={5}
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
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)'; }}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '12px',
              color: comment.length >= 450 ? '#ef4444' : '#6b7280',
              marginTop: '4px',
            }}>
              {comment.length}/500 字
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', color: '#d1d5db' }}>
              评审状态
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {(['shortlisted', 'rejected', 'pending'] as const).map((s) => {
                const colors = getStatusColor(s);
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? colors.bg : 'rgba(15, 15, 35, 0.5)',
                      border: `2px solid ${isSelected ? colors.border : 'rgba(124, 58, 237, 0.2)'}`,
                      color: isSelected ? colors.text : '#9ca3af',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = colors.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                      }
                    }}
                  >
                    {getStatusLabel(s)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTechScore(5);
                setCreativeScore(5);
                setComment('');
                setStatus('pending');
              }}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !comment.trim()}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading || !comment.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !comment.trim() ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && comment.trim()) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isLoading ? '提交中...' : '提交反馈'}
            </button>
          </div>
        </form>
      )}

      {selectedDemoId ? (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', color: '#d1d5db' }}>
            反馈历史 ({feedback.length})
          </h2>
          {isLoading && feedback.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
              加载中...
            </div>
          ) : feedback.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(26, 26, 46, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(124, 58, 237, 0.3)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>暂无反馈</h3>
              <p style={{ color: '#6b7280' }}>点击上方"添加反馈"按钮创建第一条反馈</p>
            </div>
          ) : (
            <div style={{ paddingLeft: '8px' }}>
              {feedback.map((item, index) => (
                <FeedbackTimelineItem
                  key={item.id}
                  item={item}
                  isLast={index === feedback.length - 1}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(26, 26, 46, 0.5)',
          borderRadius: '12px',
          border: '1px dashed rgba(124, 58, 237, 0.3)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>请先选择Demo</h3>
          <p style={{ color: '#6b7280' }}>从上方下拉框选择一个征集需求和Demo，即可查看和添加反馈</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
