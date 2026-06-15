import { useState } from 'react';
import { useCartStore } from './store/useCartStore';
import { submitOrder, EDITION_NAMES, calculateItemPrice } from './api/books';
import type { ShippingInfo, CartItem } from './api/books';
import Button from './components/Button';
import Input from './components/Input';
import './CartPanel.css';

interface OrderSuccessModalProps {
  orderId: string;
  estimatedDelivery: string;
  onClose: () => void;
}

function OrderSuccessModal({ orderId, estimatedDelivery, onClose }: OrderSuccessModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">✓</div>
        <h2 className="modal-title">预订成功！</h2>
        <p className="modal-text">
          您的订单号：<span className="highlight">{orderId}</span>
        </p>
        <p className="modal-text">
          预计发货时间：<span className="highlight">{estimatedDelivery}</span>
        </p>
        <p className="modal-text-muted">
          我们会通过短信通知您订单状态，请注意查收
        </p>
        <Button variant="primary" onClick={onClose} className="modal-btn">
          我知道了
        </Button>
      </div>
    </div>
  );
}

export default function CartPanel() {
  const { items, isCartOpen, closeCart, removeItem, updateQuantity, total, clearCart } = useCartStore();
  
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    address: ''
  });
  const [errors, setErrors] = useState<Partial<ShippingInfo>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ orderId: string; estimatedDelivery: string } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingInfo> = {};
    
    if (!shippingInfo.name.trim()) {
      newErrors.name = '请输入收货人姓名';
    }
    
    if (!shippingInfo.phone.trim()) {
      newErrors.phone = '请输入联系电话';
    } else if (!/^1[3-9]\d{9}$/.test(shippingInfo.phone)) {
      newErrors.phone = '请输入正确的手机号码';
    }
    
    if (!shippingInfo.address.trim()) {
      newErrors.address = '请输入收货地址';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const response = await submitOrder(items, shippingInfo, total);
      setSuccessModal({
        orderId: response.orderId,
        estimatedDelivery: response.estimatedDelivery
      });
      clearCart();
      setShowShippingForm(false);
      setShippingInfo({ name: '', phone: '', address: '' });
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('订单提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setSuccessModal(null);
    closeCart();
  };

  return (
    <>
      <div className={`cart-overlay ${isCartOpen ? 'visible' : ''}`} onClick={closeCart} />
      
      <div className={`cart-panel ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3 className="cart-title">预订购物车</h3>
          <button className="cart-close" onClick={closeCart}>×</button>
        </div>

        <div className="cart-content">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>购物车是空的</p>
              <p className="empty-hint">快去挑选心仪的特装书吧！</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {items.map((item: CartItem, index: number) => (
                  <div key={index} className="cart-item">
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="item-thumbnail"
                    />
                    <div className="item-info">
                      <h4 className="item-title">{item.book.title}</h4>
                      <p className="item-edition">版本：{EDITION_NAMES[item.edition]}</p>
                      {item.engraving && (
                        <p className="item-engraving">刻字：{item.engraving}</p>
                      )}
                      <p className="item-price">
                        ¥{calculateItemPrice(item.book.price, item.edition)} × {item.quantity}
                      </p>
                    </div>
                    <div className="item-actions">
                      <button
                        className="quantity-btn"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeItem(index)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {!showShippingForm ? (
                <div className="cart-footer">
                  <div className="total-row">
                    <span className="total-label">合计</span>
                    <span className="total-value">¥{total}</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setShowShippingForm(true)}
                    className="checkout-btn"
                  >
                    填写收货信息
                  </Button>
                </div>
              ) : (
                <div className="shipping-form">
                  <h4 className="form-title">收货信息</h4>
                  
                  <Input
                    label="收货人姓名"
                    value={shippingInfo.name}
                    onChange={value => setShippingInfo((prev: ShippingInfo) => ({ ...prev, name: value }))}
                    placeholder="请输入姓名"
                    error={errors.name}
                  />

                  <Input
                    label="联系电话"
                    value={shippingInfo.phone}
                    onChange={value => setShippingInfo((prev: ShippingInfo) => ({ ...prev, phone: value }))}
                    placeholder="请输入手机号码"
                    type="tel"
                    error={errors.phone}
                  />

                  <Input
                    label="收货地址"
                    value={shippingInfo.address}
                    onChange={value => setShippingInfo((prev: ShippingInfo) => ({ ...prev, address: value }))}
                    placeholder="请输入详细地址"
                    error={errors.address}
                  />

                  <div className="form-total">
                    <span className="total-label">订单总额</span>
                    <span className="total-value">¥{total}</span>
                  </div>

                  <div className="form-actions">
                    <Button
                      variant="secondary"
                      onClick={() => setShowShippingForm(false)}
                    >
                      返回
                    </Button>
                    <Button
                      variant="gold"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="submit-order-btn"
                    >
                      {submitting ? '提交中...' : '提交预订'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {successModal && (
        <OrderSuccessModal
          orderId={successModal.orderId}
          estimatedDelivery={successModal.estimatedDelivery}
          onClose={handleCloseSuccessModal}
        />
      )}
    </>
  );
}
