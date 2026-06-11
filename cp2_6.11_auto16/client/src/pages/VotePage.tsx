import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getHours, isToday, zhCN } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Check, HelpCircle, X as XIcon, BarChart3 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { Event, Vote, VoteStatus } from '@/types';

const STATUS_ORDER: VoteStatus[] = ['available', 'hesitant', 'unavailable', null];

const STATUS_CONFIG = {
  available: { label: '有空', color: 'var(--color-available)', bgColor: 'rgba(16, 185, 129, 0.15)' },
  hesitant: { label: '犹豫', color: 'var(--color-hesitant)', bgColor: 'rgba(245, 158, 11, 0.15)' },
  unavailable: { label: '没空', color: 'var(--color-unavailable)', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const VotePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { state, dispatch } = useAppContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [participantName, setParticipantName] = useState(state.participantName);
  const [nameInput, setNameInput] = useState(state.participantName);
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        const data = await response.json();
        setEvent(data.event);
        setVotes(data.votes);
        dispatch({ type: 'SET_EVENT', payload: data.event });
        dispatch({ type: 'SET_VOTES', payload: data.votes });
      } catch (err) {
        setError('事件不存在或已过期');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events/${eventId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'initial' || message.type === 'vote_update') {
        dispatch({ type: 'SET_STATS', payload: message.data });
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [eventId, dispatch]);

  const getVoteStatus = useCallback(
    (candidateTimeId: string, participant: string): VoteStatus | null => {
      const vote = votes.find(
        (v) => v.candidateTimeId === candidateTimeId && v.participantName === participant
      );
      return vote?.status || null;
    },
    [votes]
  );

  const getStatusCounts = useCallback(
    (candidateTimeId: string) => {
      const timeVotes = votes.filter((v) => v.candidateTimeId === candidateTimeId);
      return {
        available: timeVotes.filter((v) => v.status === 'available').length,
        hesitant: timeVotes.filter((v) => v.status === 'hesitant').length,
        unavailable: timeVotes.filter((v) => v.status === 'unavailable').length,
      };
    },
    [votes]
  );

  const handleCellClick = async (candidateTimeId: string) => {
    if (!participantName.trim()) {
      alert('请先输入您的姓名');
      return;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    setAnimatingCell(candidateTimeId);
    setTimeout(() => setAnimatingCell(null), 200);

    const currentStatus = getVoteStatus(candidateTimeId, participantName);
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

    if (nextStatus === null) {
      return;
    }

    const localVote: Vote = {
      id: Date.now().toString(),
      eventId: eventId!,
      candidateTimeId,
      participantName,
      status: nextStatus,
      timestamp: new Date().toISOString(),
    };

    const existingIndex = votes.findIndex(
      (v) => v.candidateTimeId === candidateTimeId && v.participantName === participantName
    );
    let newVotes;
    if (existingIndex >= 0) {
      newVotes = [...votes];
      newVotes[existingIndex] = localVote;
    } else {
      newVotes = [...votes, localVote];
    }
    setVotes(newVotes);
    dispatch({ type: 'ADD_VOTE', payload: localVote });

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          candidateTimeId,
          participantName,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error('Vote submission failed:', err);
    }
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setParticipantName(nameInput.trim());
      dispatch({ type: 'SET_PARTICIPANT', payload: nameInput.trim() });
    }
  };

  const handlePrevMonth = () => {
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentMonth(subMonths(currentMonth, 1));
      setSlideDirection(null);
    }, 150);
  };

  const handleNextMonth = () => {
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentMonth(addMonths(currentMonth, 1));
      setSlideDirection(null);
    }, 150);
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const candidateTimesByDate = useMemo(() => {
    if (!event) return new Map<string, typeof event.candidateTimes>();
    const map = new Map<string, typeof event.candidateTimes>();
    event.candidateTimes.forEach((ct) => {
      const dateKey = format(new Date(ct.startTime), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(ct);
    });
    return map;
  }, [event]);

  if (isLoading) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 8 }}>{error || '出错了'}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>请检查链接是否正确</p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="fade-in-up" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>{event.title}</h1>
        {event.description && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{event.description}</p>
        )}
        {event.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {event.tags.map((tag) => (
              <span key={tag} className="tag" style={{ cursor: 'default' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card fade-in-up" style={{ padding: 20, marginBottom: 24, animationDelay: '100ms', opacity: 0 }}>
        {!participantName ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <User size={20} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input"
              placeholder="请输入您的姓名开始投票..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              确认
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {participantName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{participantName}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>点击候选时间切换状态</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: config.bgColor,
                      border: `2px solid ${config.color}`,
                    }}
                  />
                  <span style={{ fontSize: 13 }}>{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card fade-in-up" style={{ padding: 24, animationDelay: '200ms', opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button className="btn btn-secondary" onClick={handlePrevMonth} style={{ padding: '8px 12px', minHeight: 40, minWidth: 40 }}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: 24 }}>
            {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
          </h2>
          <button className="btn btn-secondary" onClick={handleNextMonth} style={{ padding: '8px 12px', minHeight: 40, minWidth: 40 }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: 'none' }}>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        <div className="calendar-view">
          <div className="weekday-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>
                {day}
              </div>
            ))}
          </div>

          <div
            className={`calendar-grid ${slideDirection === 'left' ? 'slide-in-left' : slideDirection === 'right' ? 'slide-in-right' : ''}`}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}
          >
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayCandidateTimes = candidateTimesByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const dayIsToday = isToday(day);

              return (
                <div
                  key={dateKey}
                  style={{
                    minHeight: 100,
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: isCurrentMonth ? 'var(--bg-secondary)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.3,
                    border: dayIsToday ? '2px solid var(--color-primary)' : '1px solid transparent',
                    transition: 'all var(--transition-fast)',
                    animation: `fadeInUp 0.3s ease-out ${index * 10}ms both`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: dayIsToday ? 700 : 500,
                      color: dayIsToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    {format(day, 'd')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayCandidateTimes.map((ct) => {
                      const hour = getHours(new Date(ct.startTime));
                      const myStatus = getVoteStatus(ct.id, participantName);
                      const counts = getStatusCounts(ct.id);
                      const isAnimating = animatingCell === ct.id;
                      const statusConfig = myStatus ? STATUS_CONFIG[myStatus] : null;

                      return (
                        <button
                          key={ct.id}
                          onClick={() => handleCellClick(ct.id)}
                          disabled={!participantName}
                          className="ripple"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: `2px solid ${statusConfig ? statusConfig.color : 'var(--border-color)'}`,
                            backgroundColor: statusConfig ? statusConfig.bgColor : 'var(--bg-card)',
                            cursor: participantName ? 'pointer' : 'not-allowed',
                            textAlign: 'left',
                            fontSize: 12,
                            transition: 'all var(--transition-fast)',
                            transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                            minHeight: 44,
                          }}
                          onMouseEnter={(e) => {
                            if (participantName) {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = isAnimating ? 'scale(0.95)' : 'scale(1)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500 }}>{hour}:00</span>
                            {myStatus === 'available' && <Check size={14} style={{ color: STATUS_CONFIG.available.color }} />}
                            {myStatus === 'hesitant' && <HelpCircle size={14} style={{ color: STATUS_CONFIG.hesitant.color }} />}
                            {myStatus === 'unavailable' && <XIcon size={14} style={{ color: STATUS_CONFIG.unavailable.color }} />}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            {counts.available > 0 && (
                              <span style={{ color: STATUS_CONFIG.available.color, fontSize: 10 }}>✓{counts.available}</span>
                            )}
                            {counts.hesitant > 0 && (
                              <span style={{ color: STATUS_CONFIG.hesitant.color, fontSize: 10 }}>?{counts.hesitant}</span>
                            )}
                            {counts.unavailable > 0 && (
                              <span style={{ color: STATUS_CONFIG.unavailable.color, fontSize: 10 }}>✕{counts.unavailable}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mobile-list-view" style={{ display: 'none' }}>
          {Array.from(candidateTimesByDate.entries()).map(([dateKey, cts]) => {
            const date = new Date(dateKey);
            const dayIsToday = isToday(date);
            return (
              <div key={dateKey} style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 16,
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border-color)',
                    color: dayIsToday ? 'var(--color-primary)' : 'var(--text-primary)',
                  }}
                >
                  {format(date, 'MM月dd日 EEEE', { locale: zhCN })}
                  {dayIsToday && <span style={{ marginLeft: 8, fontSize: 12 }}>今天</span>}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cts.map((ct) => {
                    const hour = getHours(new Date(ct.startTime));
                    const myStatus = getVoteStatus(ct.id, participantName);
                    const counts = getStatusCounts(ct.id);
                    const isAnimating = animatingCell === ct.id;
                    const statusConfig = myStatus ? STATUS_CONFIG[myStatus] : null;

                    return (
                      <button
                        key={ct.id}
                        onClick={() => handleCellClick(ct.id)}
                        disabled={!participantName}
                        className="ripple"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 16,
                          borderRadius: 12,
                          border: `2px solid ${statusConfig ? statusConfig.color : 'var(--border-color)'}`,
                          backgroundColor: statusConfig ? statusConfig.bgColor : 'var(--bg-card)',
                          cursor: participantName ? 'pointer' : 'not-allowed',
                          transition: 'all var(--transition-fast)',
                          transform: isAnimating ? 'scale(0.98)' : 'scale(1)',
                          minHeight: 60,
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 18, fontWeight: 600 }}>{hour}:00 - {hour + 1}:00</div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13 }}>
                            <span style={{ color: STATUS_CONFIG.available.color }}>有空 {counts.available}</span>
                            <span style={{ color: STATUS_CONFIG.hesitant.color }}>犹豫 {counts.hesitant}</span>
                            <span style={{ color: STATUS_CONFIG.unavailable.color }}>没空 {counts.unavailable}</span>
                          </div>
                        </div>
                        <div>
                          {myStatus === 'available' && <Check size={24} style={{ color: STATUS_CONFIG.available.color }} />}
                          {myStatus === 'hesitant' && <HelpCircle size={24} style={{ color: STATUS_CONFIG.hesitant.color }} />}
                          {myStatus === 'unavailable' && <XIcon size={24} style={{ color: STATUS_CONFIG.unavailable.color }} />}
                          {!myStatus && <div style={{ width: 24, height: 24 }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button
          className="btn btn-accent"
          onClick={() => window.location.href = `/stats/${eventId}`}
        >
          <BarChart3 size={18} />
          查看统计看板
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .calendar-view {
            display: none !important;
          }
          .mobile-list-view {
            display: block !important;
          }
          .weekday-header {
            display: none !important;
          }
          .calendar-grid {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VotePage;
