import React, { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { QrCode, Check, UserPlus, Bell } from 'lucide-react';

interface VisitorFormProps {
  onClose: () => void;
}

const VisitorForm: React.FC<VisitorFormProps> = ({ onClose }) => {
  const { members, fetchMembers, createVisitor } = useAppStore();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [memberId, setMemberId] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !company.trim() || !phone.trim() || !expectedTime || !memberId) {
      setError('请填写完整信息');
      return;
    }
    const result = await createVisitor({ name, company, phone, expectedTime, memberId });
    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
    } else {
      setError(result.error || '创建失败');
    }
  };

  if (qrCode) {
    return (
      <div className="reservation-overlay" onClick={onClose}>
        <div className="reservation-panel qr-panel" onClick={(e) => e.stopPropagation()}>
          <h3>访客凭证</h3>
          <p className="success-text">预约成功！请将二维码出示给访客</p>
          <div className="qr-code-container">
            <img src={qrCode} alt="访客二维码" className="qr-code" />
          </div>
          <p className="visitor-info">
            <strong>{name}</strong> - {company}
          </p>
          <p className="visitor-time">预计到访: {expectedTime}</p>
          <button className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-overlay" onClick={onClose}>
      <div className="reservation-panel" onClick={(e) => e.stopPropagation()}>
        <h3>新增访客预约</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>访客姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入访客姓名"
            />
          </div>
          <div className="form-group">
            <label>公司</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="请输入公司名称"
            />
          </div>
          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
            />
          </div>
          <div className="form-group">
            <label>预计到访时间</label>
            <input
              type="datetime-local"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="form-group">
            <label>被访人</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">请选择被访人</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} - {m.company}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              生成凭证
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VisitorPanel: React.FC = () => {
  const { visitors, fetchVisitors, checkinVisitor, unreadCount, fetchNotifications, members } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scanningVisitor, setScanningVisitor] = useState<string | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchVisitors();
    if (members.length > 0) {
      fetchNotifications(members[0].id);
    }
  }, [fetchVisitors, fetchNotifications, members]);

  const handleCheckin = async (visitorId: string) => {
    setScanningVisitor(visitorId);
    const result = await checkinVisitor(visitorId);
    setScanningVisitor(null);
    if (result.success) {
      setCheckinSuccess(visitorId);
      setTimeout(() => setCheckinSuccess(null), 2000);
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="visitor-panel-container">
      <div className="panel-header">
        <h2 className="page-title">访客管理</h2>
        <div className="header-actions">
          <div className="notification-icon-wrapper" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} color="#78909c" />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <UserPlus size={16} />
            新增访客
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="notifications-dropdown">
          <h4>消息通知</h4>
          {useAppStore.getState().notifications.length === 0 ? (
            <p className="empty-text">暂无通知</p>
          ) : (
            useAppStore.getState().notifications.slice(0, 5).map((n) => (
              <div key={n.id} className={`notification-item ${n.read === 0 ? 'unread' : ''}`}>
                <p>{n.message}</p>
                <span className="notification-time">{formatTime(n.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="visitor-list">
        {visitors.length === 0 ? (
          <div className="empty-state">
            <p>暂无访客记录</p>
          </div>
        ) : (
          visitors.map((visitor) => (
            <div
              key={visitor.id}
              className={`visitor-card ${visitor.status === 'checked_in' ? 'checked-in' : ''}`}
            >
              <div className="visitor-card-header">
                <div className="visitor-avatar">
                  {visitor.name.charAt(0)}
                </div>
                <div className="visitor-basic">
                  <h4>{visitor.name}</h4>
                  <p className="visitor-company">{visitor.company}</p>
                </div>
                <span
                  className={`status-badge ${visitor.status}`}
                  style={{
                    backgroundColor: visitor.status === 'checked_in' ? '#81c784' : '#ce93d8',
                  }}
                >
                  {visitor.status === 'checked_in' ? '已签到' : '待签到'}
                </span>
              </div>
              <div className="visitor-card-body">
                <div className="visitor-detail">
                  <span className="detail-label">手机:</span>
                  <span className="detail-value">{visitor.phone}</span>
                </div>
                <div className="visitor-detail">
                  <span className="detail-label">到访时间:</span>
                  <span className="detail-value">{formatTime(visitor.expectedTime)}</span>
                </div>
                <div className="visitor-detail">
                  <span className="detail-label">被访人:</span>
                  <span className="detail-value">{visitor.memberName}</span>
                </div>
              </div>
              <div className="visitor-card-footer">
                <div className="qr-preview" title="访客二维码">
                  <QrCode size={16} />
                  <img src={visitor.qrCode} alt="二维码" className="qr-tooltip" />
                </div>
                {visitor.status === 'pending' && (
                  <button
                    className={`btn btn-primary checkin-btn ${scanningVisitor === visitor.id ? 'loading' : ''}`}
                    onClick={() => handleCheckin(visitor.id)}
                    disabled={scanningVisitor === visitor.id}
                  >
                    {scanningVisitor === visitor.id ? (
                      '核销中...'
                    ) : checkinSuccess === visitor.id ? (
                      <>
                        <Check size={16} /> 已签到
                      </>
                    ) : (
                      '扫码核销'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && <VisitorForm onClose={() => setShowForm(false)} />}
    </div>
  );
};

export default VisitorPanel;
