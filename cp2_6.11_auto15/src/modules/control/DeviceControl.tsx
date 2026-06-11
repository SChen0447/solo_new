import { useState, useCallback, useRef } from 'react';
import type { DeviceState, DeviceToggleEvent } from '../../types';
import { eventBus } from '../../utils/EventBus';

const INITIAL_DEVICES: DeviceState[] = [
  { id: 'fan', name: '风扇', status: false },
  { id: 'pump', name: '水泵', status: false },
  { id: 'light', name: '灯光', status: false },
  { id: 'valve', name: '阀门', status: false },
];

interface DeviceButtonProps {
  device: DeviceState;
  onToggle: (id: string) => void;
}

function DeviceButton({ device, onToggle }: DeviceButtonProps) {
  const [bouncing, setBouncing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    setBouncing(true);
    if (buttonRef.current) {
      buttonRef.current.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(0.85)' },
          { transform: 'scale(1.1)' },
          { transform: 'scale(0.95)' },
          { transform: 'scale(1.02)' },
          { transform: 'scale(1)' },
        ],
        {
          duration: 400,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }
      );
    }
    onToggle(device.id);
    setTimeout(() => setBouncing(false), 400);
  }, [device.id, onToggle]);

  const iconMap: Record<string, string> = {
    fan: '🌀',
    pump: '💧',
    light: '💡',
    valve: '🔧',
  };

  return (
    <div className="device-button-wrapper">
      <button
        ref={buttonRef}
        className={`device-button ${device.status ? 'device-button--on' : ''} ${
          bouncing ? 'device-button--bouncing' : ''
        }`}
        onClick={handleClick}
        title={`${device.name} - ${device.status ? '开启' : '关闭'}`}
      >
        <span className="device-button__icon">{iconMap[device.id]}</span>
      </button>
      <span className="device-button__label">{device.name}</span>
      <span className={`device-button__status ${device.status ? 'device-button__status--on' : ''}`}>
        {device.status ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}

export function DeviceControl() {
  const [devices, setDevices] = useState<DeviceState[]>(INITIAL_DEVICES);

  const handleToggle = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d;
        const newStatus = !d.status;
        const event: DeviceToggleEvent = {
          deviceId: d.id,
          deviceName: d.name,
          action: newStatus ? '开启' : '关闭',
        };
        eventBus.emit('device:toggle', event);
        return { ...d, status: newStatus };
      })
    );
  }, []);

  return (
    <div className="device-control">
      <h2 className="device-control__title">设备控制</h2>
      <div className="device-control__list">
        {devices.map((device) => (
          <DeviceButton key={device.id} device={device} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}
