import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { fetchRooms, fetchMembers, fetchEvents, createEvent, updateEvent, deleteEvent, createRoom } from '../../api/events';

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

export default function CalendarView() {
  const { rooms, members, events, setRooms, setMembers, setEvents, addEvent, updateEvent: storeUpdateEvent, deleteEvent: storeDeleteEvent } = useStore();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [dragInfo, setDragInfo] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    description: '',
    memberIds: [] as string[],
    roomId: ''
  });
  const [newRoom, setNewRoom] = useState({
    name: '',
    maxCapacity: 6,
    defaultDuration: 120
  });

  const dragPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  const loadData = async () => {
    try {
      const [roomsData, membersData, eventsData] = await Promise.all([
        fetchRooms(),
        fetchMembers(),
        fetchEvents()
      ]);
      setRooms(roomsData);
      setMembers(membersData);
      setEvents(eventsData);
    } catch (err) {
      showToast('加载数据失败', 'error');
    }
  };

  const showToast = (message: string, type: string = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getWeekDates = () => {
    const start = new Date(currentWeek);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();
  const roomEvents = events.filter(e => e.roomId === selectedRoomId);

  const checkConflict = (date: string, startTime: string, endTime: string, excludeId?: string) => {
    return events.some(event => {
      if (excludeId && event.id === excludeId) return false;
      if (event.roomId !== selectedRoomId) return false;
      if (event.date !== date) return false;
      
      const start1 = timeToMinutes(event.startTime);
      const end1 = timeToMinutes(event.endTime);
      const start2 = timeToMinutes(startTime);
      const end2 = timeToMinutes(endTime);
      
      return start2 < end1 && end2 > start1;
    });
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventPosition = (event: any) => {
    const startMin = timeToMinutes(event.startTime);
    const endMin = timeToMinutes(event.endTime);
    const dayIndex = weekDates.findIndex(d => formatDate(d) === event.date);
    
    if (dayIndex === -1) return null;
    
    const top = ((startMin - 8 * 60) / 60) * 50;
    const height = ((endMin - startMin) / 60) * 50 - 4;
    
    return { dayIndex, top, height };
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const dateStr = formatDate(date);
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = hour + 2;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:00`;
    
    setNewEvent({
      title: '',
      date: dateStr,
      startTime: timeStr,
      endTime: endTimeStr,
      description: '',
      memberIds: [],
      roomId: selectedRoomId
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewEvent({ ...event });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleEventDragStart = (e: React.DragEvent, event: any) => {
    setDragInfo({ event, startX: e.clientX, startY: e.clientY });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEventDrag = (e: React.DragEvent) => {
    if (!dragInfo || !dragPreviewRef.current) return;
    
    dragPreviewRef.current.style.left = `${e.clientX + 10}px`;
    dragPreviewRef.current.style.top = `${e.clientY + 10}px`;
  };

  const handleSlotDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    if (!dragInfo) return;
    
    const { event } = dragInfo;
    const dateStr = formatDate(date);
    const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
    const newStart = hour * 60;
    const newEnd = newStart + duration;
    const startTime = `${Math.floor(newStart / 60).toString().padStart(2, '0')}:${(newStart % 60).toString().padStart(2, '0')}`;
    const endTime = `${Math.floor(newEnd / 60).toString().padStart(2, '0')}:${(newEnd % 60).toString().padStart(2, '0')}`;
    
    if (checkConflict(dateStr, startTime, endTime, event.id)) {
      showToast('时间冲突！无法移动到该时段', 'error');
      setDragInfo(null);
      return;
    }
    
    try {
      const updated = await updateEvent(event.id, {
        date: dateStr,
        startTime,
        endTime
      });
      storeUpdateEvent(updated);
      showToast('排练时间已更新');
    } catch (err: any) {
      showToast(err.response?.data?.error || '更新失败', 'error');
    }
    
    setDragInfo(null);
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title.trim()) {
      showToast('请输入排练标题', 'warning');
      return;
    }
    
    if (checkConflict(newEvent.date, newEvent.startTime, newEvent.endTime, editingEvent?.id)) {
      showToast('时间冲突！该时段已有安排', 'error');
      return;
    }
    
    try {
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, newEvent);
        storeUpdateEvent(updated);
        showToast('排练已更新');
      } else {
        const created = await createEvent(newEvent);
        addEvent(created);
        showToast('排练已创建');
      }
      setShowEventModal(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || '保存失败', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    if (!confirm('确定要删除这个排练吗？')) return;
    
    try {
      await deleteEvent(editingEvent.id);
      storeDeleteEvent(editingEvent.id);
      showToast('排练已删除');
      setShowEventModal(false);
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      showToast('请输入排练室名称', 'warning');
      return;
    }
    
    try {
      const room = await createRoom(newRoom);
      setRooms([...rooms, room]);
      setSelectedRoomId(room.id);
      setShowRoomModal(false);
      setNewRoom({ name: '', maxCapacity: 6, defaultDuration: 120 });
      showToast('排练室已创建');
    } catch (err) {
      showToast('创建失败', 'error');
    }
  };

  const getMemberEvents = () => {
    const memberEvents: { [key: string]: any[] } = {};
    members.forEach(m => memberEvents[m.id] = []);
    
    events.forEach(event => {
      event.memberIds.forEach(memberId => {
        if (memberEvents[memberId]) {
          memberEvents[memberId].push(event);
        }
      });
    });
    
    return memberEvents;
  };

  const memberEvents = getMemberEvents();

  return (
    <div className="calendar-container">
      <div className="page-header">
        <h1 className="page-title">📅 排练室日历</h1>
        <button className="btn btn-secondary" onClick={() => setShowRoomModal(true)}>
          + 创建排练室
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button onClick={() => {
            const d = new Date(currentWeek);
            d.setDate(d.getDate() - 7);
            setCurrentWeek(d);
          }}>←</button>
          <div className="calendar-title">
            {weekDates[0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 
            {' - '} 
            {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={() => {
            const d = new Date(currentWeek);
            d.setDate(d.getDate() + 7);
            setCurrentWeek(d);
          }}>→</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentWeek(new Date())}>
            今天
          </button>
        </div>
        
        <div className="room-selector">
          {rooms.map(room => (
            <button
              key={room.id}
              className={`room-tab ${room.id === selectedRoomId ? 'active' : ''}`}
              onClick={() => setSelectedRoomId(room.id)}
            >
              {room.name}
            </button>
          ))}
          <button className="btn btn-sm btn-primary" onClick={() => setShowEventModal(true)}>
            + 添加排练
          </button>
        </div>
      </div>

      <div className="content-grid">
        <div className="week-view">
          <div className="week-header">
            <div className="week-day-header"></div>
            {weekDates.map((date, i) => {
              const isToday = formatDate(date) === formatDate(new Date());
              return (
                <div key={i} className={`week-day-header ${isToday ? 'today' : ''}`}>
                  <div className="day-name">{DAYS[date.getDay()]}</div>
                  <div className="day-number">{date.getDate()}</div>
                </div>
              );
            })}
          </div>
          
          <div className="week-body">
            <div className="time-slots">
              {HOURS.map(hour => (
                <>
                  <div key={`label-${hour}`} className="time-label">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {weekDates.map((date, dayIndex) => {
                    const dateStr = formatDate(date);
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
                    const hasConflict = checkConflict(dateStr, timeStr, endStr);
                    
                    return (
                      <div
                        key={`slot-${dayIndex}-${hour}`}
                        className={`time-slot ${hasConflict ? 'conflict' : ''}`}
                        onClick={() => handleSlotClick(date, hour)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleSlotDrop(e, date, hour)}
                      >
                        {roomEvents.map(event => {
                          const pos = getEventPosition(event);
                          if (!pos || pos.dayIndex !== dayIndex) return null;
                          
                          const eventStartHour = timeToMinutes(event.startTime) / 60;
                          if (Math.floor(eventStartHour) !== hour) return null;
                          
                          return (
                            <div
                              key={event.id}
                              className={`event-card ${dragInfo?.event?.id === event.id ? 'dragging' : ''}`}
                              style={{ top: pos.top, height: pos.height }}
                              draggable
                              onDragStart={(e) => handleEventDragStart(e, event)}
                              onDrag={handleEventDrag}
                              onClick={(e) => handleEventClick(event, e)}
                            >
                              <div className="event-title">{event.title}</div>
                              <div className="event-time">{event.startTime} - {event.endTime}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        <div className="member-schedule">
          <h3>👥 成员日程汇总</h3>
          <div className="member-event-list">
            {members.map(member => (
              <div key={member.id} className="member-events">
                <div className="member-header">
                  <span className="member-avatar">{member.avatar}</span>
                  <span className="member-name">{member.name}</span>
                </div>
                {memberEvents[member.id]?.length > 0 ? (
                  memberEvents[member.id].map(event => (
                    <div key={event.id} className="member-event-item">
                      <div style={{ fontWeight: 600 }}>{event.title}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {event.date} {event.startTime}-{event.endTime}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    暂无排练安排
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEvent ? '编辑排练' : '添加排练'}
              </h2>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">排练标题</label>
              <input
                type="text"
                className="form-input"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="输入排练标题"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">排练室</label>
                <select
                  className="form-select"
                  value={newEvent.roomId || selectedRoomId}
                  onChange={(e) => setNewEvent({ ...newEvent, roomId: e.target.value })}
                >
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">开始时间</label>
                <input
                  type="time"
                  className="form-input"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">结束时间</label>
                <input
                  type="time"
                  className="form-input"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">排练目标描述</label>
              <textarea
                className="form-textarea"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="描述本次排练的目标和内容..."
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">参与成员</label>
              <div className="checkbox-group">
                {members.map(member => (
                  <label 
                    key={member.id} 
                    className={`checkbox-label ${newEvent.memberIds.includes(member.id) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={newEvent.memberIds.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewEvent({ ...newEvent, memberIds: [...newEvent.memberIds, member.id] });
                        } else {
                          setNewEvent({ ...newEvent, memberIds: newEvent.memberIds.filter(id => id !== member.id) });
                        }
                      }}
                    />
                    <span>{member.avatar}</span>
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              {editingEvent && (
                <button className="btn btn-danger" onClick={handleDeleteEvent}>
                  删除
                </button>
              )}
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-secondary" onClick={() => setShowEventModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveEvent}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="modal-overlay" onClick={() => setShowRoomModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">创建排练室</h2>
              <button className="modal-close" onClick={() => setShowRoomModal(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">排练室名称</label>
              <input
                type="text"
                className="form-input"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                placeholder="例如：主排练室、创作室A"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">最大容纳人数</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={newRoom.maxCapacity}
                  onChange={(e) => setNewRoom({ ...newRoom, maxCapacity: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">默认时长（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  min="30"
                  step="30"
                  value={newRoom.defaultDuration}
                  onChange={(e) => setNewRoom({ ...newRoom, defaultDuration: parseInt(e.target.value) })}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRoomModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateRoom}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {dragInfo && (
        <div ref={dragPreviewRef} className="drag-preview">
          {dragInfo.event.title}
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            拖拽移动...
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
