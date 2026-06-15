import { useState } from 'react';
import { useAppStore } from '@/store/appStore';

interface ReservationFormProps {
  toolId: string;
  onSuccess?: () => void;
}

const ReservationForm = ({ toolId, onSuccess }: ReservationFormProps) => {
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { createReservation, currentUser, addNotification } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !timeSlot) {
      addNotification('请选择日期和时段', 'warning');
      return;
    }

    setLoading(true);
    try {
      await createReservation({
        tool_id: toolId,
        user_name: currentUser,
        date,
        time_slot: timeSlot
      });
      addNotification('预约成功！', 'success');
      setDate('');
      setTimeSlot('');
      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.error || '预约失败';
      addNotification(message, 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="reservation-form">
      <div className="form-group">
        <label>日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="form-control"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div className="form-group">
        <label>时段</label>
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(e.target.value)}
          className="form-control"
        >
          <option value="">请选择时段</option>
          <option value="09:00-12:00">上午 9:00-12:00</option>
          <option value="13:00-17:00">下午 13:00-17:00</option>
          <option value="18:00-21:00">晚间 18:00-21:00</option>
        </select>
      </div>

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? '提交中...' : '提交预约'}
      </button>
    </form>
  );
};

export default ReservationForm;
