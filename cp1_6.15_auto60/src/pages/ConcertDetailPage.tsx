import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { concerts, fetchConcerts, addToCart, loading, error, token } = useStore()
  const [ticketType, setTicketType] = useState<'normal' | 'vip'>('normal')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (concerts.length === 0) {
      fetchConcerts()
    }
  }, [])

  const concert = concerts.find(c => c.id === id)

  useEffect(() => {
    if (concert && token === null) {
    }
  }, [concert, token])

  const handleAddToCart = () => {
    if (!token) {
      navigate('/login')
      return
    }
    if (concert) {
      addToCart(concert, ticketType, quantity)
    }
  }

  const decreaseQty = () => {
    if (quantity > 1) setQuantity(quantity - 1)
  }

  const increaseQty = () => {
    const maxStock = ticketType === 'normal' ? concert?.stock || 0 : concert?.vipStock || 0
    if (quantity < maxStock) setQuantity(quantity + 1)
  }

  if (loading && !concert) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ paddingBottom: 100 }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 16, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: '40%' }} />
        </div>
      </div>
    )
  }

  if (!concert) {
    return (
      <div style={styles.page}>
        <div className="container" style={{ padding: '40px 20px' }}>
          <p>演出不存在</p>
          <button onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    )
  }

  const date = new Date(concert.dateTime)
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  const formattedTime = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const unitPrice = ticketType === 'normal' ? concert.price : concert.vipPrice
  const totalPrice = unitPrice * quantity

  return (
    <div style={styles.page}>
      <div className="container" style={{ paddingBottom: 100 }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          ← 返回
        </button>

        {error && <div className="error-banner">{error}</div>}

        <div style={styles.detailCard}>
          <div style={styles.banner}>
            <div style={styles.bannerOverlay}>
              <h1 style={styles.title}>{concert.description}</h1>
              <div style={styles.subtitle}>
                <span>🎤 {concert.city}</span>
              </div>
            </div>
          </div>

          <div style={styles.content}>
            <div style={styles.infoSection}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>📍 场地</span>
                <span style={styles.infoValue}>{concert.venue}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>📅 日期</span>
                <span style={styles.infoValue}>{formattedDate}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>🕐 时间</span>
                <span style={styles.infoValue}>{formattedTime}</span>
              </div>
            </div>

            <div style={styles.ticketSection}>
              <h3 style={styles.sectionTitle}>选择票种</h3>
              
              <div style={styles.ticketOptions}>
                <div
                  style={{
                    ...styles.ticketOption,
                    borderColor: ticketType === 'normal' ? 'var(--primary-color)' : 'transparent',
                    background: ticketType === 'normal' ? 'rgba(192,133,82,0.08)' : 'var(--bg-color)'
                  }}
                  onClick={() => setTicketType('normal')}
                >
                  <div style={styles.ticketOptionHeader}>
                    <span style={styles.ticketName}>普通票</span>
                    <span style={styles.ticketPrice}>¥{concert.price}</span>
                  </div>
                  <p style={styles.ticketDesc}>标准入场观看演出</p>
                  <p style={styles.ticketStock}>剩余 {concert.stock} 张</p>
                </div>

                <div
                  style={{
                    ...styles.ticketOption,
                    borderColor: ticketType === 'vip' ? 'var(--primary-color)' : 'transparent',
                    background: ticketType === 'vip' ? 'rgba(192,133,82,0.08)' : 'var(--bg-color)'
                  }}
                  onClick={() => setTicketType('vip')}
                >
                  <div style={styles.ticketOptionHeader}>
                    <span style={styles.ticketName}>VIP票 <span style={styles.vipBadge}>VIP</span></span>
                    <span style={styles.ticketPrice}>¥{concert.vipPrice}</span>
                  </div>
                  <p style={styles.ticketDesc}>优先入场 + 签名海报</p>
                  <p style={styles.ticketStock}>剩余 {concert.vipStock} 张</p>
                </div>
              </div>
            </div>

            <div style={styles.quantitySection}>
              <h3 style={styles.sectionTitle}>购买数量</h3>
              <div style={styles.quantityControl}>
                <button
                  style={styles.quantityBtn}
                  onClick={decreaseQty}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span style={styles.quantityNum}>{quantity}</span>
                <button
                  style={styles.quantityBtn}
                  onClick={increaseQty}
                  disabled={
                    ticketType === 'normal'
                      ? quantity >= concert.stock
                      : quantity >= concert.vipStock
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div style={styles.summary}>
              <div style={styles.summaryRow}>
                <span>单价</span>
                <span>¥{unitPrice}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>数量</span>
                <span>× {quantity}</span>
              </div>
              <div style={styles.summaryTotal}>
                <span>合计</span>
                <span style={styles.totalPrice}>¥{totalPrice}</span>
              </div>
            </div>

            <button style={styles.buyBtn} onClick={handleAddToCart}>
              加入购物车
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .quantity-btn:active {
          transform: scale(0.9);
        }
        .quantity-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .buy-btn:hover {
          filter: brightness(1.1);
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
  backBtn: {
    background: 'none',
    color: 'var(--text-light)',
    fontSize: 14,
    marginBottom: 24,
    padding: '8px 0'
  },
  detailCard: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  banner: {
    height: 200,
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    position: 'relative'
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    color: 'white'
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9
  },
  content: {
    padding: 24
  },
  infoSection: {
    marginBottom: 28
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f5'
  },
  infoLabel: {
    fontSize: 14,
    color: 'var(--text-light)'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-color)'
  },
  ticketSection: {
    marginBottom: 28
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--dark-color)',
    marginBottom: 16
  },
  ticketOptions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  ticketOption: {
    padding: 16,
    borderRadius: 12,
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  ticketOptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ticketName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-color)'
  },
  vipBadge: {
    fontSize: 10,
    background: 'var(--primary-color)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: 4,
    fontWeight: 600
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--primary-color)'
  },
  ticketDesc: {
    fontSize: 12,
    color: 'var(--text-light)',
    marginBottom: 6
  },
  ticketStock: {
    fontSize: 12,
    color: 'var(--text-light)'
  },
  quantitySection: {
    marginBottom: 28
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--secondary-color)',
    color: 'var(--dark-color)',
    fontSize: 20,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s ease-out'
  },
  quantityNum: {
    fontSize: 18,
    fontWeight: 600,
    minWidth: 32,
    textAlign: 'center'
  },
  summary: {
    background: 'var(--bg-color)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: 'var(--text-light)',
    marginBottom: 8
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-color)',
    paddingTop: 12,
    borderTop: '1px dashed #ddd'
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--primary-color)'
  },
  buyBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    transition: 'filter 0.2s ease-out'
  }
}
