import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type FragmentStatus = 'unplaced' | 'dragging' | 'placed' | 'pending';

export interface Fragment {
  id: string;
  name: string;
  position: Vector3;
  targetPosition: Vector3;
  rotation: Vector3;
  targetRotation: Vector3;
  status: FragmentStatus;
  placed: boolean;
}

export type HistoryActionType = 'drag' | 'success' | 'error';

export interface HistoryRecord {
  id: string;
  type: HistoryActionType;
  action: string;
  timestamp: number;
  fragmentName?: string;
}

export interface BoneState {
  fragments: Fragment[];
  selectedFragmentId: string | null;
  draggingFragmentId: string | null;
  history: HistoryRecord[];
  progress: number;
  isCompleted: boolean;
  showError: string | null;
  errorPosition: Vector3 | null;

  setSelectedFragment: (id: string | null) => void;
  setDraggingFragment: (id: string | null) => void;
  updateFragmentPosition: (id: string, position: Vector3) => void;
  placeFragment: (id: string) => boolean;
  checkMagneticSnap: (id: string) => { shouldSnap: boolean; distance: number; nearestId: string | null };
  addHistoryRecord: (type: HistoryActionType, action: string, fragmentName?: string) => void;
  calculateProgress: () => number;
  resetAll: () => void;
  setShowError: (msg: string | null, position?: Vector3 | null) => void;
}

const FRAGMENT_DEFINITIONS: Omit<Fragment, 'id' | 'status' | 'placed' | 'position'>[] = [
  {
    name: '颅顶',
    targetPosition: { x: 0, y: 3, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    targetRotation: { x: 0, y: 0, z: 0 },
  },
  {
    name: '左颧骨',
    targetPosition: { x: -1.5, y: 1.5, z: 1.2 },
    rotation: { x: 0, y: 0.3, z: 0 },
    targetRotation: { x: 0, y: 0.3, z: 0 },
  },
  {
    name: '右颧骨',
    targetPosition: { x: 1.5, y: 1.5, z: 1.2 },
    rotation: { x: 0, y: -0.3, z: 0 },
    targetRotation: { x: 0, y: -0.3, z: 0 },
  },
  {
    name: '上颌骨',
    targetPosition: { x: 0, y: 0.5, z: 1.5 },
    rotation: { x: 0.1, y: 0, z: 0 },
    targetRotation: { x: 0.1, y: 0, z: 0 },
  },
  {
    name: '下颌骨',
    targetPosition: { x: 0, y: -1.5, z: 1.2 },
    rotation: { x: -0.1, y: 0, z: 0 },
    targetRotation: { x: -0.1, y: 0, z: 0 },
  },
  {
    name: '左犬齿',
    targetPosition: { x: -0.8, y: -0.5, z: 2 },
    rotation: { x: 0, y: 0, z: 0.1 },
    targetRotation: { x: 0, y: 0, z: 0.1 },
  },
  {
    name: '右犬齿',
    targetPosition: { x: 0.8, y: -0.5, z: 2 },
    rotation: { x: 0, y: 0, z: -0.1 },
    targetRotation: { x: 0, y: 0, z: -0.1 },
  },
  {
    name: '鼻骨',
    targetPosition: { x: 0, y: 1.8, z: 1.8 },
    rotation: { x: 0.2, y: 0, z: 0 },
    targetRotation: { x: 0.2, y: 0, z: 0 },
  },
];

const createInitialFragments = (): Fragment[] => {
  return FRAGMENT_DEFINITIONS.map((def, index) => ({
    id: `fragment-${index}`,
    ...def,
    position: { x: -8 + index * 2.2, y: -3, z: 0 },
    status: 'unplaced' as FragmentStatus,
    placed: false,
  }));
};

const distance = (a: Vector3, b: Vector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const MAGNETIC_THRESHOLD = 2;
const SNAP_THRESHOLD = 0.5;

export const useBoneStore = create<BoneState>((set, get) => ({
  fragments: createInitialFragments(),
  selectedFragmentId: null,
  draggingFragmentId: null,
  history: [],
  progress: 0,
  isCompleted: false,
  showError: null,
  errorPosition: null,

  setSelectedFragment: (id) => {
    set({ selectedFragmentId: id });
  },

  setDraggingFragment: (id) => {
    const { fragments } = get();
    const updatedFragments = fragments.map((f) => ({
      ...f,
      status: f.id === id ? 'dragging' : f.status,
    }));
    set({ draggingFragmentId: id, fragments: updatedFragments });
  },

  updateFragmentPosition: (id, position) => {
    const { fragments } = get();
    const updatedFragments = fragments.map((f) =>
      f.id === id ? { ...f, position } : f
    );
    set({ fragments: updatedFragments });
  },

  placeFragment: (id) => {
    const { fragments, addHistoryRecord } = get();
    const fragment = fragments.find((f) => f.id === id);
    
    if (!fragment) return false;

    const dist = distance(fragment.position, fragment.targetPosition);

    if (dist <= SNAP_THRESHOLD) {
      const updatedFragments = fragments.map((f) =>
        f.id === id
          ? {
              ...f,
              position: { ...f.targetPosition },
              rotation: { ...f.targetRotation },
              status: 'placed' as FragmentStatus,
              placed: true,
            }
          : f
      );

      const allPlaced = updatedFragments.every((f) => f.placed);

      set({
        fragments: updatedFragments,
        draggingFragmentId: null,
        isCompleted: allPlaced,
      });

      addHistoryRecord('success', `成功拼接 ${fragment.name}`, fragment.name);

      const progress = get().calculateProgress();
      set({ progress });

      return true;
    } else {
      addHistoryRecord('error', `拼接 ${fragment.name} 失败`, fragment.name);
      return false;
    }
  },

  checkMagneticSnap: (id) => {
    const { fragments } = get();
    const fragment = fragments.find((f) => f.id === id);
    
    if (!fragment || fragment.placed) {
      return { shouldSnap: false, distance: Infinity, nearestId: null };
    }

    const dist = distance(fragment.position, fragment.targetPosition);

    return {
      shouldSnap: dist <= MAGNETIC_THRESHOLD,
      distance: dist,
      nearestId: id,
    };
  },

  addHistoryRecord: (type, action, fragmentName) => {
    const { history } = get();
    const record: HistoryRecord = {
      id: uuidv4(),
      type,
      action,
      timestamp: Date.now(),
      fragmentName,
    };
    set({ history: [record, ...history] });
  },

  calculateProgress: () => {
    const { fragments } = get();
    const placedCount = fragments.filter((f) => f.placed).length;
    return (placedCount / fragments.length) * 100;
  },

  resetAll: () => {
    set({
      fragments: createInitialFragments(),
      selectedFragmentId: null,
      draggingFragmentId: null,
      progress: 0,
      isCompleted: false,
      showError: null,
      errorPosition: null,
    });
  },

  setShowError: (msg, position = null) => {
    set({ showError: msg, errorPosition: position });
  },
}));

export { MAGNETIC_THRESHOLD, SNAP_THRESHOLD };
