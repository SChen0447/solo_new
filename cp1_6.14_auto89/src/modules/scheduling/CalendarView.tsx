import { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Booking } from '../../types'

const STATIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']
const TOTAL_SLOTS = 28
const START_HOUR = 8

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateLabel(date: Date): string {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = weekDays[date.getDay()]
  return `${month}/${day} ${weekDay}`
}

function timeToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0)
}

function slotIndexToTime(index: number): string {
  const hour = START_HOUR + Math.floor(index / 2)
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
}

interface QuickBookingModalProps {
  stationId: string
  date: string
  startTime: string
  endTime: string
  onClose: () => void
  onSuccess: () => void
}

function QuickBookingModal({
  stationId,
  date,
  startTime,
  endTime,
  onClose,
  onSuccess,
}: QuickBookingModalProps) {
  const [bookerName, setBookerName] = useState('')
  const [projectNote, setProjectNote] = useState('')
  const [localError, setLocalError] = useState('')
  const createBooking = useAppStore((state) => state.createBooking)
  const loading = useAppStore((state) => state.loading)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!bookerName.trim()) {
      setLocalError('请填写预约人姓名')
      return
    }

    try {
      await createBooking({
        stationId,
        date,
        startTime,
        endTime,
        bookerName: bookerName.trim(),
        projectNote: projectNote.trim(),
      })
      onSuccess()
    } catch (err: any) {
      setLocalError(err.message || '预约失败')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>快速预约 - {stationId} 工位</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {localError && (
          <div className="error-alert">
            {localError}
            <button
              onClick={() => setLocalError('')}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.7)' }}>
          <p>日期：{date}</p>
          <p>时段：{startTime} - {endTime}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>预约人姓名</label>
            <input
              type="text"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              placeholder="请输入您的姓名"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>项目备注</label>
            <textarea
              value={projectNote}
              onChange={(e) => setProjectNote(e.target.value)}
              placeholder="请输入项目备注（选填）"
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? '提交中...' : '确认预约'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CalendarView() {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.setDate(diff))
  })

  const [selectedSlot, setSelectedSlot] = useState<{
    stationId: string
    date: string
    startTime: string
    endTime: string
  } | null>(null)

  const bookings = useAppStore((state) => state.bookings)
  const fetchBookings = useAppStore((state) => state.fetchBookings)

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  useEffect(() => {
    const startDate = formatDate(weekDates[0])
    const endDate = formatDate(weekDates[6])
    fetchBookings()
  }, [weekDates, fetchBookings])

  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking[]>()
    bookings.forEach((booking) => {
      const key = `${booking.stationId}-${booking.date}`
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(booking)
    })
    return map
  }, [bookings])

  const prevWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() - 7)
    setWeekStart(newStart)
  }

  const nextWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + 7)
    setWeekStart(newStart)
  }

  const handleSlotClick = (
    stationId: string,
    date: string,
    slotIndex: number
  ) => {
    const key = `${stationId}-${date}`
    const stationBookings = bookingMap.get(key) || []

    const slotStart = slotIndexToTime(slotIndex)
    const slotEnd = slotIndexToTime(slotIndex + 1)

    const isOccupied = stationBookings.some((b) => {
      const bStart = timeToSlotIndex(b.startTime)
      const bEnd = timeToSlotIndex(b.endTime)
      return slotIndex >= bStart && slotIndex < bEnd
    })

    if (isOccupied) return

    setSelectedSlot({
      stationId,
      date,
      startTime: slotStart,
      endTime: slotEnd,
    })
  }

  const getSlotInfo = (
    stationId: string,
    date: string,
    slotIndex: number
  ): { occupied: boolean; booker?: string; booking?: Booking } => {
    const key = `${stationId}-${date}`
    const stationBookings = bookingMap.get(key) || []

    for (const booking of stationBookings) {
      const bStart = timeToSlotIndex(booking.startTime)
      const bEnd = timeToSlotIndex(booking.endTime)
      if (slotIndex >= bStart && slotIndex < bEnd) {
        return {
          occupied: true,
          booker: booking.bookerName,
          booking,
        }
      }
    }

    return { occupied: false }
  }

  const isBookingStart = (
    stationId: string,
    date: string,
    slotIndex: number
  ): boolean => {
    const key = `${stationId}-${date}`
    const stationBookings = bookingMap.get(key) || []
    return stationBookings.some(
      (b) => timeToSlotIndex(b.startTime) === slotIndex
    )
  }

  const getBookingDuration = (
    stationId: string,
    date: string,
    slotIndex: number
  ): number => {
    const key = `${stationId}-${date}`
    const stationBookings = bookingMap.get(key) || []
    const booking = stationBookings.find((b) => {
      const bStart = timeToSlotIndex(b.startTime)
      const bEnd = timeToSlotIndex(b.endTime)
      return slotIndex >= bStart && slotIndex < bEnd
    })
    if (!booking) return 1
    return timeToSlotIndex(booking.endTime) - timeToSlotIndex(booking.startTime)
  }

  const timeLabels = useMemo(() => {
    const labels: string[] = []
    for (let i = 0; i < TOTAL_SLOTS; i += 2) {
      labels.push(slotIndexToTime(i))
    }
    return labels
  }, [])

  return (
    <div>
      <h2 className="page-title">日历视图</h2>

      <div className="card">
        <div className="week-nav">
          <button onClick={prevWeek}>← 上一周</button>
          <div className="week-title">
            {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
          </div>
          <button onClick={nextWeek}>下一周 →</button>
        </div>

        <div className="calendar-container">
          <div
            className="calendar-grid"
            style={{
              gridTemplateColumns: `60px repeat(${STATIONS.length}, 1fr)`,
            }}
          >
            <div></div>
            {STATIONS.map((station) => (
              <div key={station} className="station-header">
                {station}
              </div>
            ))}

            {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
              <>
                <div key={`time-${slotIndex}`} className="time-label">
                  {slotIndex % 2 === 0 ? slotIndexToTime(slotIndex) : ''}
                </div>
                {STATIONS.map((station) => {
                  const dateStr = formatDate(weekDates[0])
                  const slotInfo = getSlotInfo(station, dateStr, slotIndex)
                  const isStart = isBookingStart(station, dateStr, slotIndex)
                  const duration = getBookingDuration(
                    station,
                    dateStr,
                    slotIndex
                  )

                  return (
                    <div
                      key={`${station}-${slotIndex}`}
                      className="calendar-cell"
                      onClick={() =>
                        handleSlotClick(station, dateStr, slotIndex)
                      }
                    >
                      {slotInfo.occupied && isStart ? (
                        <div
                          className="time-slot occupied"
                          style={{
                            height: `${duration * 30}px`,
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          <span className="time-slot-label">
                            {slotInfo.booker?.charAt(0)}
                          </span>
                        </div>
                      ) : !slotInfo.occupied ? (
                        <div className="time-slot available"></div>
                      ) : null}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                background: 'rgba(34, 197, 94, 0.3)',
                borderRadius: '4px',
              }}
            ></div>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>空闲</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                background: 'rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
              }}
            ></div>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>已占用</span>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <QuickBookingModal
          stationId={selectedSlot.stationId}
          date={selectedSlot.date}
          startTime={selectedSlot.startTime}
          endTime={selectedSlot.endTime}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => {
            setSelectedSlot(null)
            fetchBookings()
          }}
        />
      )}
    </div>
  )
}

export default CalendarView
