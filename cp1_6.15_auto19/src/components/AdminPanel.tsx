import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import type { Order, OrderStatus } from '../types'

const statusLabels: Record<OrderStatus, string> = {
  pending: '待确认',
  producing: '制作中',
  completed: '已完成'
}

const statusColors: Record<OrderStatus, string> = {
  pending: '#e6a23c',
  producing: '#409eff',
  completed: '#67c23a'
}

export const AdminPanel: React.FC = () => {
  const { orders, fetchOrders, updateOrderStatus } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (confirm(`确定要将订单状态改为"${statusLabels[newStatus]}"吗？`)) {
      await updateOrderStatus(orderId, newStatus)
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2 className="section-title">订单管理</h2>
        <div className="status-filters">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            全部 ({orders.length})
          </button>
          {(['pending', 'producing', 'completed'] as OrderStatus[]).map((status) => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {statusLabels[status]} ({orders.filter(o => o.status === status).length})
            </button>
          ))}
        </div>
      </div>

      <div className="admin-content">
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>产品</th>
                <th>客户</th>
                <th>金额</th>
                <th>状态</th>
                <th>下单时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-row">暂无订单数据</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="order-row">
                    <td className="order-id">{order.id.slice(0, 8)}...</td>
                    <td className="order-product">{order.productName}</td>
                    <td className="order-customer">{order.customerInfo.name}</td>
                    <td className="order-price">¥{order.totalPrice}</td>
                    <td className="order-status">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: statusColors[order.status] }}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="order-date">{formatDate(order.createdAt)}</td>
                    <td className="order-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => setSelectedOrder(order)}
                      >
                        查看
                      </button>
                      {order.status !== 'completed' && (
                        <button
                          className="action-btn next-btn"
                          onClick={() => {
                            const nextStatus = order.status === 'pending' ? 'producing' : 'completed'
                            handleStatusChange(order.id, nextStatus)
                          }}
                        >
                          {order.status === 'pending' ? '开始制作' : '完成制作'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedOrder && (
          <div className="order-detail-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>订单详情</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedOrder(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="detail-section">
                  <h4>基本信息</h4>
                  <p><strong>订单号：</strong>{selectedOrder.id}</p>
                  <p><strong>产品：</strong>{selectedOrder.productName}</p>
                  <p><strong>总价：</strong>¥{selectedOrder.totalPrice}</p>
                  <p><strong>状态：</strong>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: statusColors[selectedOrder.status] }}
                    >
                      {statusLabels[selectedOrder.status]}
                    </span>
                  </p>
                  <p><strong>下单时间：</strong>{formatDate(selectedOrder.createdAt)}</p>
                </div>

                <div className="detail-section">
                  <h4>定制信息</h4>
                  <p><strong>皮料：</strong>{selectedOrder.customization.leather.name}</p>
                  <p><strong>缝线：</strong>{selectedOrder.customization.stitch.name}</p>
                  <p><strong>五金：</strong>{selectedOrder.customization.hardware.name}</p>
                </div>

                <div className="detail-section">
                  <h4>客户信息</h4>
                  <p><strong>姓名：</strong>{selectedOrder.customerInfo.name}</p>
                  <p><strong>电话：</strong>{selectedOrder.customerInfo.phone}</p>
                  <p><strong>邮箱：</strong>{selectedOrder.customerInfo.email}</p>
                  <p><strong>地址：</strong>{selectedOrder.customerInfo.address}</p>
                </div>

                {selectedOrder.previewImages.length > 0 && (
                  <div className="detail-section">
                    <h4>预览图</h4>
                    <div className="preview-images">
                      {selectedOrder.previewImages.map((img, idx) => (
                        <img key={idx} src={img.dataUrl} alt={`预览${idx + 1}`} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.notes && (
                  <div className="detail-section">
                    <h4>备注</h4>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {selectedOrder.status !== 'completed' && (
                  <button
                    className="submit-btn"
                    onClick={() => {
                      const nextStatus = selectedOrder.status === 'pending' ? 'producing' : 'completed'
                      handleStatusChange(selectedOrder.id, nextStatus)
                    }}
                  >
                    {selectedOrder.status === 'pending' ? '开始制作' : '完成制作'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
