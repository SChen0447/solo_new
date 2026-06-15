import { create } from 'zustand';

export type Protocol = 'TCP' | 'UDP' | 'ICMP';

export interface TrafficPacket {
  id: string;
  srcIP: string;
  dstIP: string;
  port: number;
  protocol: Protocol;
  packetSize: number;
  timestamp: number;
}

export interface AnomalyMarker {
  id: string;
  ipSegment: string;
  packetCount: number;
  triggerTime: number;
  duration: number;
  zIndex: number;
  timeIndex: number;
}

export interface IPStats {
  ip: string;
  count: number;
  protocol: Protocol;
}

export interface IPPoint {
  time: number;
  count: number;
}

export interface TrafficState {
  packets: TrafficPacket[];
  anomalies: AnomalyMarker[];
  selectedIP: string | null;
  currentTime: number;
  startTime: number;
  isPaused: boolean;
  isReplaying: boolean;
  historySnapshots: Array<{
    time: number;
    heights: number[][];
  }>;
  terrainHeights: number[][];
  ipStatsMap: Record<string, number>;
  selectedIPHistory: IPPoint[];
  lastAnomalyTime: number;

  addData: (packets: TrafficPacket[]) => void;
  markAnomaly: (anomaly: AnomalyMarker) => void;
  selectIP: (ip: string | null) => void;
  setTime: (time: number) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setReplaying: (replaying: boolean) => void;
  setTerrainHeights: (heights: number[][]) => void;
  updateIPStatsMap: (map: Record<string, number>) => void;
  addSelectedIPHistory: (point: IPPoint) => void;
  clearAnomalies: () => void;
  cleanupOldData: (cutoffTime: number) => void;
}

const GRID_TIME = 60;
const GRID_Z = 16;

const initialHeights: number[][] = Array(GRID_TIME)
  .fill(null)
  .map(() => Array(GRID_Z).fill(0));

const generateId = () =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const useTrafficStore = create<TrafficState>((set, get) => ({
  packets: [],
  anomalies: [],
  selectedIP: null,
  currentTime: Date.now(),
  startTime: Date.now(),
  isPaused: false,
  isReplaying: false,
  historySnapshots: [],
  terrainHeights: initialHeights,
  ipStatsMap: {},
  selectedIPHistory: [],
  lastAnomalyTime: 0,

  addData: (packets) => {
    const state = get();
    if (state.isReplaying) return;
    set((prev) => {
      const newPackets = [...prev.packets, ...packets];
      const cutoff = Date.now() - 65000;
      const filtered = newPackets.filter((p) => p.timestamp > cutoff);
      return {
        packets: filtered,
        currentTime: Date.now(),
      };
    });
  },

  markAnomaly: (anomaly) => {
    set((prev) => ({
      anomalies: [...prev.anomalies, anomaly],
      lastAnomalyTime: Date.now(),
    }));
    setTimeout(() => {
      set((prev) => ({
        anomalies: prev.anomalies.filter((a) => a.id !== anomaly.id),
      }));
    }, anomaly.duration);
  },

  selectIP: (ip) => set({ selectedIP: ip, selectedIPHistory: [] }),

  setTime: (time) => set({ currentTime: time }),

  togglePause: () =>
    set((prev) => ({
      isPaused: !prev.isPaused,
    })),

  setPaused: (paused) => set({ isPaused: paused }),

  setReplaying: (replaying) => set({ isReplaying: replaying }),

  setTerrainHeights: (heights) => set({ terrainHeights: heights }),

  updateIPStatsMap: (map) => set({ ipStatsMap: map }),

  addSelectedIPHistory: (point) =>
    set((prev) => {
      const history = [...prev.selectedIPHistory, point];
      if (history.length > 60) history.shift();
      return { selectedIPHistory: history };
    }),

  clearAnomalies: () => set({ anomalies: [] }),

  cleanupOldData: (cutoffTime) => {
    set((prev) => ({
      packets: prev.packets.filter((p) => p.timestamp > cutoffTime),
      historySnapshots: prev.historySnapshots.filter((s) => s.time > cutoffTime),
    }));
  },
}));

export const GRID_SIZE_TIME = GRID_TIME;
export const GRID_SIZE_Z = GRID_Z;
export const MAX_TERRAIN_HEIGHT = 6;
