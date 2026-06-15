import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  maxParticipants: number;
  registrationCount: number;
  checkinCount: number;
  createdAt: string;
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#333',
  } as React.CSSProperties,
  createButton: {
    padding: '0 24px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2196f3',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  card: {
    width: '100%',
    height: '140px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    padding: '16px',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'box-shadow 0.2s, transform 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  } as React.CSSProperties,
  cardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  cardMeta: {
    fontSize: '13px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  participantsInfo: {
    fontSize: '12px',
    color: '#888',
  } as React.CSSProperties,
  progressBar: {
    width: '80px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: {
    height: '100%',
    backgroundColor: '#2196f3',
    borderRadius: '2px',
    transition: 'width 1s ease-out',
  } as React.CSSProperties,
  menuButton: {
    position: 'absolute' as const,
    bottom: '8px',
    right: '8px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#888',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  menuDropdown: {
    position: 'absolute' as const,
    bottom: '40px',
    right: '8px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '4px',
    zIndex: 10,
    minWidth: '120px',
  } as React.CSSProperties,
  menuItem: {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#333',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#888',
  } as React.CSSProperties,
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  } as React.CSSProperties,
  errorCard: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  retryButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #c62828',
    backgroundColor: 'transparent',
    color: '#c62828',
    cursor: 'pointer',
    fontSize: '12px',
  } as React.CSSProperties,
} as const;

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('加载活动列表失败');
      }
      const data = await response.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCardClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleMenuClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === eventId ? null : eventId);
  };

  const handleShare = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/register/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('分享链接已复制到剪贴板');
    });
    setActiveMenu(null);
  };

  const handleViewReport = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    navigate(`/report/${eventId}`);
    setActiveMenu(null);
  };

  const handleCheckin = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    navigate(`/checkin/${eventId}`);
    setActiveMenu(null);
  };

  const copyShareLink = (eventId: string) => {
    const url = `${window.location.origin}/register/${eventId}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>活动管理</h1>
        <button
          style={styles.createButton}
          onClick={() => navigate('/events/create')}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2196f3')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          + 创建活动
        </button>
      </div>

      {error && (
        <div style={styles.errorCard}>
          <span>⚠ {error}</span>
          <button style={styles.retryButton} onClick={loadEvents}>
            重试
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>⏳</div>
          <div>加载中...</div>
        </div>
      ) : events.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>📋</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无活动</div>
          <div style={{ fontSize: '13px' }}>点击右上角"创建活动"开始吧</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {events.map((event) => {
            const fillPercent = Math.min(
              (event.registrationCount / event.maxParticipants) * 100,
              100
            );
            return (
              <div
                key={event.id}
                style={styles.card}
                onClick={() => handleCardClick(event.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={styles.cardContent}>
                  <div style={styles.cardTitle}>{event.name}</div>
                  <div style={styles.cardMeta}>📅 {formatDate(event.date)}</div>
                  <div style={styles.cardMeta}>📍 {event.location}</div>
                </div>
                <div style={styles.cardFooter}>
                  <div style={styles.participantsInfo}>
                    {event.registrationCount}/{event.maxParticipants} 人报名
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${fillPercent}%` }} />
                  </div>
                </div>

                <button
                  style={styles.menuButton}
                  onClick={(e) => handleMenuClick(e, event.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ⋮
                </button>

                {activeMenu === event.id && (
                  <div ref={menuRef} style={styles.menuDropdown}>
                    <div
                      style={styles.menuItem}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={(e) => handleCheckin(e, event.id)}
                    >
                      📷 扫码签到
                    </div>
                    <div
                      style={styles.menuItem}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={(e) => handleShare(e, event.id)}
                    >
                      🔗 分享链接
                    </div>
                    <div
                      style={styles.menuItem}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={(e) => handleViewReport(e, event.id)}
                    >
                      📊 查看报告
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
