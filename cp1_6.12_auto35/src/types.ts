export type DeviceType = 'pc' | 'router';

export interface DeviceConfig {
  ip: string;
  subnetMask: string;
  gateway: string;
}

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  x: number;
  y: number;
  config: DeviceConfig;
}

export interface Connection {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
}

export interface PingResult {
  success: boolean;
  message: string;
  sourceId: string;
  targetId: string;
  timestamp: number;
}

export interface ConsoleLog {
  id: string;
  timestamp: number;
  sourceName: string;
  targetName: string;
  success: boolean;
  message: string;
}

export interface NetworkTopology {
  devices: Device[];
  connections: Connection[];
}

export interface SimulateRequest {
  sourceId: string;
  targetId: string;
  topology: NetworkTopology;
}

export interface SimulateResponse {
  success: boolean;
  message: string;
  details?: {
    sourceSubnet?: string;
    targetSubnet?: string;
    path?: string[];
  };
}

export const DEFAULT_PC_CONFIG: DeviceConfig = {
  ip: '',
  subnetMask: '255.255.255.0',
  gateway: '',
};

export const DEFAULT_ROUTER_CONFIG: DeviceConfig = {
  ip: '192.168.1.254',
  subnetMask: '255.255.255.0',
  gateway: '',
};

export const DEVICE_RADIUS = 35;

export const isValidIP = (ip: string): boolean => {
  if (!ip) return true;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
  });
};

export const isValidSubnetMask = (mask: string): boolean => {
  if (!mask) return false;
  if (!isValidIP(mask)) return false;
  const binary = mask
    .split('.')
    .map((p) => parseInt(p, 10).toString(2).padStart(8, '0'))
    .join('');
  const firstZero = binary.indexOf('0');
  if (firstZero === -1) return true;
  return binary.slice(firstZero).indexOf('1') === -1;
};

export const getSubnet = (ip: string, mask: string): string => {
  if (!ip || !mask) return '';
  const ipParts = ip.split('.').map(Number);
  const maskParts = mask.split('.').map(Number);
  return ipParts.map((p, i) => p & maskParts[i]).join('.');
};
