import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RoleData {
  id: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  color: string;
  spotlightColor: string;
  spotlightIntensity: number;
  spotlightAngle: number;
}

export interface SceneData {
  id: string;
  name: string;
  backgroundColor: string;
  curtainColor: string;
  floorTexture: string;
  ambientColor: string;
  ambientIntensity: number;
  roles: RoleData[];
  scriptAnnotation: string;
  stageSize: Vec3;
}

export interface CameraPreset {
  name: string;
  position: Vec3;
  target: Vec3;
}

interface StageStore {
  scenes: SceneData[];
  activeSceneId: string;
  selectedRoleId: string | null;
  isPlaying: boolean;
  lightColor: string;
  lightIntensity: number;
  cameraPreset: string;
  addScene: () => void;
  removeScene: (sceneId: string) => void;
  switchScene: (sceneId: string) => void;
  updateScene: (sceneId: string, data: Partial<SceneData>) => void;
  addRole: (sceneId: string) => void;
  removeRole: (sceneId: string, roleId: string) => void;
  updateRole: (sceneId: string, roleId: string, data: Partial<RoleData>) => void;
  updateRolePosition: (sceneId: string, roleId: string, position: Vec3) => void;
  selectRole: (roleId: string | null) => void;
  setLightColor: (color: string) => void;
  setLightIntensity: (intensity: number) => void;
  setPlaying: (playing: boolean) => void;
  setCameraPreset: (preset: string) => void;
  getActiveScene: () => SceneData | undefined;
}

const defaultStageSize: Vec3 = { x: 12, y: 0.2, z: 8 };

const createDefaultRole = (index: number): RoleData => ({
  id: uuidv4(),
  name: `角色${index + 1}`,
  position: { x: -3 + index * 3, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  color: `hsl(${(index * 60) % 360}, 70%, 60%)`,
  spotlightColor: '#fff5e6',
  spotlightIntensity: 2.5,
  spotlightAngle: 0.5
});

const createDefaultScene = (index: number): SceneData => {
  const colorSchemes = [
    { bg: '#1a0d2e', curtain: '#4a1942', ambient: '#ffcc99', ambientInt: 0.3 },
    { bg: '#0d1a2e', curtain: '#19324a', ambient: '#99ccff', ambientInt: 0.25 },
    { bg: '#2e1a0d', curtain: '#4a3219', ambient: '#ffdd99', ambientInt: 0.35 },
    { bg: '#0d2e1a', curtain: '#194a32', ambient: '#99ffcc', ambientInt: 0.2 }
  ];
  const scheme = colorSchemes[index % colorSchemes.length];
  
  return {
    id: uuidv4(),
    name: `第${index + 1}幕`,
    backgroundColor: scheme.bg,
    curtainColor: scheme.curtain,
    floorTexture: 'wood',
    ambientColor: scheme.ambient,
    ambientIntensity: scheme.ambientInt,
    roles: [createDefaultRole(0), createDefaultRole(1), createDefaultRole(2)],
    scriptAnnotation: `【第${index + 1}幕】\n角色1：这是一段示例对话文本\n导演备注：注意灯光氛围的营造`,
    stageSize: defaultStageSize
  };
};

const initialScenes = [createDefaultScene(0), createDefaultScene(1), createDefaultScene(2)];

export const useStageStore = create<StageStore>((set, get) => ({
  scenes: initialScenes,
  activeSceneId: initialScenes[0].id,
  selectedRoleId: null,
  isPlaying: false,
  lightColor: '#fff5e6',
  lightIntensity: 2.5,
  cameraPreset: 'default',

  addScene: () => set((state) => {
    const newScene = createDefaultScene(state.scenes.length);
    return { scenes: [...state.scenes, newScene], activeSceneId: newScene.id };
  }),

  removeScene: (sceneId: string) => set((state) => {
    if (state.scenes.length <= 1) return state;
    const newScenes = state.scenes.filter(s => s.id !== sceneId);
    const newActiveId = state.activeSceneId === sceneId 
      ? newScenes[newScenes.length - 1].id 
      : state.activeSceneId;
    return { scenes: newScenes, activeSceneId: newActiveId };
  }),

  switchScene: (sceneId: string) => set({ activeSceneId: sceneId }),

  updateScene: (sceneId: string, data: Partial<SceneData>) => set((state) => ({
    scenes: state.scenes.map(s => s.id === sceneId ? { ...s, ...data } : s)
  })),

  addRole: (sceneId: string) => set((state) => ({
    scenes: state.scenes.map(s => {
      if (s.id !== sceneId) return s;
      const newRole = createDefaultRole(s.roles.length);
      return { ...s, roles: [...s.roles, newRole] };
    })
  })),

  removeRole: (sceneId: string, roleId: string) => set((state) => ({
    scenes: state.scenes.map(s => {
      if (s.id !== sceneId) return s;
      return { ...s, roles: s.roles.filter(r => r.id !== roleId) };
    }),
    selectedRoleId: state.selectedRoleId === roleId ? null : state.selectedRoleId
  })),

  updateRole: (sceneId: string, roleId: string, data: Partial<RoleData>) => set((state) => ({
    scenes: state.scenes.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        roles: s.roles.map(r => r.id === roleId ? { ...r, ...data } : r)
      };
    })
  })),

  updateRolePosition: (sceneId: string, roleId: string, position: Vec3) => set((state) => ({
    scenes: state.scenes.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        roles: s.roles.map(r => r.id === roleId ? { ...r, position } : r)
      };
    })
  })),

  selectRole: (roleId: string | null) => set({ selectedRoleId: roleId }),

  setLightColor: (color: string) => set({ lightColor: color }),

  setLightIntensity: (intensity: number) => set({ lightIntensity: intensity }),

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setCameraPreset: (preset: string) => set({ cameraPreset: preset }),

  getActiveScene: () => {
    const state = get();
    return state.scenes.find(s => s.id === state.activeSceneId);
  }
}));

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  top45: {
    name: '俯视45度',
    position: { x: 0, y: 14, z: 14 },
    target: { x: 0, y: 0, z: 0 }
  },
  front: {
    name: '正面平视',
    position: { x: 0, y: 3, z: 18 },
    target: { x: 0, y: 2, z: 0 }
  },
  left: {
    name: '左侧斜视',
    position: { x: -16, y: 6, z: 8 },
    target: { x: 0, y: 1, z: 0 }
  },
  free: {
    name: '自由视角',
    position: { x: 10, y: 8, z: 12 },
    target: { x: 0, y: 1, z: 0 }
  }
};
