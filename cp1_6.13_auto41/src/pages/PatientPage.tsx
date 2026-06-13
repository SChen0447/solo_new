import React, { useState, useEffect } from 'react';
import {
  getDepartments,
  getDoctors,
  createAppointment,
  Department,
  Doctor,
} from '../api';

interface FormData {
  patientName: string;
  phone: string;
  note: string;
}

interface FormErrors {
  patientName?: string;
  phone?: string;
  note?: string;
}

interface ModalState {
  show: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const PatientPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    phone: '',
    note: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [modal, setModal] = useState<ModalState>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDept = async (dept: Department) => {
    setSelectedDept(dept);
    setSelectedDoctor(null);
    setSelectedSlot('');
    setShowForm(false);
    setCarouselIndex(0);
    try {
      const data = await getDoctors(dept.id);
      setDoctors(data);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  const handleBackToDepts = () => {
    setSelectedDept(null);
    setSelectedDoctor(null);
    setSelectedSlot('');
    setShowForm(false);
    setDoctors([]);
  };

  const handleSelectSlot = (doctor: Doctor, slot: string) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handlePrevDoctor = () => {
    if (carouselIndex > 0) {
      setCarouselIndex((prev) => prev - 1);
    }
  };

  const handleNextDoctor = () => {
    if (carouselIndex < doctors.length - 1) {
      setCarouselIndex((prev) => prev + 1);
    }
  };

  const validatePhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.patientName.trim()) {
      errors.patientName = '请输入患者姓名';
    } else if (formData.patientName.trim().length > 50) {
      errors.patientName = '姓名不能超过50个字符';
    }

    if (!formData.phone.trim()) {
      errors.phone = '请输入联系电话';
    } else if (!validatePhone(formData.phone.trim())) {
      errors.phone = '请输入正确的11位手机号码';
    }

    if (formData.note && formData.note.length > 100) {
      errors.note = '备注不能超过100个字';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctor || !selectedSlot || !selectedDept) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        doctorId: selectedDoctor.id,
        departmentId: selectedDept.id,
        patientName: formData.patientName.trim(),
        phone: formData.phone.trim(),
        slot: selectedSlot,
        note: formData.note.trim() || undefined,
      });

      setModal({
        show: true,
        type: 'success',
        title: '预约成功！',
        message: `您已成功预约 ${selectedDoctor.name} 医生的 ${selectedSlot} 时段，请耐心等待医生确认。`,
      });

      setFormData({ patientName: '', phone: '', note: '' });
      setSelectedSlot('');
      setShowForm(false);

      setTimeout(() => {
        setModal((prev) => ({ ...prev, show: false }));
      }, 2000);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail || '预约失败，请稍后重试';
      setModal({
        show: true,
        type: 'error',
        title: '预约失败',
        message: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedSlot('');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">在线预约挂号</h1>
      <p className="page-subtitle">
        选择科室 → 选择医生和时段 → 填写预约信息，三步完成挂号
      </p>

      {!selectedDept ? (
        <div className="departments-grid">
          {departments.map((dept, index) => (
            <div
              key={dept.id}
              className="dept-card animate-fade-in-up"
              style={{
                backgroundColor: dept.color,
                animationDelay: `${index * 0.08}s`,
              }}
              onClick={() => handleSelectDept(dept)}
            >
              <div className="dept-icon">{dept.icon}</div>
              <div className="dept-name">{dept.name}</div>
              <div className="dept-desc">{dept.description}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="doctors-view">
          <button className="back-btn" onClick={handleBackToDepts}>
            <span>←</span>
            <span>返回科室列表</span>
          </button>

          <div
            className="selected-dept-header"
            style={{ backgroundColor: selectedDept.color }}
          >
            <div className="selected-dept-icon">{selectedDept.icon}</div>
            <div className="selected-dept-info">
              <h2>{selectedDept.name}</h2>
              <p>{selectedDept.description}</p>
            </div>
          </div>

          <div className="carousel-wrapper">
            <button
              className="carousel-btn prev"
              onClick={handlePrevDoctor}
              disabled={carouselIndex === 0}
              aria-label="上一位医生"
            >
              ‹
            </button>

            <div className="carousel-container">
              <div
                className="carousel-track"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {doctors.map((doctor) => (
                  <div
                    className="doctor-card"
                    key={doctor.id}
                    style={{ marginLeft: doctors.indexOf(doctor) === 0 ? '0' : undefined }}
                  >
                    <div className="doctor-header">
                      <div className="doctor-avatar">
                        <img
                          src={doctor.avatar}
                          alt={doctor.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.textContent =
                              doctor.name.charAt(0);
                          }}
                        />
                      </div>
                      <div className="doctor-info">
                        <h3>{doctor.name}</h3>
                        <span className="doctor-title-tag">{doctor.title}</span>
                      </div>
                    </div>

                    <div className="slots-label">
                      <span>📅</span>
                      <span>本周可预约时段</span>
                    </div>
                    <div className="slots-grid">
                      {doctor.slots.map((slot) => (
                        <div
                          key={slot}
                          className={`slot-item ${
                            selectedDoctor?.id === doctor.id && selectedSlot === slot
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => handleSelectSlot(doctor, slot)}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="carousel-btn next"
              onClick={handleNextDoctor}
              disabled={carouselIndex >= doctors.length - 1}
              aria-label="下一位医生"
            >
              ›
            </button>

            <div className="carousel-dots">
              {doctors.map((_, index) => (
                <div
                  key={index}
                  className={`carousel-dot ${index === carouselIndex ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && selectedDoctor && selectedDept && (
        <div className="appointment-form-overlay">
          <div className="form-header">
            <h3>
              <span>📝</span>
              <span>填写预约信息</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="selected-info">
                {selectedDoctor.name} | {selectedSlot}
              </span>
              <button
                className="form-close"
                onClick={handleCloseForm}
                aria-label="关闭表单"
              >
                ✕
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">
                  患者姓名<span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${formErrors.patientName ? 'error' : ''}`}
                  placeholder="请输入患者姓名"
                  value={formData.patientName}
                  onChange={(e) => {
                    setFormData({ ...formData, patientName: e.target.value });
                    if (formErrors.patientName) {
                      setFormErrors({ ...formErrors, patientName: undefined });
                    }
                  }}
                  maxLength={50}
                />
                {formErrors.patientName && (
                  <span className="form-error">{formErrors.patientName}</span>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">
                  联系电话<span className="required">*</span>
                </label>
                <input
                  type="tel"
                  className={`form-input ${formErrors.phone ? 'error' : ''}`}
                  placeholder="请输入11位手机号码"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (formErrors.phone) {
                      setFormErrors({ ...formErrors, phone: undefined });
                    }
                  }}
                  maxLength={11}
                />
                {formErrors.phone && (
                  <span className="form-error">{formErrors.phone}</span>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">备注</label>
                <textarea
                  className="form-textarea"
                  placeholder="选填，最多100字"
                  value={formData.note}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) {
                      setFormData({ ...formData, note: e.target.value });
                    }
                    if (formErrors.note) {
                      setFormErrors({ ...formErrors, note: undefined });
                    }
                  }}
                  maxLength={100}
                />
                <div className="char-count">{formData.note.length}/100</div>
                {formErrors.note && (
                  <span className="form-error">{formErrors.note}</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" />
                    <span>提交中...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>确认预约</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal.show && (
        <div
          className="modal-overlay"
          onClick={() => modal.type === 'error' && setModal({ ...modal, show: false })}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">{modal.type === 'success' ? '🎉' : '⚠️'}</div>
            <div className={`modal-title ${modal.type}`}>{modal.title}</div>
            <div className="modal-message">{modal.message}</div>
            {modal.type === 'error' && (
              <div className="modal-actions">
                <button
                  className="modal-btn primary"
                  onClick={() => setModal({ ...modal, show: false })}
                >
                  我知道了
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPage;
