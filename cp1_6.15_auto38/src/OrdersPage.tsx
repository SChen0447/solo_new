import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrderStatus } from './api/books';
import type { Order } from './api/books';
import Button from './components/Button';
import './OrdersPage.css';

const STATUS_NAMES: Record<string, string> = {
  pending: '待付款',
  confirmed: '已确认',
  shipped: '已发货',
  completed: '已完成'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#e74c3c',
  confirmed: '#f39c12',
  shipped: '#3498db',
  completed: '#27ae60'
};

interface OrderRowProps {
  order: Order;
  onStatusChange: (orderId: string, status: string) => void;
  flashingOrderId: string | null;
}

function OrderRow({ order, onStatusChange, flashingOrderId }: OrderRowProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(order.id, e.target.value);
  };

  return (
    <tr className={flashingOrderId === order.id ? 'flash' : ''}>
      <td className="order-id">{order.id}</td>
      <td className="customer-name">{order.shippingInfo.name}</td>
      <td className="order-total">¥{order.total}</td>
      <td className="order-status">
        <span
          className="status-badge"
          style={{ backgroundColor: STATUS_COLORS[order.status] }}
        >
          {STATUS_NAMES[order.status]}
        </span>
      </td>
      <td className="status-actions">
        <select
          value={order.status}
          onChange={handleStatusChange}
          className="status-select"
        >
          <option value="pending">待付款</option>
          <option value="confirmed">已确认</option>
          <option value="shipped">已发货</option>
          <option value="completed">已完成</option>
        </select>
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashingOrderId, setFlashingOrderId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getOrders();
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: status as Order['status'] } : o
        )
      );
      
      setFlashingOrderId(orderId);
      setTimeout(() => setFlashingOrderId(null), 500);
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('更新订单状态失败，请稍后重试');
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <h1 className="orders-title">订单管理后台</h1>
          <p className="orders-subtitle">管理所有特装书预订订单</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{orders.length}</div>
          <div className="stat-label">总订单数</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">待处理</div>
        </div>
        <div className="stat-card stat-revenue">
          <div className="stat-value">¥{totalRevenue}</div>
          <div className="stat-label">总销售额</div>
        </div>
      </div>

      <div className="orders-table-wrapper">
        {loading ? (
          <div className="loading-state">
            <p>加载订单数据中...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>暂无订单数据</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>收货人</th>
                <th>订单金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  flashingOrderId={flashingOrderId}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
