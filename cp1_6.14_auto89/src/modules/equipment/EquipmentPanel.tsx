import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Equipment } from '../../types'

interface BorrowModalProps {
  equipment: Equipment
  onClose: () => void
  onSuccess: () => void
}

function BorrowModal({ equipment, onClose, onSuccess }: BorrowModalProps) {
  const [bookingId, setBookingId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [borrowerName, setBorrowerName] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [expectedReturnTime, setExpectedReturnTime] = useState('')
  const [localError, setLocalError] = useState('')
  const [bookingValid, setBookingValid] = useState<boolean | null>(null)

  const borrowEquipment = useAppStore((state) => state.borrowEquipment)
  const bookings = useAppStore((state) => state.bookings)
  const fetchBookings = useAppStore((state) => state.fetchBookings)
  const loading = useAppStore((state) => state.loading)

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    if (bookingId.trim()) {
      const booking = bookings.find((b) => b.id === bookingId.trim())
      setBookingValid(!!booking)
      if (booking) {
        setBorrowerName(booking.bookerName)
      }
    } else {
      setBookingValid(null)
    }
  }, [bookingId, bookings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!bookingId.trim()) {
      setLocalError('请输入预约编号')
      return
    }

    if (!bookingValid) {
      setLocalError('预约编号无效，请先创建有效预约')
      return
    }

    if (quantity < 1 || quantity > equipment.availableStock) {
      setLocalError(`借用数量必须在 1 到 ${equipment.availableStock} 之间`)
      return
    }

    if (!borrowerName.trim()) {
      setLocalError('请输入借用人姓名')
      return
    }

    if (!expectedReturnDate || !expectedReturnTime) {
      setLocalError('请选择预计归还时间')
      return
    }

    const expectedReturnDateTime = `${expectedReturnDate}T${expectedReturnTime}:00`

    try {
      await borrowEquipment({
        equipmentId: equipment.id,
        bookingId: bookingId.trim(),
        quantity,
        borrowerName: borrowerName.trim(),
        expectedReturnTime: expectedReturnDateTime,
      })
      onSuccess()
    } catch (err: any) {
      setLocalError(err.message || '借用失败')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>借用 {equipment.icon} {equipment.name}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.7)' }}>
          <p>可用库存：<span style={{ color: '#22c55e', fontWeight: 600 }}>{equipment.availableStock}</span> / {equipment.totalStock}</p>
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>预约编号 *</label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="请输入预约编号（必须先有有效预约）"
              style={{
                borderColor: bookingValid === true ? '#22c55e' : 
                            bookingValid === false ? '#ef4444' : undefined,
              }}
            />
            {bookingValid === true && (
              <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                ✓ 预约有效
              </p>
            )}
            {bookingValid === false && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                ✗ 未找到该预约
              </p>
            )}
          </div>

          <div className="form-group">
            <label>借用数量</label>
            <input
              type="number"
              min={1}
              max={equipment.availableStock}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), equipment.availableStock))}
            />
          </div>

          <div className="form-group">
            <label>借用人姓名</label>
            <input
              type="text"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="请输入借用人姓名"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>预计归还日期</label>
              <input
                type="date"
                value={expectedReturnDate}
                min={today}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>预计归还时间</label>
              <input
                type="time"
                value={expectedReturnTime}
                onChange={(e) => setExpectedReturnTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button type="submit" className="btn" disabled={loading || equipment.availableStock === 0}>
              {loading ? '提交中...' : '确认借用'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EquipmentPanel() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const equipment = useAppStore((state) => state.equipment)
  const fetchEquipment = useAppStore((state) => state.fetchEquipment)
  const loading = useAppStore((state) => state.loading)

  useEffect(() => {
    fetchEquipment()
  }, [fetchEquipment])

  const handleBorrowSuccess = () => {
    setSelectedEquipment(null)
    setSuccessMsg('借用成功！')
    setTimeout(() => setSuccessMsg(''), 3000)
    fetchEquipment()
  }

  return (
    <div>
      <h2 className="page-title">设备借用</h2>

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

      <div className="equipment-list">
        {equipment.map((item) => (
          <div key={item.id} className="equipment-card">
            <div className="equipment-icon">{item.icon}</div>
            <div className="equipment-name">{item.name}</div>
            <div className="equipment-stock">
              库存：
              <span className={item.availableStock > 0 ? 'available' : 'unavailable'}>
                {item.availableStock}
              </span>
              {' / '}
              {item.totalStock}
            </div>
            <button
              className="btn"
              style={{ width: '100%' }}
              onClick={() => setSelectedEquipment(item)}
              disabled={item.availableStock === 0 || loading}
            >
              {item.availableStock > 0 ? '借用' : '暂无库存'}
            </button>
          </div>
        ))}
      </div>

      {selectedEquipment && (
        <BorrowModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onSuccess={handleBorrowSuccess}
        />
      )}
    </div>
  )
}

export default EquipmentPanel
