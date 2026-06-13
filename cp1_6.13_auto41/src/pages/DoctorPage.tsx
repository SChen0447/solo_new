import React, { useState, useEffect } from 'react';
import {
  getAppointments,
  getDoctors,
  updateAppointmentStatus,
  Appointment,
  Doctor,
} from '../api';

type TabType = 'pending' | 'history';
type ConfirmState = { [key: string]: boolean };

interface CancelDialogState {
  show: boolean;
  appointment: Appointment | null;
  shake: boolean;
}

const DoctorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmStates, setConfirmStates] = useState<ConfirmState>({});
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState>({
    show: false,
    appointment: null,
    shake: false,
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDoctorId]);

  const fetchDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
      if (data.length > 0) {
        setSelectedDoctorId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  const fetchAppointments = async () => {
    if (!selectedDoctorId) return;
    setLoading(true);
    try {
      const [pending, history] = await Promise.all([
        getAppointments(selectedDoctorId, '待确认'),
        getAppointments(selectedDoctorId, '已确认,已完成,已取消'),
      ]);
      const sortedPending = [...pending].sort((a, b) => {
        const dayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const aDay = dayOrder.indexOf(a.slot.split(' ')[0]);
        const bDay = dayOrder.indexOf(b.slot.split(' ')[0]);
        if (aDay !== bDay) return aDay - bDay;
        return a.slot.localeCompare(b.slot);
      });
      setPendingAppointments(sortedPending);
      setHistoryAppointments(history);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (appointment: Appointment) => {
    setConfirmStates((prev) => ({ ...prev, [appointment.id]: true }));

    try {
      await updateAppointmentStatus(appointment.id, '已完成');
      setTimeout(async () => {
        setPendingAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
        const updated = { ...appointment, status: '已完成' };
        setHistoryAppointments((prev) => [updated, ...prev]);
        setConfirmStates((prev) => {
          const next = { ...prev };
          delete next[appointment.id];
          return next;
        });
      }, 600);
    } catch (err) {
      console.error('Failed to confirm appointment:', err);
      setConfirmStates((prev) => {
        const next = { ...prev };
        delete next[appointment.id];
        return next;
      });
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setCancelDialog({
      show: true,
      appointment,
      shake: true,
    });
    setTimeout(() => {
      setCancelDialog((prev) => ({ ...prev, shake: false }));
    }, 500);
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog.appointment) return;

    try {
      await updateAppointmentStatus(cancelDialog.appointment.id, '已取消');
      const updated = { ...cancelDialog.appointment, status: '已取消' };
      setPendingAppointments((prev) =>
        prev.filter((a) => a.id !== cancelDialog.appointment!.id)
      );
      setHistoryAppointments((prev) => [updated, ...prev]);
      setCancelDialog({ show: false, appointment: null, shake: false });
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '待确认':
        return 'pending';
      case '已确认':
        return 'confirmed';
      case '已完成':
        return 'completed';
      case '已取消':
        return 'cancelled';
      default:
        return '';
    }
  };

  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const renderAppointmentCard = (apt: Appointment, showActions: boolean) => (
    <div className="appointment-card" key={apt.id}>
      <div className="appointment-header">
        <div className="appointment-patient">
          <div className="patient-avatar">{apt.patientName.charAt(0)}</div>
          <div className="patient-info">
            <h4>{apt.patientName}</h4>
            <div className="patient-phone">📞 {apt.phone}</div>
          </div>
        </div>
        <span className={`status-badge ${getStatusBadgeClass(apt.status)}`}>
          {apt.status}
        </span>
      </div>

      <div className="appointment-details">
        <div className="detail-item">
          <span className="detail-label">科室</span>
          <span className="detail-value">{apt.departmentName}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">医生</span>
          <span className="detail-value">
            {apt.doctorName} {apt.doctorTitle}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">预约时段</span>
          <span className="detail-value">📅 {apt.slot}</span>
        </div>
      </div>

      {apt.note && <div className="appointment-note">📝 {apt.note}</div>}

      {showActions && (
        <div className="appointment-actions">
          <button
            className={`action-btn confirm ${
              confirmStates[apt.id] ? 'confirmed' : ''
            }`}
            onClick={() => handleConfirm(apt)}
            disabled={!!confirmStates[apt.id]}
          >
            {confirmStates[apt.id] ? (
              <>
                <span className="check-icon">✓</span>
                <span>已确认</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>确认</span>
              </>
            )}
          </button>
          <button
            className="action-btn cancel"
            onClick={() => handleCancelClick(apt)}
            disabled={!!confirmStates[apt.id]}
          >
            <span>✕</span>
            <span>取消</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">医生预约管理</h1>
      <p className="page-subtitle">查看和管理您的患者预约记录</p>

      {doctors.length > 0 && (
        <div className="doctor-filter">
          <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-700)' }}>
            选择医生：
          </label>
          <select
            className="filter-select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} - {d.title}
              </option>
            ))}
          </select>
          {currentDoctor && (
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              当前查看：{currentDoctor.name} {currentDoctor.title}
            </span>
          )}
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>⏳</span>
            <span>待处理</span>
            <span className="tab-badge">{pendingAppointments.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>📋</span>
            <span>历史记录</span>
            <span className="tab-badge">{historyAppointments.length}</span>
          </button>
        </div>

        <div className="tabs-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
            </div>
          ) : activeTab === 'pending' ? (
            pendingAppointments.length > 0 ? (
              <div className="appointments-list">
                {pendingAppointments.map((apt) =>
                  renderAppointmentCard(apt, true)
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <div className="empty-text">暂无待处理的预约</div>
              </div>
            )
          ) : historyAppointments.length > 0 ? (
            <div className="appointments-list">
              {historyAppointments.map((apt) =>
                renderAppointmentCard(apt, false)
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">暂无历史记录</div>
            </div>
          )}
        </div>
      </div>

      {cancelDialog.show && cancelDialog.appointment && (
        <div
          className="modal-overlay"
          onClick={() => setCancelDialog({ show: false, appointment: null, shake: false })}
        >
          <div
            className={`modal-box ${cancelDialog.shake ? 'shake' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon">⚠️</div>
            <div className="modal-title warning">确认取消预约？</div>
            <div className="modal-message">
              您即将取消患者 <strong>{cancelDialog.appointment.patientName}</strong> 的
              <strong> {cancelDialog.appointment.slot} </strong>
              时段预约，此操作不可撤销。
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() =>
                  setCancelDialog({ show: false, appointment: null, shake: false })
                }
              >
                再想想
              </button>
              <button className="modal-btn danger" onClick={handleConfirmCancel}>
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPage;
