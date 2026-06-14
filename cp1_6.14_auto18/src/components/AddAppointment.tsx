import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppointmentFormData, ServiceType } from '../types';
import { useSalonStore } from '../store/useSalonStore';
import './AddAppointment.css';

const services: ServiceType[] = ['剪发', '染发', '护理', '造型'];

const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

function AddAppointment() {
  const navigate = useNavigate();
  const { addAppointment, checkConflict, loading, error } = useSalonStore();

  const [formData, setFormData] = useState<AppointmentFormData>({
    name: '',
    phone: '',
    service: '剪发',
    date: '',
    time: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (formData.date && formData.time) {
      const check = async () => {
        setCheckingConflict(true);
        const hasConflict = await checkConflict(formData.date, formData.time);
        setConflictError(hasConflict ? '该时间段已被预约，请选择其他时间' : null);
        setCheckingConflict(false);
      };
      const timer = setTimeout(check, 300);
      return () => clearTimeout(timer);
    } else {
      setConflictError(null);
    }
  }, [formData.date, formData.time, checkConflict]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入客户姓名';
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少2个字符';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '请输入联系电话';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码';
    }

    if (!formData.date) {
      newErrors.date = '请选择预约日期';
    }

    if (!formData.time) {
      newErrors.time = '请选择预约时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (conflictError) {
      return;
    }

    const success = await addAppointment(formData);

    if (success) {
      setSuccessMessage('预约添加成功！');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="add-appointment-container">
      <div className="add-appointment-header">
        <h1>添加新预约</h1>
        <p className="subtitle">请填写以下信息完成预约</p>
      </div>

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      {(error || conflictError) && (
        <div className="error-message">
          <span className="error-icon">!</span>
          {error || conflictError}
        </div>
      )}

      <form className="appointment-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">客户姓名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入客户姓名"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">联系电话 *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号码"
              className={errors.phone ? 'error' : ''}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="service">服务项目 *</label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
            >
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">预约日期 *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={getMinDate()}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && <span className="field-error">{errors.date}</span>}
          </div>

          <div className="form-group full-width">
            <label htmlFor="time">预约时间 *</label>
            <div className="time-slots">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`time-slot ${formData.time === time ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, time }))}
                >
                  {time}
                </button>
              ))}
            </div>
            {errors.time && <span className="field-error">{errors.time}</span>}
            {checkingConflict && <span className="checking">正在检查时间冲突...</span>}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/')}
          >
            返回列表
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || checkingConflict || !!conflictError}
          >
            {loading ? '提交中...' : '确认预约'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddAppointment;
