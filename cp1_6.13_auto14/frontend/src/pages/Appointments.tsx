import React, { useEffect, useState } from 'react';
import { Appointment } from '../types';
import { fetchAppointments, deleteAppointment } from '../stores/apiStore';
import './Appointments.css';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定要取消这个预约吗？')) return;

    setDeletingId(id);

    setTimeout(async () => {
      try {
        await deleteAppointment(id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
      } catch (error) {
        alert('取消预约失败，请重试');
      } finally {
        setDeletingId(null);
      }
    }, 350);
  };

  if (loading) {
    return <div className="appt-loading">加载中...</div>;
  }

  return (
    <div>
      <h1 className="appt-title">我的预约</h1>
      <p className="appt-subtitle">查看和管理你的所有预约记录</p>

      {appointments.length === 0 ? (
        <div className="appt-empty">
          <p className="appt-empty-text">还没有预约记录，快去预约一家美容店吧</p>
        </div>
      ) : (
        <div className="appt-list">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`appt-card ${deletingId === appointment.id ? 'appt-card-deleting' : ''}`}
            >
              <div className="appt-card-header">
                <h3 className="appt-shop-name">{appointment.shop_name}</h3>
                <span className="appt-service">{appointment.service_name}</span>
              </div>
              <div className="appt-card-body">
                <div className="appt-info">
                  <div className="appt-info-item">
                    <span className="appt-info-label">时间：</span>
                    <span className="appt-info-value">
                      {appointment.date} {appointment.time}
                    </span>
                  </div>
                  <div className="appt-info-item">
                    <span className="appt-info-label">宠物：</span>
                    <span className="appt-info-value">{appointment.pet_name}</span>
                  </div>
                </div>
                <button
                  className="appt-cancel-btn"
                  onClick={() => handleCancel(appointment.id)}
                  disabled={deletingId === appointment.id}
                >
                  {deletingId === appointment.id ? '取消中...' : '取消预约'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
