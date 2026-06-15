import React, { useState } from 'react'
import { useAppStore } from '../store'
import { orderManager } from '../OrderManager'

interface OrderFormProps {
  onSubmitSuccess: () => void
}

export const OrderForm: React.FC<OrderFormProps> = ({ onSubmitSuccess }) => {
  const { 
    customerInfo, 
    setCustomerInfo, 
    submitOrder, 
    isSubmitting,
    selectedProduct,
    currentCustomization,
    previewImages,
    resetForm
  } = useAppStore()

  const [errors, setErrors] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const handleInputChange = (field: keyof typeof customerInfo, value: string) => {
    setCustomerInfo({ [field]: value })
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = orderManager.validateCustomerInfo(customerInfo)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    if (!selectedProduct) {
      setErrors(['请先选择产品'])
      return
    }

    if (previewImages.length === 0) {
      setErrors(['请至少生成一张预览图'])
      return
    }

    const order = await submitOrder()
    if (order) {
      alert(`订单提交成功！\n订单号：${order.id}\n总价：¥${order.totalPrice}`)
      resetForm()
      setNotes('')
      onSubmitSuccess()
    } else {
      setErrors(['订单提交失败，请稍后重试'])
    }
  }

  const totalPrice = selectedProduct 
    ? orderManager.calculateTotalPrice(selectedProduct.basePrice, currentCustomization)
    : 0

  return (
    <div className="order-form-container">
      <h3 className="section-title">填写订单信息</h3>
      
      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((error, index) => (
            <p key={index} className="error-message">{error}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-group">
          <label htmlFor="name">收货人姓名</label>
          <input
            type="text"
            id="name"
            value={customerInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="请输入姓名"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">联系电话</label>
          <input
            type="tel"
            id="phone"
            value={customerInfo.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="请输入手机号码"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">邮箱地址</label>
          <input
            type="email"
            id="email"
            value={customerInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="请输入邮箱"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">收货地址</label>
          <input
            type="text"
            id="address"
            value={customerInfo.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="请输入详细地址"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">备注信息（可选）</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="如有特殊要求请在此说明"
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-summary">
          <div className="summary-item">
            <span>预览图：</span>
            <span>{previewImages.length} 张</span>
          </div>
          <div className="summary-item total">
            <span>订单总价：</span>
            <span className="total-price">¥{totalPrice}</span>
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? '提交中...' : '提交订单'}
        </button>
      </form>
    </div>
  )
}
