import { create } from 'zustand';
import {
  Node,
  PipeSegmentData,
  PipeType,
  ViewMode,
  NetworkData,
} from '../types';
import { generateNetworkData, startSensorUpdates, stopSensorUpdates } from '../data/networkData';

interface NetworkState {
  nodes: Node[];
  pipes: PipeSegmentData[];
  selectedNodeId: string | null;
  selectedPipeId: string | null;
  visibleTypes: Record<PipeType, boolean>;
  viewMode: ViewMode;
  initialized: boolean;

  initData: () => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedPipe: (id: string | null) => void;
  setTypeVisibility: (type: PipeType, visible: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  updateSensorValue: (nodeId: string, value: number) => void;
  getNodeById: (id: string) => Node | undefined;
  getPipeById: (id: string) => PipeSegmentData | undefined;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  nodes: [],
  pipes: [],
  selectedNodeId: null,
  selectedPipeId: null,
  visibleTypes: {
    drainage: true,
    gas: true,
    power: true,
    communication: true,
  },
  viewMode: 'top',
  initialized: false,

  initData: () => {
    if (get().initialized) return;

    const data: NetworkData = generateNetworkData();
    set({ nodes: data.nodes, pipes: data.pipes, initialized: true });

    startSensorUpdates(data.nodes, (nodeId, value) => {
      get().updateSensorValue(nodeId, value);
    });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id, selectedPipeId: null });
  },

  setSelectedPipe: (id) => {
    set({ selectedPipeId: id, selectedNodeId: null });
  },

  setTypeVisibility: (type, visible) => {
    set((state) => ({
      visibleTypes: {
        ...state.visibleTypes,
        [type]: visible,
      },
    }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  updateSensorValue: (nodeId, value) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              sensor: {
                ...node.sensor,
                value,
                history: [...node.sensor.history.slice(1), value],
              },
            }
          : node
      ),
    }));
  },

  getNodeById: (id) => {
    return get().nodes.find((n) => n.id === id);
  },

  getPipeById: (id) => {
    return get().pipes.find((p) => p.id === id);
  },
}));
