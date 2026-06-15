import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function ConcertsPage() {
  const { concerts, fetchConcerts, loading, error } = useStore()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchConcerts()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const concertDates = new Set(
    concerts.map(c => c.dateTime.split('T')[0])
  )

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (concertDates.has(dateStr)) {
      setSelectedDate(dateStr)
      setShowModal(true)
    }
  }

  const dayConcerts = selectedDate
    ? concerts.filter(c => c.dateTime.startsWith(selectedDate))
    : []

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const days: (number | null)[] = []
  for (let i = 0; i < startingDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return (
    <div style={styles.page}>
      <div className="container" style={{ paddingBottom: 100 }}>
        <h1 style={styles.title}>演出日历</h1>

        {error && <div className="error-banner">{error}</div>}

        <div style={styles.calendarCard}>
          <div style={styles.calendarHeader}>
            <button style={styles.navBtn} onClick={prevMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 style={styles.monthTitle}>{year}年 {monthNames[month]}</h2>
            <button style={styles.navBtn} onClick={nextMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div style={styles.weekDays}>
            {weekDays.map(day => (
              <div key={day} style={styles.weekDay}>{day}</div>
            ))}
          </div>

          {loading ? (
            <div style={styles.daysGrid}>
              {days.map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <div style={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} style={styles.dayCell} />
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasConcert = concertDates.has(dateStr)
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
                
                return (
                  <div
                    key={day}
                    style={{
                      ...styles.dayCell,
                      cursor: hasConcert ? 'pointer' : 'default',
                      background: isToday ? 'var(--secondary-color)' : undefined,
                      fontWeight: isToday ? 600 : undefined
                    }}
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={e => {
                      if (hasConcert) {
                        e.currentTarget.style.background = 'var(--secondary-color)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (hasConcert && !isToday) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <span>{day}</span>
                    {hasConcert && <div style={styles.dot} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={styles.dot} />
            <span>有演出</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.dot, background: 'var(--text-light)' }} />
            <span>今日</span>
          </div>
        </div>
      </div>

      {showModal && selectedDate && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {new Date(selectedDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </h3>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={styles.modalBody}>
              {dayConcerts.length === 0 ? (
                <p style={styles.noConcert}>当日暂无演出</p>
              ) : (
                dayConcerts.map(concert => (
                  <div
                    key={concert.id}
                    style={styles.concertItem}
                    onClick={() => {
                      setShowModal(false)
                      navigate(`/concerts/${concert.id}`)
                    }}
                  >
                    <div style={styles.concertTime}>{formatTime(concert.dateTime)}</div>
                    <div style={styles.concertContent}>
                      <h4 style={styles.concertTitle}>{concert.description}</h4>
                      <p style={styles.concertVenue}>📍 {concert.venue} · {concert.city}</p>
                      <div style={styles.concertMeta}>
                        <span style={styles.price}>¥{concert.price} 起</span>
                        <span style={styles.stock}>
                          剩余 {concert.stock + concert.vipStock} 张
                        </span>
                      </div>
                    </div>
                    <div style={styles.arrow}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .concert-card:hover {
          background: linear-gradient(135deg, #fff, #f0e6d2) !important;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    paddingTop: 32
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--dark-color)',
    marginBottom: 32
  },
  calendarCard: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  calendarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--dark-color)'
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--secondary-color)',
    color: 'var(--dark-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease-out'
  },
  weekDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    marginBottom: 8
  },
  weekDay: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-light)',
    padding: '8px 0'
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4
  },
  dayCell: {
    aspectRatio: '1 / 1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: 'var(--text-color)',
    borderRadius: 8,
    transition: 'background 0.2s ease-out',
    position: 'relative'
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--primary-color)',
    marginTop: 4
  },
  legend: {
    display: 'flex',
    gap: 24,
    justifyContent: 'center',
    marginTop: 20
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--text-light)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 420,
    background: 'white',
    borderRadius: '16px 16px 0 0',
    zIndex: 201,
    animation: 'slideUp 0.4s ease-out',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--dark-color)'
  },
  closeBtn: {
    background: 'none',
    color: 'var(--text-light)',
    padding: 4
  },
  modalBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 16
  },
  noConcert: {
    textAlign: 'center',
    color: 'var(--text-light)',
    padding: '40px 0'
  },
  concertItem: {
    display: 'flex',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background 0.3s ease-out',
    marginBottom: 8
  },
  concertTime: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--primary-color)',
    minWidth: 60
  },
  concertContent: {
    flex: 1,
    minWidth: 0
  },
  concertTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-color)',
    marginBottom: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  concertVenue: {
    fontSize: 13,
    color: 'var(--text-light)',
    marginBottom: 8
  },
  concertMeta: {
    display: 'flex',
    gap: 12,
    fontSize: 12
  },
  price: {
    color: 'var(--primary-color)',
    fontWeight: 600
  },
  stock: {
    color: 'var(--text-light)'
  },
  arrow: {
    color: 'var(--text-light)',
    display: 'flex',
    alignItems: 'center'
  }
}
