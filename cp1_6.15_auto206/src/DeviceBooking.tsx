import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { Calendar, Video, Projector, Square } from 'lucide-react';
import type { Device, DeviceReservation } from './types';

const deviceIcons: Record<string, React.ReactNode> = {
  projector: <Projector size={18} />,
  whiteboard: <Square size={18} />,
  video_conference: <Video size={18} />,
};

const deviceTypeLabels: Record<string, string> = {
  projector: '投影仪',
  whiteboard: '白板',
  video_conference: '视频会议',
};

const TIME_SLOTS = 24;
const SLOT_MINUTES = 30;
const START_HOUR = 8;
const SLOT_WIDTH = 40;

interface TimelineProps {
  device: Device;
  reservations: DeviceReservation[];
  date: string;
  onSelectRange: (deviceId: string, startTime: string, endTime: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ device, reservations, date, onSelectRange }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [endSlot, setEndSlot] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [memberName, setMemberName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const { reserveDevice } = useAppStore();

  const getSlotFromX = (clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const slot = Math.floor(x / SLOT_WIDTH);
    return Math.max(0, Math.min(TIME_SLOTS - 1, slot));
  };

  const slotToTime = (slot: number): string => {
    const totalMinutes = START_HOUR * 60 + slot * SLOT_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getReservedSlots = (): boolean[] => {
    const slots = new Array(TIME_SLOTS).fill(false);
    reservations.forEach((r) => {
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      const startIdx = Math.floor(((sh - START_HOUR) * 60 + sm) / SLOT_MINUTES);
      const endIdx = Math.ceil(((eh - START_HOUR) * 60 + em) / SLOT_MINUTES);
      for (let i = startIdx; i < endIdx; i++) {
        if (i >= 0 && i < TIME_SLOTS) slots[i] = true;
      }
    });
    return slots;
  };

  const reservedSlots = getReservedSlots();

  const handleMouseDown = (e: React.MouseEvent) => {
    const slot = getSlotFromX(e.clientX);
    if (reservedSlots[slot]) return;
    setIsDragging(true);
    setStartSlot(slot);
    setEndSlot(slot);
    setSelectedRange(null);
    setError('');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startSlot === null) return;
    const slot = getSlotFromX(e.clientX);
    const minSlot = Math.min(startSlot, slot);
    const maxSlot = Math.max(startSlot, slot);
    
    for (let i = minSlot; i <= maxSlot; i++) {
      if (reservedSlots[i]) {
        return;
      }
    }
    setEndSlot(slot);
  };

  const handleMouseUp = () => {
    if (isDragging && startSlot !== null && endSlot !== null && startSlot !== endSlot) {
      const minSlot = Math.min(startSlot, endSlot);
      const maxSlot = Math.max(startSlot, endSlot);
      setSelectedRange({ start: minSlot, end: maxSlot });
      setShowConfirm(true);
    }
    setIsDragging(false);
    setStartSlot(null);
    setEndSlot(null);
  };

  const handleConfirm = async () => {
    if (!selectedRange || !memberName.trim()) {
      setError('请填写使用人');
      return;
    }
    const startTime = slotToTime(selectedRange.start);
    const endTime = slotToTime(selectedRange.end + 1);
    const result = await reserveDevice({
      deviceId: device.id,
      date,
      startTime,
      endTime,
      memberName: memberName.trim(),
    });
    if (result.success) {
      setSelectedRange(null);
      setShowConfirm(false);
      setMemberName('');
    } else {
      setError(result.error || '预约失败');
    }
  };

  const renderTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < TIME_SLOTS; i++) {
      const time = slotToTime(i);
      const isHour = i % 2 === 0;
      slots.push(
        <div key={i} className="time-slot-header">
          {isHour && <span className="time-label">{time}</span>}
        </div>
      );
    }
    return slots;
  };

  const renderReservedBlocks = () => {
    return reservations.map((r, idx) => {
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      const startIdx = ((sh - START_HOUR) * 60 + sm) / SLOT_MINUTES;
      const endIdx = ((eh - START_HOUR) * 60 + em) / SLOT_MINUTES;
      const left = startIdx * SLOT_WIDTH;
      const width = (endIdx - startIdx) * SLOT_WIDTH;
      return (
        <div
          key={idx}
          className="reserved-block"
          style={{
            left: `${left}px`,
            width: `${width}px`,
          }}
          title={`${r.startTime} - ${r.endTime} | ${r.memberName}`}
        >
          <span className="reserved-time">{r.startTime}-{r.endTime}</span>
        </div>
      );
    });
  };

  const renderSelection = () => {
    if (selectedRange) {
      const left = selectedRange.start * SLOT_WIDTH;
      const width = (selectedRange.end - selectedRange.start + 1) * SLOT_WIDTH;
      return (
        <div
          className="selection-block"
          style={{
            left: `${left}px`,
            width: `${width}px`,
          }}
        />
      );
    }
    if (isDragging && startSlot !== null && endSlot !== null) {
      const minSlot = Math.min(startSlot, endSlot);
      const maxSlot = Math.max(startSlot, endSlot);
      const left = minSlot * SLOT_WIDTH;
      const width = (maxSlot - minSlot + 1) * SLOT_WIDTH;
      return (
        <div
          className="dragging-block"
          style={{
            left: `${left}px`,
            width: `${width}px`,
          }}
        />
      );
    }
    return null;
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        {renderTimeSlots()}
      </div>
      <div
        ref={timelineRef}
        className="timeline-body"
        style={{ width: `${TIME_SLOTS * SLOT_WIDTH}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="timeline-grid">
          {Array.from({ length: TIME_SLOTS }).map((_, i) => (
            <div
              key={i}
              className={`grid-cell ${reservedSlots[i] ? 'reserved' : ''}`}
              style={{ width: `${SLOT_WIDTH}px` }}
            />
          ))}
        </div>
        {renderReservedBlocks()}
        {renderSelection()}
      </div>
      {showConfirm && selectedRange && (
        <div className="confirm-panel">
          <p>已选择: {slotToTime(selectedRange.start)} - {slotToTime(selectedRange.end + 1)}</p>
          <input
            type="text"
            placeholder="使用人"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowConfirm(false);
                setSelectedRange(null);
                setMemberName('');
              }}
            >
              取消
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              确认预约
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DeviceBooking: React.FC = () => {
  const { devices, deviceReservations, fetchDevices } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDevices(selectedDate);
  }, [fetchDevices, selectedDate]);

  const groupedDevices = devices.reduce((acc, d) => {
    if (!acc[d.roomId]) acc[d.roomId] = [];
    acc[d.roomId].push(d);
    return acc;
  }, {} as Record<string, Device[]>);

  return (
    <div className="device-booking-container">
      <div className="panel-header">
        <h2 className="page-title">设备预约</h2>
        <div className="date-picker-wrapper">
          <Calendar size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="rooms-container">
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <div key={roomId} className="room-card">
            <h3 className="room-title">{roomDevices[0]?.roomName || '会议室'}</h3>
            <div className="devices-list">
              {roomDevices.map((device) => (
                <div key={device.id} className="device-item">
                  <div className="device-header">
                    <div className="device-icon" style={{ color: '#1976d2' }}>
                      {deviceIcons[device.type]}
                    </div>
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-type">{deviceTypeLabels[device.type]}</span>
                    </div>
                  </div>
                  <div className="device-timeline">
                    <Timeline
                      device={device}
                      reservations={deviceReservations.filter((r) => r.deviceId === device.id)}
                      date={selectedDate}
                      onSelectRange={() => {}}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#e1bee7' }}></span>
          <span>已预约</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: 'rgba(25, 118, 210, 0.3)' }}></span>
          <span>已选择</span>
        </div>
        <div className="legend-item">
          <span className="legend-hint">拖拽选择时段进行预约</span>
        </div>
      </div>
    </div>
  );
};

export default DeviceBooking;
