import { useState, useCallback } from 'react';
import type { Appointment } from '../types';
import { useSalonStore } from '../store/useSalonStore';
import './AppointmentCard.css';

interface AppointmentCardProps {
  appointment: Appointment;
}

const statusMap = {
  pending: { label: '待服务', class: 'status-pending' },
  completed: { label: '已完成', class: 'status-completed' },
  cancelled: { label: '已取消', class: 'status-cancelled' }
};

function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { cancelAppointment, getCustomerHistory } = useSalonStore();

  const handleToggle = useCallback(async () => {
    if (!expanded && !history.length) {
      setLoadingHistory(true);
      const customerHistory = await getCustomerHistory(appointment.phone);
      const filteredHistory = customerHistory.filter((h) => h.id !== appointment.id);
      setHistory(filteredHistory);
      setLoadingHistory(false);
    }
    setExpanded(!expanded);
  }, [expanded, history.length, appointment.phone, appointment.id, getCustomerHistory]);

  const handleCancel = useCallback(async () => {
    if (window.confirm('确定要取消这个预约吗？')) {
      await cancelAppointment(appointment.id);
    }
  }, [appointment.id, cancelAppointment]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const statusInfo = statusMap[appointment.status];

  return (
    <div className={`appointment-card ${appointment.status}`}>
      <div className="card-header" onClick={handleToggle}>
        <div className="card-main">
          <div className="card-title-row">
            <h3 className="customer-name">{appointment.name}</h3>
            <span className={`status-badge ${statusInfo.class}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="card-details">
            <div className="detail-item">
              <span className="detail-icon">✂️</span>
              <span className="detail-text">{appointment.service}</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">📅</span>
              <span className="detail-text">{formatDate(appointment.date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">⏰</span>
              <span className="detail-text">{appointment.time}</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">📱</span>
              <span className="detail-text">{appointment.phone}</span>
            </div>
          </div>
        </div>
        <div className={`expand-icon ${expanded ? 'expanded' : ''}`}>
          {loadingHistory ? '⏳' : expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div className="card-expandable">
          <div className="history-section">
            <h4 className="history-title">客户历史记录</h4>
            {loadingHistory ? (
              <div className="history-loading">加载中...</div>
            ) : history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-service">{item.service}</div>
                    <div className="history-date">{formatDate(item.date)} {item.time}</div>
                    <span className={`history-status ${statusMap[item.status].class}`}>
                      {statusMap[item.status].label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="history-empty">暂无历史记录</div>
            )}
          </div>

          {appointment.status === 'pending' && (
            <div className="card-actions">
              <button
                className="cancel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
              >
                取消预约
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AppointmentCard;
