import { create } from 'zustand';
import * as THREE from 'three';

export interface GraphNode {
  id: string;
  name: string;
  color: string;
  position: THREE.Vector3;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  isAddingNode: boolean;
  pendingNodePosition: THREE.Vector3 | null;
  cameraState: CameraState;

  addNode: (name: string, color: string, position: THREE.Vector3) => string;
  deleteNode: (id: string) => void;
  addEdge: (source: string, target: string) => boolean;
  deleteEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  setIsAddingNode: (isAdding: boolean, position?: THREE.Vector3 | null) => void;
  setCameraState: (position: THREE.Vector3, target: THREE.Vector3) => void;
  resetView: () => void;
  getNodeById: (id: string) => GraphNode | undefined;
  getEdgesForNode: (nodeId: string) => GraphEdge[];
  hasEdgeBetween: (source: string, target: string) => boolean;
}

let nodeIdCounter = 0;
let edgeIdCounter = 0;

const generateNodeId = () => `node_${++nodeIdCounter}`;
const generateEdgeId = () => `edge_${++edgeIdCounter}`;

const defaultCameraState: CameraState = {
  position: new THREE.Vector3(0, 5, 15),
  target: new THREE.Vector3(0, 0, 0),
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
  isAddingNode: false,
  pendingNodePosition: null,
  cameraState: defaultCameraState,

  addNode: (name, color, position) => {
    const id = generateNodeId();
    const node: GraphNode = {
      id,
      name,
      color,
      position: position.clone(),
    };
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
    return id;
  },

  deleteNode: (id) => {
    set((state) => {
      const newEdges = state.edges.filter(
        (e) => e.source !== id && e.target !== id
      );
      const newNodes = state.nodes.filter((n) => n.id !== id);
      return {
        nodes: newNodes,
        edges: newEdges,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  },

  addEdge: (source, target) => {
    if (source === target) return false;
    const state = get();
    if (state.hasEdgeBetween(source, target)) return false;
    
    const id = generateEdgeId();
    const edge: GraphEdge = { id, source, target };
    set((state) => ({
      edges: [...state.edges, edge],
    }));
    return true;
  },

  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  selectEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },

  setHoveredNode: (id) => {
    set({ hoveredNodeId: id });
  },

  setHoveredEdge: (id) => {
    set({ hoveredEdgeId: id });
  },

  setIsAddingNode: (isAdding, position = null) => {
    set({ isAddingNode: isAdding, pendingNodePosition: position });
  },

  setCameraState: (position, target) => {
    set({
      cameraState: {
        position: position.clone(),
        target: target.clone(),
      },
    });
  },

  resetView: () => {
    set({
      cameraState: {
        position: defaultCameraState.position.clone(),
        target: defaultCameraState.target.clone(),
      },
    });
  },

  getNodeById: (id) => {
    return get().nodes.find((n) => n.id === id);
  },

  getEdgesForNode: (nodeId) => {
    return get().edges.filter((e) => e.source === nodeId || e.target === nodeId);
  },

  hasEdgeBetween: (source, target) => {
    const state = get();
    return state.edges.some(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );
  },
}));
