import { useState, useEffect, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Performance } from '../types';
import { useStore } from '../store';
import PerformanceCard from './PerformanceCard';
import './ScheduleManager.css';

const COLORS = [
  '#3498DB', '#E67E22', '#2ECC71', '#9B59B6', '#E74C3C',
  '#1ABC9C', '#F39C12', '#34495E', '#16A085', '#D35400',
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function ScheduleManager() {
  const {
    performances,
    currentMonth,
    setCurrentMonth,
    setSelectedDate,
    selectedDate,
    actors,
    addPerformance,
    updatePerformance,
    isCreateModalOpen,
    setCreateModalOpen,
    editingPerformance,
    setEditingPerformance,
  } = useStore();

  const [draggingPerf, setDraggingPerf] = useState<Performance | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [monthTransition, setMonthTransition] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '19:00',
    endTime: '21:00',
    location: '主剧场A厅',
    type: 'rehearsal' as 'rehearsal' | 'show',
    status: 'scheduled' as const,
    actorIds: [] as string[],
    color: COLORS[0],
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { locale: zhCN, weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { locale: zhCN, weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const conflicts = useMemo(() => useStore.getState().getConflicts(), [performances]);

  const handlePrevMonth = () => {
    setMonthTransition(true);
    setTimeout(() => {
      setCurrentMonth(subMonths(currentMonth, 1));
      setTimeout(() => setMonthTransition(false), 50);
    }, 200);
  };

  const handleNextMonth = () => {
    setMonthTransition(true);
    setTimeout(() => {
      setCurrentMonth(addMonths(currentMonth, 1));
      setTimeout(() => setMonthTransition(false), 50);
    }, 200);
  };

  const openCreateModal = (date?: Date) => {
    const d = date || new Date();
    setFormData({
      name: '',
      date: format(d, 'yyyy-MM-dd'),
      startTime: '19:00',
      endTime: '21:00',
      location: '主剧场A厅',
      type: 'rehearsal',
      status: 'scheduled',
      actorIds: [],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    setEditingPerformance(null);
    setCreateModalOpen(true);
  };

  const openEditModal = () => {
    if (!editingPerformance) return;
    setFormData({
      name: editingPerformance.name,
      date: editingPerformance.date,
      startTime: editingPerformance.startTime,
      endTime: editingPerformance.endTime,
      location: editingPerformance.location,
      type: editingPerformance.type,
      status: editingPerformance.status,
      actorIds: [...editingPerformance.actorIds],
      color: editingPerformance.color,
    });
  };

  useEffect(() => {
    if (editingPerformance && isCreateModalOpen) {
      openEditModal();
    }
  }, [editingPerformance, isCreateModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('请输入演出名称');
      return;
    }
    if (formData.actorIds.length === 0) {
      alert('请至少选择一位演员');
      return;
    }

    if (editingPerformance) {
      await updatePerformance(editingPerformance.id, formData);
    } else {
      await addPerformance(formData);
    }
    setCreateModalOpen(false);
    setEditingPerformance(null);
  };

  const toggleActor = (actorId: string) => {
    setFormData((prev) => ({
      ...prev,
      actorIds: prev.actorIds.includes(actorId)
        ? prev.actorIds.filter((id) => id !== actorId)
        : [...prev.actorIds, actorId],
    }));
  };

  const handleDragStart = (e: React.DragEvent, perf: Performance) => {
    setDraggingPerf(perf);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');
  };

  const handleDragEnd = () => {
    if (draggingPerf) {
      const el = document.querySelector('.perf-card.dragging');
      if (el) el.classList.remove('dragging');
    }
    setDraggingPerf(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (!draggingPerf) return;
    await updatePerformance(draggingPerf.id, { date: dateStr });
    setDraggingPerf(null);
    setDragOverDate(null);
  };

  const today = new Date();

  const getPerformancesForDate = (dateStr: string) => {
    return performances
      .filter((p) => p.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const renderCalendarView = () => (
    <div className={`calendar-grid ${monthTransition ? 'slide-out' : ''}`}>
      <div className="weekday-header">
        {WEEKDAYS.map((d) => (
          <div key={d} className={`weekday ${d === '六' || d === '日' ? 'weekend' : ''}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="days-container">
        {calendarDays.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayPerfs = getPerformancesForDate(dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === dateStr;
          const isDragOver = dragOverDate === dateStr && draggingPerf;

          return (
            <div
              key={dateStr + idx}
              className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                isToday ? 'today' : ''
              } ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => {
                setSelectedDate(isSelected ? null : dateStr);
              }}
              onDoubleClick={() => openCreateModal(day)}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{ animationDelay: `${(idx % 42) * 15}ms` }}
            >
              <div className="day-number">{format(day, 'd')}</div>
              <div className="day-performances">
                {dayPerfs.slice(0, 3).map((perf) => (
                  <PerformanceCard
                    key={perf.id}
                    performance={perf}
                    isConflict={conflicts.has(perf.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {dayPerfs.length > 3 && (
                  <div className="more-perfs">+{dayPerfs.length - 3} 更多</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderListView = () => {
    const sortedPerfs = [...performances].sort((a, b) => {
      const da = a.date + a.startTime;
      const db = b.date + b.startTime;
      return da.localeCompare(db);
    });

    const grouped = sortedPerfs.reduce<Record<string, Performance[]>>((acc, p) => {
      if (!acc[p.date]) acc[p.date] = [];
      acc[p.date].push(p);
      return acc;
    }, {});

    return (
      <div className="list-view">
        {Object.keys(grouped).length === 0 ? (
          <div className="empty-state">暂无演出安排，点击"+"创建新演出</div>
        ) : (
          Object.entries(grouped).map(([date, perfs]) => (
            <div key={date} className="list-date-group">
              <div className="list-date-header">
                {format(new Date(date + 'T00:00:00'), 'M月d日 EEEE', { locale: zhCN })}
                <span className="list-date-count">{perfs.length} 场</span>
              </div>
              <div className="list-perf-container">
                {perfs.map((perf) => (
                  <PerformanceCard
                    key={perf.id}
                    performance={perf}
                    isConflict={conflicts.has(perf.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="schedule-manager">
      <div className="schedule-header">
        <div className="month-nav">
          <button className="btn-nav" onClick={handlePrevMonth}>
            ◀
          </button>
          <h2 className="current-month">
            {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <button className="btn-nav" onClick={handleNextMonth}>
            ▶
          </button>
          <button className="btn btn-today" onClick={() => setCurrentMonth(new Date())}>
            今天
          </button>
        </div>
        <button className="btn btn-primary add-btn" onClick={() => openCreateModal()}>
          <span style={{ fontSize: 18, marginRight: 4 }}>+</span> 新建演出
        </button>
      </div>

      {isMobile ? renderListView() : renderCalendarView()}

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setCreateModalOpen(false);
          setEditingPerformance(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPerformance ? '编辑演出' : '创建新演出'}</h3>
            <form onSubmit={handleSubmit} className="create-form">
              <div className="form-row">
                <label>演出名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：《雷雨》正式演出"
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>日期 *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'rehearsal' | 'show' })
                    }
                  >
                    <option value="rehearsal">排练</option>
                    <option value="show">正式演出</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>开始时间 *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>结束时间 *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <label>地点</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如：主剧场A厅"
                />
              </div>

              <div className="form-row">
                <label>状态</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                >
                  <option value="scheduled">已排期</option>
                  <option value="in-progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>

              <div className="form-row">
                <label>颜色标签</label>
                <div className="color-picker">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-dot ${formData.color === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormData({ ...formData, color: c })}
                    />
                  ))}
                </div>
              </div>

              <div className="form-row">
                <label>参与演员 *（已选 {formData.actorIds.length} 人）</label>
                <div className="actor-selector">
                  {actors.map((a) => (
                    <div
                      key={a.id}
                      className={`actor-option ${formData.actorIds.includes(a.id) ? 'selected' : ''}`}
                      onClick={() => toggleActor(a.id)}
                    >
                      <div className="actor-avatar" style={{ backgroundColor: a.avatarColor }}>
                        {a.name[0]}
                      </div>
                      <div className="actor-info">
                        <div className="actor-name">{a.name}</div>
                        <div className="actor-role">{a.role}</div>
                      </div>
                      {formData.actorIds.includes(a.id) && (
                        <div className="actor-check">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditingPerformance(null);
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPerformance ? '保存修改' : '创建演出'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
