import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function CartSidebar() {
  const { cartOpen, cart, setCartOpen, updateCartQuantity, removeFromCart, submitOrder, token } = useStore()
  const navigate = useNavigate()

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const handleCheckout = async () => {
    if (!token) {
      navigate('/login')
      return
    }
    const order = await submitOrder()
    if (order) {
      navigate(`/order/${order.id}`)
    }
  }

  if (!cartOpen) return null

  return (
    <>
      <div style={styles.overlay} onClick={() => setCartOpen(false)} />
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h3 style={styles.title}>购物车</h3>
          <button style={styles.closeBtn} onClick={() => setCartOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={styles.content}>
          {cart.length === 0 ? (
            <div style={styles.empty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p style={styles.emptyText}>购物车是空的</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.concertId}-${item.ticketType}`} style={styles.item}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.concertName}</div>
                  <div style={styles.itemType}>
                    {item.ticketType === 'normal' ? '普通票' : 'VIP票（含签名海报）'}
                  </div>
                  <div style={styles.itemPrice}>¥{item.unitPrice}</div>
                </div>
                <div style={styles.itemActions}>
                  <div style={styles.quantityControl}>
                    <button
                      style={styles.quantityBtn}
                      onClick={() => updateCartQuantity(item.concertId, item.ticketType, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span style={styles.quantityNum}>{item.quantity}</span>
                    <button
                      style={styles.quantityBtn}
                      onClick={() => updateCartQuantity(item.concertId, item.ticketType, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => removeFromCart(item.concertId, item.ticketType)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>合计</span>
              <span style={styles.totalPrice}>¥{total}</span>
            </div>
            <button className="btn btn-primary" style={styles.checkoutBtn} onClick={handleCheckout}>
              {token ? '提交订单' : '登录后结算'}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    animation: 'fadeIn 0.3s ease-out'
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 380,
    height: '100%',
    background: 'white',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease-out',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-color)'
  },
  closeBtn: {
    background: 'none',
    color: 'var(--text-light)',
    padding: 4,
    transition: 'var(--transition-fast)'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 16
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px'
  },
  emptyText: {
    color: 'var(--text-light)',
    fontSize: 14,
    marginTop: 12
  },
  item: {
    padding: 16,
    background: 'var(--bg-color)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 12
  },
  itemInfo: {
    marginBottom: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-color)',
    marginBottom: 4
  },
  itemType: {
    fontSize: 12,
    color: 'var(--text-light)',
    marginBottom: 6
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--primary-color)'
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--secondary-color)',
    color: 'var(--dark-color)',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s ease-out',
    fontWeight: 500
  },
  quantityNum: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 500
  },
  removeBtn: {
    background: 'none',
    color: 'var(--error-color)',
    fontSize: 12,
    padding: '4px 8px'
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid #eee',
    background: 'white'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  totalLabel: {
    fontSize: 14,
    color: 'var(--text-light)'
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--primary-color)'
  },
  checkoutBtn: {
    padding: '14px',
    fontSize: 15,
    fontWeight: 600
  }
}
