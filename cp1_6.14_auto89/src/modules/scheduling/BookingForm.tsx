import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'

interface BookingFormProps {
  prefilledStation?: string
  prefilledDate?: string
  prefilledStartTime?: string
  prefilledEndTime?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const STATIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
    if (h < 22) {
      slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function BookingForm({
  prefilledStation,
  prefilledDate,
  prefilledStartTime,
  prefilledEndTime,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const [stationId, setStationId] = useState(prefilledStation || '')
  const [date, setDate] = useState(prefilledDate || '')
  const [startTime, setStartTime] = useState(prefilledStartTime || '')
  const [endTime, setEndTime] = useState(prefilledEndTime || '')
  const [bookerName, setBookerName] = useState('')
  const [projectNote, setProjectNote] = useState('')
  const [localError, setLocalError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const createBooking = useAppStore((state) => state.createBooking)
  const fetchBookings = useAppStore((state) => state.fetchBookings)
  const loading = useAppStore((state) => state.loading)

  useEffect(() => {
    if (date) {
      fetchBookings({ date })
    }
  }, [date, fetchBookings])

  const validateForm = (): boolean => {
    if (!stationId) {
      setLocalError('请选择工位')
      return false
    }
    if (!date) {
      setLocalError('请选择日期')
      return false
    }
    if (!startTime || !endTime) {
      setLocalError('请选择起止时间')
      return false
    }
    if (startTime >= endTime) {
      setLocalError('结束时间必须晚于开始时间')
      return false
    }
    if (!bookerName.trim()) {
      setLocalError('请填写预约人姓名')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMsg('')

    if (!validateForm()) {
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
      setSuccessMsg('预约成功！')
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500)
      }
      if (!onSuccess) {
        setBookerName('')
        setProjectNote('')
      }
    } catch (err: any) {
      setLocalError(err.message || '预约失败')
    }
  }

  const endTimeOptions = TIME_SLOTS.filter((t) => startTime && t > startTime)

  return (
    <div>
      <h2 className="page-title">工位预约</h2>

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
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="success-alert">
          {successMsg}
          <button
            onClick={() => setSuccessMsg('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>选择工位</label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              disabled={!!prefilledStation}
            >
              <option value="">请选择工位</option>
              {STATIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0)}区 {s.charAt(1)}号工位
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>选择日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!!prefilledDate}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>开始时间</label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  if (endTime && e.target.value >= endTime) {
                    setEndTime('')
                  }
                }}
                disabled={!!prefilledStartTime}
              >
                <option value="">选择开始时间</option>
                {TIME_SLOTS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>结束时间</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!!prefilledEndTime || !startTime}
              >
                <option value="">选择结束时间</option>
                {endTimeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>预约人姓名</label>
            <input
              type="text"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              placeholder="请输入您的姓名"
            />
          </div>

          <div className="form-group">
            <label>项目备注</label>
            <textarea
              value={projectNote}
              onChange={(e) => setProjectNote(e.target.value)}
              placeholder="请输入项目备注（选填）"
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {onCancel && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
              >
                取消
              </button>
            )}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? '提交中...' : '提交预约'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BookingForm
