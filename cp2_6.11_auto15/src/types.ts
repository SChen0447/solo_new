export interface SensorData {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
}

export interface DeviceState {
  id: string;
  name: string;
  status: boolean;
}

export interface LogEntry {
  time: string;
  deviceName: string;
  action: '开启' | '关闭';
}

export interface DeviceToggleEvent {
  deviceId: string;
  deviceName: string;
  action: '开启' | '关闭';
}
