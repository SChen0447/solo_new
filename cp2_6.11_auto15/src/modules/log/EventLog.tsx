import { useState, useEffect, useCallback } from 'react';
import type { LogEntry, DeviceToggleEvent } from '../../types';
import { eventBus } from '../../utils/EventBus';

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleToggle = useCallback((data: unknown) => {
    const event = data as DeviceToggleEvent;
    const entry: LogEntry = {
      time: formatTime(new Date()),
      deviceName: event.deviceName,
      action: event.action,
    };
    setLogs((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, 20);
    });
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('device:toggle', handleToggle);
    return unsub;
  }, [handleToggle]);

  return (
    <div className="event-log">
      <h2 className="event-log__title">操作日志</h2>
      <div className="event-log__list">
        {logs.length === 0 && (
          <div className="event-log__empty">暂无操作记录</div>
        )}
        {logs.map((log, i) => (
          <div
            key={`${log.time}-${log.deviceName}-${i}`}
            className={`event-log__entry ${i === 0 ? 'event-log__entry--new' : ''}`}
          >
            <div className="event-log__timeline-dot" />
            <span className="event-log__time">{log.time}</span>
            <span className="event-log__device">{log.deviceName}</span>
            <span
              className={`event-log__action ${
                log.action === '开启' ? 'event-log__action--on' : 'event-log__action--off'
              }`}
            >
              {log.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
