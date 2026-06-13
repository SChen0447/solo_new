/**
 * ShoppingCart.tsx - 购物车侧边栏组件
 *
 * 从 CartContext 读取购物车数据，展示商品列表、数量调整按钮和总价
 * 数据流向：CartContext -> 本组件读取状态 -> 渲染购物车列表
 * 调用 apiService：通过 CartContext 的 addToCart / removeFromCart / updateQuantity 间接调用
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
    opacity: 0,
    transition: 'opacity 0.3s',
    pointerEvents: 'none' as const,
  },
  overlayVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 400,
    background: '#fff',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1001,
    transform: 'translateX(100%)',
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
    background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 16,
  },
  emptyCart: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#999',
    fontSize: 16,
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  itemPrice: {
    fontSize: 14,
    color: '#e67e22',
    fontWeight: 600,
    marginTop: 4,
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, transform 0.1s',
    color: '#4caf50',
  },
  qtyNum: {
    fontSize: 15,
    fontWeight: 600,
    minWidth: 24,
    textAlign: 'center' as const,
    transition: 'transform 0.15s',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#e74c3c',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid #f0f0f0',
    background: '#fafafa',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e67e22',
  },
  checkoutBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 6,
    border: 'none',
    background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.15s, opacity 0.15s',
    animation: 'pulseBtn 2s ease-in-out infinite',
  },
};

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { items, total, products, removeFromCart, updateQuantity } = useCart();

  const getProduct = (productId: number) => products.find((p) => p.id === productId);

  const handleQuantityChange = (productId: number, delta: number) => {
    const item = items.find((i) => i.productId === productId);
    if (item) {
      updateQuantity(productId, item.quantity + delta);
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <style>{`
        @keyframes pulseBtn {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        @keyframes stepNum {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .qty-btn:hover { background: #f0f0f0; }
        .qty-btn:active { transform: scale(0.95); }
        .checkout-btn:hover { opacity: 0.9; }
        .checkout-btn:active { transform: scale(0.95); animation: none; }
        .cart-item-img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }

        @media (max-width: 768px) {
          .cart-sidebar {
            width: 100% !important;
          }
        }
      `}</style>

      <div
        style={{
          ...styles.overlay,
          ...(isOpen ? styles.overlayVisible : {}),
        }}
        onClick={onClose}
      />

      <div
        className="cart-sidebar"
        style={{
          ...styles.sidebar,
          ...(isOpen ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>🛒 购物车</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {items.length === 0 ? (
            <div style={styles.emptyCart}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🥬</div>
              <p>购物车空空如也</p>
              <p style={{ fontSize: 13, color: '#bbb' }}>快去挑选新鲜蔬果吧！</p>
            </div>
          ) : (
            items.map((item) => {
              const product = getProduct(item.productId);
              if (!product) return null;
              return (
                <div key={item.productId} style={styles.cartItem}>
                  <img className="cart-item-img" src={product.imageUrl} alt={product.name} />
                  <div style={styles.itemInfo}>
                    <p style={styles.itemName}>{product.name}</p>
                    <div style={styles.itemPrice}>
                      ¥{product.price.toFixed(1)} × {item.quantity}
                      <span style={{ marginLeft: 8, fontWeight: 700 }}>
                        = ¥{(product.price * item.quantity).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div style={styles.quantityControl}>
                    <button
                      className="qty-btn"
                      style={styles.qtyBtn}
                      onClick={() => handleQuantityChange(item.productId, -1)}
                    >
                      −
                    </button>
                    <span className="qty-num" style={styles.qtyNum}>{item.quantity}</span>
                    <button
                      className="qty-btn"
                      style={styles.qtyBtn}
                      onClick={() => handleQuantityChange(item.productId, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => removeFromCart(item.productId)}
                    title="移除"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>合计</span>
            <span style={styles.totalValue}>¥{total.toFixed(2)}</span>
          </div>
          <button
            className="checkout-btn"
            style={{
              ...styles.checkoutBtn,
              opacity: items.length === 0 ? 0.5 : 1,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={items.length === 0}
            onClick={handleCheckout}
          >
            去结算
          </button>
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;
