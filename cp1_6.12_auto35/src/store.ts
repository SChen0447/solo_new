import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Device,
  Connection,
  DeviceType,
  DeviceConfig,
  ConsoleLog,
  DEFAULT_PC_CONFIG,
  DEFAULT_ROUTER_CONFIG,
  NetworkTopology,
} from './types';

const STORAGE_KEY = 'network-simulator-state';
const MAX_LOGS = 50;

interface NetworkStore {
  devices: Device[];
  connections: Connection[];
  selectedDeviceId: string | null;
  selectedConnectionId: string | null;
  sourceDeviceId: string | null;
  targetDeviceId: string | null;
  consoleLogs: ConsoleLog[];
  configPanelOpen: boolean;
  isDraggingNewConnection: boolean;
  draggingFromDeviceId: string | null;

  addDevice: (type: DeviceType, x: number, y: number) => void;
  updateDevicePosition: (id: string, x: number, y: number) => void;
  updateDeviceConfig: (id: string, config: Partial<DeviceConfig>) => void;
  deleteDevice: (id: string) => void;
  selectDevice: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  openConfigPanel: (deviceId: string) => void;
  closeConfigPanel: () => void;

  addConnection: (fromDeviceId: string, toDeviceId: string) => void;
  deleteConnection: (id: string) => void;
  startDraggingConnection: (deviceId: string) => void;
  stopDraggingConnection: () => void;

  setSourceDevice: (id: string | null) => void;
  setTargetDevice: (id: string | null) => void;

  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;

  resetToDefault: () => void;
  loadFromStorage: () => void;
}

const createDefaultDevices = (): Device[] => [
  {
    id: uuidv4(),
    type: 'pc',
    name: 'PC-1',
    x: 200,
    y: 200,
    config: { ...DEFAULT_PC_CONFIG, ip: '192.168.1.1', gateway: '192.168.1.254' },
  },
  {
    id: uuidv4(),
    type: 'pc',
    name: 'PC-2',
    x: 500,
    y: 200,
    config: { ...DEFAULT_PC_CONFIG, ip: '192.168.1.2', gateway: '192.168.1.254' },
  },
  {
    id: uuidv4(),
    type: 'router',
    name: 'Router-1',
    x: 350,
    y: 350,
    config: { ...DEFAULT_ROUTER_CONFIG },
  },
];

const getNextDeviceName = (devices: Device[], type: DeviceType): string => {
  const prefix = type === 'pc' ? 'PC-' : 'Router-';
  const existingNumbers = devices
    .filter((d) => d.type === type)
    .map((d) => {
      const match = d.name.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
  const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  return `${prefix}${maxNum + 1}`;
};

const saveToStorage = (state: Partial<NetworkStore>) => {
  try {
    const data = {
      devices: state.devices,
      connections: state.connections,
      consoleLogs: state.consoleLogs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  devices: [],
  connections: [],
  selectedDeviceId: null,
  selectedConnectionId: null,
  sourceDeviceId: null,
  targetDeviceId: null,
  consoleLogs: [],
  configPanelOpen: false,
  isDraggingNewConnection: false,
  draggingFromDeviceId: null,

  addDevice: (type, x, y) => {
    const devices = get().devices;
    const newDevice: Device = {
      id: uuidv4(),
      type,
      name: getNextDeviceName(devices, type),
      x,
      y,
      config: type === 'pc' ? { ...DEFAULT_PC_CONFIG } : { ...DEFAULT_ROUTER_CONFIG },
    };
    const newState = { devices: [...devices, newDevice] };
    set(newState);
    saveToStorage({ ...get(), ...newState });
  },

  updateDevicePosition: (id, x, y) => {
    const devices = get().devices.map((d) =>
      d.id === id ? { ...d, x, y } : d
    );
    set({ devices });
    saveToStorage({ ...get(), devices });
  },

  updateDeviceConfig: (id, config) => {
    const devices = get().devices.map((d) =>
      d.id === id ? { ...d, config: { ...d.config, ...config } } : d
    );
    set({ devices });
    saveToStorage({ ...get(), devices });
  },

  deleteDevice: (id) => {
    const devices = get().devices.filter((d) => d.id !== id);
    const connections = get().connections.filter(
      (c) => c.fromDeviceId !== id && c.toDeviceId !== id
    );
    const state = get();
    const newState = {
      devices,
      connections,
      selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
      sourceDeviceId: state.sourceDeviceId === id ? null : state.sourceDeviceId,
      targetDeviceId: state.targetDeviceId === id ? null : state.targetDeviceId,
      configPanelOpen: state.configPanelOpen && state.selectedDeviceId === id ? false : state.configPanelOpen,
    };
    set(newState);
    saveToStorage({ ...get(), ...newState });
  },

  selectDevice: (id) => {
    set({ selectedDeviceId: id, selectedConnectionId: null });
  },

  selectConnection: (id) => {
    set({ selectedConnectionId: id, selectedDeviceId: null });
  },

  openConfigPanel: (deviceId) => {
    set({ configPanelOpen: true, selectedDeviceId: deviceId });
  },

  closeConfigPanel: () => {
    set({ configPanelOpen: false });
  },

  addConnection: (fromDeviceId, toDeviceId) => {
    if (fromDeviceId === toDeviceId) return;
    const exists = get().connections.some(
      (c) =>
        (c.fromDeviceId === fromDeviceId && c.toDeviceId === toDeviceId) ||
        (c.fromDeviceId === toDeviceId && c.toDeviceId === fromDeviceId)
    );
    if (exists) return;
    const newConnection: Connection = {
      id: uuidv4(),
      fromDeviceId,
      toDeviceId,
    };
    const connections = [...get().connections, newConnection];
    set({ connections });
    saveToStorage({ ...get(), connections });
  },

  deleteConnection: (id) => {
    const connections = get().connections.filter((c) => c.id !== id);
    const state = get();
    const newState = {
      connections,
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
    };
    set(newState);
    saveToStorage({ ...get(), ...newState });
  },

  startDraggingConnection: (deviceId) => {
    set({ isDraggingNewConnection: true, draggingFromDeviceId: deviceId });
  },

  stopDraggingConnection: () => {
    set({ isDraggingNewConnection: false, draggingFromDeviceId: null });
  },

  setSourceDevice: (id) => {
    set({ sourceDeviceId: id });
  },

  setTargetDevice: (id) => {
    set({ targetDeviceId: id });
  },

  addConsoleLog: (log) => {
    const newLog: ConsoleLog = {
      ...log,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    const allLogs = [newLog, ...get().consoleLogs];
    const consoleLogs = allLogs.slice(0, MAX_LOGS);
    set({ consoleLogs });
    saveToStorage({ ...get(), consoleLogs });
  },

  clearConsoleLogs: () => {
    set({ consoleLogs: [] });
    saveToStorage({ ...get(), consoleLogs: [] });
  },

  resetToDefault: () => {
    const devices = createDefaultDevices();
    const pc1 = devices.find((d) => d.name === 'PC-1')!;
    const pc2 = devices.find((d) => d.name === 'PC-2')!;
    const router = devices.find((d) => d.name === 'Router-1')!;
    const connections: Connection[] = [
      { id: uuidv4(), fromDeviceId: pc1.id, toDeviceId: router.id },
      { id: uuidv4(), fromDeviceId: pc2.id, toDeviceId: router.id },
    ];
    const newState = {
      devices,
      connections,
      selectedDeviceId: null,
      selectedConnectionId: null,
      sourceDeviceId: null,
      targetDeviceId: null,
      consoleLogs: [],
      configPanelOpen: false,
    };
    set(newState);
    saveToStorage(newState);
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as {
          devices?: Device[];
          connections?: Connection[];
          consoleLogs?: ConsoleLog[];
        };
        if (data.devices && data.devices.length > 0) {
          set({
            devices: data.devices,
            connections: data.connections || [],
            consoleLogs: data.consoleLogs || [],
          });
          return;
        }
      }
    } catch {
      // ignore
    }
    get().resetToDefault();
  },
}));
