import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store'

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrder, payOrder, loading, error } = useStore()
  const [timeLeft, setTimeLeft] = useState({ minutes: 15, seconds: 0 })
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (id) {
      fetchOrder(id)
    }
  }, [id])

  useEffect(() => {
    if (!currentOrder || currentOrder.status !== 'pending') return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiresAt = new Date(currentOrder.expiresAt).getTime()
      const diff = expiresAt - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft({ minutes: 0, seconds: 0 })
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ minutes, seconds })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [currentOrder])

  const handlePay = async () => {
    if (id) {
      await payOrder(id)
    }
  }

  if (loading && !currentOrder) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ padding: '40px 20px' }}>
          <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p>订单不存在</p>
          <Link to="/concerts" style={{ color: 'var(--primary-color)' }}>返回演出列表</Link>
        </div>
      </div>
    )
  }

  const isUrgent = timeLeft.minutes < 3
  const ticketTypeText = currentOrder.ticketType === 'normal' ? '普通票' : 'VIP票'

  return (
    <div style={styles.page}>
      <div className="container" style={{ padding: '40px 20px 120px', maxWidth: 500 }}>
        {error && <div className="error-banner">{error}</div>}

        <div style={styles.card}>
          <div style={styles.statusHeader}>
            {currentOrder.status === 'paid' ? (
              <>
                <div style={styles.successIcon}>✓</div>
                <h1 style={styles.statusTitle}>订单支付成功</h1>
              </>
            ) : isExpired ? (
              <>
                <div style={{ ...styles.successIcon, background: 'var(--error-color)' }}>✕</div>
                <h1 style={styles.statusTitle}>订单已过期</h1>
              </>
            ) : (
              <>
                <div style={{ ...styles.successIcon, background: 'var(--primary-color)' }}>⏱</div>
                <h1 style={styles.statusTitle}>等待支付</h1>
              </>
            )}
          </div>

          <div style={styles.orderNoRow}>
            <span style={styles.orderNoLabel}>订单编号</span>
            <span style={styles.orderNo}>{currentOrder.id}</span>
          </div>

          <div style={styles.divider} />

          <div style={styles.infoSection}>
            <h3 style={styles.sectionTitle}>订单信息</h3>
            
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>演出名称</span>
              <span style={styles.infoValue}>{currentOrder.concertName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>票种</span>
              <span style={styles.infoValue}>
                {ticketTypeText}
                {currentOrder.ticketType === 'vip' && '（含签名海报）'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>数量</span>
              <span style={styles.infoValue}>{currentOrder.quantity} 张</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>订单金额</span>
              <span style={{ ...styles.infoValue, color: 'var(--primary-color)', fontWeight: 700 }}>
                ¥{currentOrder.totalPrice}
              </span>
            </div>
          </div>

          {currentOrder.status === 'pending' && !isExpired && (
            <div style={styles.countdownSection}>
              <p style={styles.countdownLabel}>支付剩余时间</p>
              <div style={{
                ...styles.countdownTime,
                color: isUrgent ? 'var(--error-color)' : 'var(--text-color)'
              }}>
                <span style={styles.countdownNum}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span style={styles.countdownColon}>:</span>
                <span style={styles.countdownNum}>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
              <p style={styles.countdownHint}>
                请在倒计时结束前完成支付，超时订单将自动取消
              </p>
            </div>
          )}

          {currentOrder.status === 'pending' && !isExpired && (
            <button
              style={styles.payBtn}
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? '处理中...' : '立即支付'}
            </button>
          )}

          {currentOrder.status === 'paid' && (
            <button style={styles.backBtn2} onClick={() => navigate('/')}>
              返回首页
            </button>
          )}

          {isExpired && (
            <button style={styles.backBtn2} onClick={() => navigate('/concerts')}>
              重新选择演出
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    display: 'flex',
    justifyContent: 'center'
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  statusHeader: {
    textAlign: 'center',
    marginBottom: 24
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--success-color)',
    color: 'white',
    fontSize: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--dark-color)'
  },
  orderNoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-color)',
    borderRadius: 8,
    marginBottom: 20
  },
  orderNoLabel: {
    fontSize: 13,
    color: 'var(--text-light)'
  },
  orderNo: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: 'var(--text-color)'
  },
  divider: {
    height: 1,
    background: '#f0f0f0',
    marginBottom: 20
  },
  infoSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--dark-color)',
    marginBottom: 16
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f8f8f8'
  },
  infoLabel: {
    fontSize: 14,
    color: 'var(--text-light)'
  },
  infoValue: {
    fontSize: 14,
    color: 'var(--text-color)',
    textAlign: 'right',
    maxWidth: '60%'
  },
  countdownSection: {
    textAlign: 'center',
    padding: '20px',
    background: 'var(--bg-color)',
    borderRadius: 12,
    marginBottom: 24
  },
  countdownLabel: {
    fontSize: 13,
    color: 'var(--text-light)',
    marginBottom: 8
  },
  countdownTime: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  countdownNum: {
    minWidth: 45,
    textAlign: 'center',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  },
  countdownColon: {
    margin: '0 4px',
    fontWeight: 700
  },
  countdownHint: {
    fontSize: 12,
    color: 'var(--text-light)'
  },
  payBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    transition: 'filter 0.2s ease-out'
  },
  backBtn2: {
    width: '100%',
    padding: '14px',
    background: 'var(--secondary-color)',
    color: 'var(--text-color)',
    fontSize: 15,
    fontWeight: 500,
    borderRadius: 8,
    transition: 'background 0.2s ease-out'
  }
}
