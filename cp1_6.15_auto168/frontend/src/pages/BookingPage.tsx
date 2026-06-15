import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBookingStore, TimeSlot } from '../store/bookingStore';

const BookingPage: React.FC = () => {
  const { timeSlots, selectedDate, isLoadingSlots, fetchTimeSlots, submitBooking, isSubmitting } = useBookingStore();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [projectType, setProjectType] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [projectError, setProjectError] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [tooltipSlot, setTooltipSlot] = useState<TimeSlot | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchTimeSlots(selectedDate);
  }, [selectedDate, fetchTimeSlots]);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: Array<{ day: number | null; date: string | null; isCurrentMonth: boolean }> = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null, isCurrentMonth: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ day, date: dateStr, isCurrentMonth: true });
    }
    
    return days;
  }, [currentMonth]);

  const prevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      let { year, month } = prev;
      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
      return { year, month };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      let { year, month } = prev;
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
      return { year, month };
    });
  }, []);

  const selectDate = useCallback((date: string | null) => {
    if (date) {
      fetchTimeSlots(date);
    }
  }, [fetchTimeSlots]);

  const handleSlotClick = useCallback((slot: TimeSlot, event: React.MouseEvent) => {
    if (slot.booked_count >= slot.capacity) return;
    
    setSelectedSlot(slot);
    setShowForm(true);
    setPhoneError('');
    setNameError('');
    setProjectError('');
  }, []);

  const handleSlotHover = useCallback((slot: TimeSlot, event: React.MouseEvent) => {
    if (slot.booked_count >= slot.capacity) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setTooltipSlot(slot);
  }, []);

  const handleSlotLeave = useCallback(() => {
    setTooltipSlot(null);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setTimeout(() => {
      setSelectedSlot(null);
    }, 300);
  }, []);

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!value) {
      setPhoneError('请输入手机号');
      return false;
    }
    if (!phoneRegex.test(value)) {
      setPhoneError('请输入有效的手机号码');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let isValid = true;
    
    if (!customerName.trim()) {
      setNameError('请输入您的姓名');
      isValid = false;
    } else {
      setNameError('');
    }
    
    if (!projectType) {
      setProjectError('请选择项目类型');
      isValid = false;
    } else {
      setProjectError('');
    }
    
    if (!validatePhone(phone)) {
      isValid = false;
    }
    
    if (!isValid || !selectedSlot) return;
    
    const result = await submitBooking({
      customer_name: customerName,
      phone,
      project_type: projectType,
      description,
      time_slot: `${selectedSlot.date} ${selectedSlot.time_start}`,
    });
    
    if (result.success) {
      setShowSuccess(true);
      setShowForm(false);
      setSelectedSlot(null);
      setCustomerName('');
      setPhone('');
      setProjectType('');
      setDescription('');
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } else {
      alert(result.error);
    }
  };

  const getSlotColor = (slot: TimeSlot): string => {
    if (slot.booked_count >= slot.capacity) return '#bdbdbd';
    if (slot.booked_count === 1) return '#ff9800';
    return '#4caf50';
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const isToday = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isSelected = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    return dateStr === selectedDate;
  };

  const morningSlots = timeSlots.filter(s => parseInt(s.time_start) < 12);
  const afternoonSlots = timeSlots.filter(s => parseInt(s.time_start) >= 12);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>手工DIY预约</h1>
      <p style={styles.subtitle}>选择您喜欢的时段，开启创意手作之旅</p>

      <div style={styles.calendarCard}>
        <div style={styles.calendarHeader}>
          <button onClick={prevMonth} style={styles.navButton} aria-label="上个月">
            ‹
          </button>
          <span style={styles.monthTitle}>
            {currentMonth.year}年 {monthNames[currentMonth.month]}
          </span>
          <button onClick={nextMonth} style={styles.navButton} aria-label="下个月">
            ›
          </button>
        </div>

        <div style={styles.weekDayRow}>
          {weekDays.map(day => (
            <div key={day} style={styles.weekDay}>{day}</div>
          ))}
        </div>

        <div style={styles.daysGrid}>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              style={{
                ...styles.dayCell,
                ...(day.isCurrentMonth ? {} : styles.dayCellOtherMonth),
                ...(isSelected(day.date) ? styles.dayCellSelected : {}),
                ...(isToday(day.date) ? styles.dayCellToday : {}),
                cursor: day.isCurrentMonth ? 'pointer' : 'default',
              }}
              onClick={() => day.date && selectDate(day.date)}
            >
              {day.day}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.slotsSection}>
        <h2 style={styles.slotsTitle}>
          {selectedDate} 可预约时段
        </h2>

        {isLoadingSlots ? (
          <div style={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={styles.skeletonItem} />
            ))}
          </div>
        ) : (
          <>
            <div style={styles.slotsPeriod}>
              <h3 style={styles.periodTitle}>上午 9:00 - 12:00</h3>
              <div style={styles.slotsGrid}>
                {morningSlots.map(slot => {
                  const isFull = slot.booked_count >= slot.capacity;
                  return (
                    <div
                      key={slot.id}
                      style={{
                        ...styles.slotItem,
                        opacity: isFull ? 0.6 : 1,
                        cursor: isFull ? 'not-allowed' : 'pointer',
                      }}
                      onClick={(e) => handleSlotClick(slot, e)}
                      onMouseEnter={(e) => handleSlotHover(slot, e)}
                      onMouseLeave={handleSlotLeave}
                    >
                      <div
                        style={{
                          ...styles.slotDot,
                          backgroundColor: getSlotColor(slot),
                        }}
                      />
                      <span style={styles.slotTime}>{slot.time_start}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.slotsPeriod}>
              <h3 style={styles.periodTitle}>下午 1:00 - 6:00</h3>
              <div style={styles.slotsGrid}>
                {afternoonSlots.map(slot => {
                  const isFull = slot.booked_count >= slot.capacity;
                  return (
                    <div
                      key={slot.id}
                      style={{
                        ...styles.slotItem,
                        opacity: isFull ? 0.6 : 1,
                        cursor: isFull ? 'not-allowed' : 'pointer',
                      }}
                      onClick={(e) => handleSlotClick(slot, e)}
                      onMouseEnter={(e) => handleSlotHover(slot, e)}
                      onMouseLeave={handleSlotLeave}
                    >
                      <div
                        style={{
                          ...styles.slotDot,
                          backgroundColor: getSlotColor(slot),
                        }}
                      />
                      <span style={styles.slotTime}>{slot.time_start}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#4caf50' }} />
                <span>可预约</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#ff9800' }} />
                <span>部分已约</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#bdbdbd' }} />
                <span>已满</span>
              </div>
            </div>
          </>
        )}
      </div>

      {tooltipSlot && (
        <div style={{
          ...styles.tooltip,
          left: tooltipPos.x,
          top: tooltipPos.y,
        }}>
          剩余 {tooltipSlot.capacity - tooltipSlot.booked_count} 个名额
        </div>
      )}

      <div style={{
        ...styles.sidebarOverlay,
        opacity: showForm ? 1 : 0,
        pointerEvents: showForm ? 'auto' : 'none',
      }} onClick={closeForm} />

      <div style={{
        ...styles.sidebar,
        transform: showForm ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>定制预约</h2>
          <button onClick={closeForm} style={styles.closeButton}>×</button>
        </div>

        {selectedSlot && (
          <div style={styles.selectedSlotInfo}>
            <span style={styles.selectedSlotLabel}>已选时段：</span>
            <span style={styles.selectedSlotValue}>
              {selectedSlot.date} {selectedSlot.time_start} - {selectedSlot.time_end}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>项目类型</label>
            <select
              value={projectType}
              onChange={(e) => { setProjectType(e.target.value); setProjectError(''); }}
              style={{
                ...styles.select,
                borderColor: projectError ? '#e53935' : '#d4a373',
              }}
            >
              <option value="">请选择项目</option>
              <option value="陶艺">陶艺</option>
              <option value="木工">木工</option>
              <option value="布艺">布艺</option>
            </select>
            {projectError && <span style={styles.errorText}>{projectError}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>您的姓名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setNameError(''); }}
              placeholder="请输入姓名"
              style={{
                ...styles.input,
                borderColor: nameError ? '#e53935' : '#d4a373',
              }}
            />
            {nameError && <span style={styles.errorText}>{nameError}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>联系电话</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value); }}
              placeholder="请输入手机号"
              style={{
                ...styles.input,
                borderColor: phoneError ? '#e53935' : '#d4a373',
              }}
              onBlur={() => phone && validatePhone(phone)}
            />
            {phoneError && <span style={styles.errorText}>{phoneError}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>定制说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述您的想法..."
              rows={4}
              style={styles.textarea}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitButton,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? '提交中...' : '提交预约'}
          </button>
        </form>
      </div>

      {showSuccess && (
        <div style={styles.successToast}>
          <span style={styles.successIcon}>✓</span>
          预约提交成功！
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
    position: 'relative',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 600,
    color: '#5d4e37',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#8b7355',
    textAlign: 'center',
    marginBottom: '32px',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: '32px',
  },
  calendarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  navButton: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#b5896e',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#5d4e37',
  },
  weekDayRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    marginBottom: '8px',
  },
  weekDay: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#8b7355',
    padding: '8px 0',
    fontWeight: 500,
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayCell: {
    textAlign: 'center',
    padding: '12px 0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    color: '#5d4e37',
    transition: 'background-color 0.2s',
  },
  dayCellOtherMonth: {
    color: '#ccc',
    cursor: 'default',
  },
  dayCellSelected: {
    backgroundColor: '#b5896e',
    color: '#fff',
    fontWeight: 600,
  },
  dayCellToday: {
    border: '2px solid #d4a373',
  },
  slotsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  slotsTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#5d4e37',
    margin: '0 0 20px 0',
  },
  slotsPeriod: {
    marginBottom: '24px',
  },
  periodTitle: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#8b7355',
    margin: '0 0 12px 0',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '12px',
  },
  slotItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    borderRadius: '8px',
    backgroundColor: '#faf3e0',
    transition: 'transform 0.15s, background-color 0.2s',
  },
  slotDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    marginBottom: '8px',
    transition: 'transform 0.15s',
  },
  slotTime: {
    fontSize: '0.875rem',
    color: '#5d4e37',
  },
  legend: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #f0e6d6',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    color: '#8b7355',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  sidebarOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 998,
    transition: 'opacity 0.3s ease-out',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '350px',
    height: '100vh',
    backgroundColor: '#fff8e7',
    boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
    zIndex: 999,
    transition: 'transform 0.3s ease-out',
    overflowY: 'auto',
    padding: '24px',
    boxSizing: 'border-box',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sidebarTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#5d4e37',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#8b7355',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  selectedSlotInfo: {
    backgroundColor: '#f0e6d6',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  selectedSlotLabel: {
    fontSize: '0.875rem',
    color: '#8b7355',
  },
  selectedSlotValue: {
    fontSize: '0.95rem',
    color: '#5d4e37',
    fontWeight: 500,
    marginLeft: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#5d4e37',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d4a373',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d4a373',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d4a373',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  errorText: {
    fontSize: '0.8rem',
    color: '#e53935',
    animation: 'fadeIn 0.2s ease-out',
  },
  submitButton: {
    marginTop: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#b5896e',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
  },
  successToast: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4caf50',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'slideDown 0.3s ease-out',
  },
  successIcon: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  tooltip: {
    position: 'fixed',
    transform: 'translateX(-50%) translateY(-100%)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    zIndex: 100,
    pointerEvents: 'none',
    animation: 'fadeIn 0.15s ease-out',
  },
  skeletonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '12px',
  },
  skeletonItem: {
    height: '60px',
    borderRadius: '8px',
    backgroundColor: '#e0e0e0',
    animation: 'shimmer 1s infinite',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes shimmer {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
  
  .slot-item:hover .slot-dot {
    transform: scale(1.2);
  }
`;
document.head.appendChild(styleSheet);

export default BookingPage;
