import React from 'react';
import { Order, OrderStatus } from '../types';
import './OrderList.css';

interface OrderListProps {
  orders: Order[];
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: '待取货',
  in_use: '使用中',
  returned: '已归还'
};

const OrderList: React.FC<OrderListProps> = ({ orders, onUpdateStatus }) => {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inUseOrders = orders.filter(o => o.status === 'in_use');
  const returnedOrders = orders.filter(o => o.status === 'returned');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const renderOrderCard = (order: Order) => (
    <div key={order.id} className={`order-card status-${order.status}`}>
      <div className="order-header">
        <span className="order-no">订单号: {order.orderNo}</span>
        <span className={`order-status status-${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      
      <div className="order-items">
        {order.items.map((item, index) => (
          <div key={index} className="order-item-bar">
            <span className="item-name">{item.productName}</span>
            <span className="item-period">
              {formatDate(item.startDate)} ~ {formatDate(item.endDate)} ({item.days}天)
            </span>
          </div>
        ))}
      </div>

      <div className="order-footer">
        <div className="order-total">
          总价: <span className="total-amount">¥{order.totalAmount}</span>
          {order.lateFee && order.lateFee > 0 && (
            <span className="late-fee"> (含超期费 ¥{order.lateFee})</span>
          )}
        </div>
        <div className="order-date">
          下单时间: {new Date(order.createdAt).toLocaleString('zh-CN')}
        </div>
      </div>

      {onUpdateStatus && order.status !== 'returned' && (
        <div className="order-actions">
          {order.status === 'pending' && (
            <button 
              className="action-btn primary"
              onClick={() => onUpdateStatus(order.id, 'in_use')}
            >
              确认取货
            </button>
          )}
          {order.status === 'in_use' && (
            <button 
              className="action-btn secondary"
              onClick={() => onUpdateStatus(order.id, 'returned')}
            >
              确认归还
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="order-list">
      {pendingOrders.length > 0 && (
        <div className="order-group">
          <h3 className="group-title">待取货 ({pendingOrders.length})</h3>
          {pendingOrders.map(renderOrderCard)}
        </div>
      )}

      {inUseOrders.length > 0 && (
        <div className="order-group">
          <h3 className="group-title">使用中 ({inUseOrders.length})</h3>
          {inUseOrders.map(renderOrderCard)}
        </div>
      )}

      {returnedOrders.length > 0 && (
        <div className="order-group">
          <h3 className="group-title">已归还 ({returnedOrders.length})</h3>
          {returnedOrders.map(renderOrderCard)}
        </div>
      )}

      {orders.length === 0 && (
        <div className="empty-orders">
          <p>暂无订单</p>
        </div>
      )}
    </div>
  );
};

export default OrderList;
