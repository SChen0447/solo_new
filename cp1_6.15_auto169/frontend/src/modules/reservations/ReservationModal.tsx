import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { toolApi } from '@/services/api';
import type { Tool, TimeSlot } from '@/types';

interface ReservationModalProps {
  tool: Tool;
  onClose: () => void;
  onSuccess: () => void;
}

const ReservationModal = ({ tool, onClose, onSuccess }: ReservationModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const { createReservation, currentUser, addNotification } = useAppStore();

  useEffect(() => {
    if (selectedDate) {
      loadAvailability();
    }
  }, [selectedDate]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const data = await toolApi.getAvailability(tool.id, selectedDate);
      setAvailability(data);
    } catch {
      addNotification('加载时段信息失败', 'error');
    }
    setLoading(false);
  };

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      options.push({
        value: dateStr,
        label: i === 0 ? '今天' : i === 1 ? '明天' : date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
      });
    }
    return options;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) {
      addNotification('请选择日期和时段', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await createReservation({
        tool_id: tool.id,
        user_name: currentUser,
        date: selectedDate,
        time_slot: selectedSlot
      });
      addNotification('预约成功！', 'success');
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.error || '预约失败，请重试';
      addNotification(message, 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2 className="modal-title">预约 {tool.name}</h2>
        
        <div className="modal-tool-info">
          <img src={tool.image_url} alt={tool.name} />
          <div>
            <h3>{tool.name}</h3>
            <p>{tool.category}</p>
          </div>
        </div>

        <div className="form-group">
          <label>选择日期</label>
          <select
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot('');
            }}
            className="form-control"
          >
            <option value="">请选择日期</option>
            {getDateOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {selectedDate && (
          <div className="form-group">
            <label>选择时段</label>
            {loading ? (
              <div className="loading-small">加载中...</div>
            ) : (
              <div className="slot-grid">
                {availability.map((slot) => (
                  <button
                    key={slot.slot}
                    className={`slot-option ${selectedSlot === slot.slot ? 'selected' : ''} ${!slot.available ? 'disabled' : ''}`}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.slot)}
                  >
                    {slot.label}
                    {!slot.available && <span className="slot-badge">不可用</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button className="secondary-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-btn"
            onClick={handleSubmit}
            disabled={submitting || !selectedDate || !selectedSlot}
          >
            {submitting ? '提交中...' : '确认预约'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
