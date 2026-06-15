import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier(0.68,-0.55,0.27,1.55)'
  | 'cubic-bezier(0.25,0.46,0.45,0.94)'
  | 'cubic-bezier(0.175,0.885,0.32,1.275)'
  | 'steps(4,end)';

export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
export type FillMode = 'none' | 'forwards' | 'backwards' | 'both';

export interface AnimationParams {
  duration: number;
  delay: number;
  easing: EasingFunction;
  iterationCount: number;
  direction: AnimationDirection;
  fillMode: FillMode;
}

export interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  keyframes: string;
  framerMotion: Record<string, unknown>;
}

export interface PreviewElement {
  id: string;
  presetId: string;
  params: AnimationParams;
  color: string;
  name: string;
}

const PRESETS: AnimationPreset[] = [
  {
    id: 'fadeIn',
    name: '淡入',
    category: '透明度',
    color: '#667eea',
    keyframes: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    framerMotion: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
  },
  {
    id: 'slideIn',
    name: '滑入',
    category: '位移',
    color: '#764ba2',
    keyframes: `@keyframes slideIn {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
    framerMotion: {
      initial: { x: -100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
    },
  },
  {
    id: 'bounce',
    name: '弹跳',
    category: '弹性',
    color: '#f093fb',
    keyframes: `@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
}`,
    framerMotion: {
      initial: { y: 0 },
      animate: { y: [0, -30, 0, -15, 0] },
    },
  },
  {
    id: 'rotate',
    name: '旋转',
    category: '变换',
    color: '#4facfe',
    keyframes: `@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
    framerMotion: {
      initial: { rotate: 0 },
      animate: { rotate: 360 },
    },
  },
  {
    id: 'scale',
    name: '缩放',
    category: '变换',
    color: '#43e97b',
    keyframes: `@keyframes scale {
  from { transform: scale(0); }
  to { transform: scale(1); }
}`,
    framerMotion: {
      initial: { scale: 0 },
      animate: { scale: 1 },
    },
  },
  {
    id: 'flip',
    name: '翻转',
    category: '3D',
    color: '#fa709a',
    keyframes: `@keyframes flip {
  from { transform: perspective(400px) rotateY(0deg); }
  to { transform: perspective(400px) rotateY(180deg); }
}`,
    framerMotion: {
      initial: { rotateY: 0 },
      animate: { rotateY: 180 },
    },
  },
  {
    id: 'pulse',
    name: '脉冲',
    category: '弹性',
    color: '#fee140',
    keyframes: `@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}`,
    framerMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.1, 1] },
    },
  },
  {
    id: 'shake',
    name: '抖动',
    category: '弹性',
    color: '#ff9a9e',
    keyframes: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}`,
    framerMotion: {
      initial: { x: 0 },
      animate: { x: [0, -5, 5, -5, 5, -5, 5, -5, 5, 0] },
    },
  },
  {
    id: 'blink',
    name: '闪烁',
    category: '透明度',
    color: '#a18cd1',
    keyframes: `@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}`,
    framerMotion: {
      initial: { opacity: 1 },
      animate: { opacity: [1, 0, 1] },
    },
  },
  {
    id: 'gradientScroll',
    name: '渐变色滚动',
    category: '色彩',
    color: '#fad0c4',
    keyframes: `@keyframes gradientScroll {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`,
    framerMotion: {
      initial: { backgroundPosition: '0% 50%' },
      animate: { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] },
    },
  },
  {
    id: 'flip3d',
    name: '3D翻转',
    category: '3D',
    color: '#ffecd2',
    keyframes: `@keyframes flip3d {
  from { transform: perspective(600px) rotateX(0deg); }
  to { transform: perspective(600px) rotateX(360deg); }
}`,
    framerMotion: {
      initial: { rotateX: 0 },
      animate: { rotateX: 360 },
    },
  },
  {
    id: 'elasticScale',
    name: '弹性伸缩',
    category: '弹性',
    color: '#a1c4fd',
    keyframes: `@keyframes elasticScale {
  0% { transform: scale(1, 1); }
  25% { transform: scale(1.2, 0.8); }
  50% { transform: scale(0.9, 1.1); }
  75% { transform: scale(1.05, 0.95); }
  100% { transform: scale(1, 1); }
}`,
    framerMotion: {
      initial: { scale: 1 },
      animate: { scale: [1, 1.2, 0.9, 1.05, 1] },
    },
  },
];

const DEFAULT_PARAMS: AnimationParams = {
  duration: 1,
  delay: 0,
  easing: 'ease',
  iterationCount: 1,
  direction: 'normal',
  fillMode: 'forwards',
};

interface AnimationStore {
  presets: AnimationPreset[];
  selectedPresetId: string | null;
  currentParams: AnimationParams;
  previewElements: PreviewElement[];
  isExportOpen: boolean;
  isPresetsCollapsed: boolean;

  selectPreset: (presetId: string) => void;
  updateParams: (params: Partial<AnimationParams>) => void;
  addPreviewElement: () => void;
  removePreviewElement: (id: string) => void;
  openExport: () => void;
  closeExport: () => void;
  setPresetsCollapsed: (collapsed: boolean) => void;
  getSelectedPreset: () => AnimationPreset | undefined;
  generateCSSCode: () => string;
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  presets: PRESETS,
  selectedPresetId: null,
  currentParams: { ...DEFAULT_PARAMS },
  previewElements: [],
  isExportOpen: false,
  isPresetsCollapsed: false,

  selectPreset: (presetId: string) => {
    const preset = get().presets.find((p) => p.id === presetId);
    if (!preset) return;
    set({
      selectedPresetId: presetId,
      currentParams: { ...DEFAULT_PARAMS },
    });
  },

  updateParams: (params: Partial<AnimationParams>) => {
    set((state) => ({
      currentParams: { ...state.currentParams, ...params },
    }));
  },

  addPreviewElement: () => {
    const { selectedPresetId, currentParams, presets, previewElements } = get();
    if (!selectedPresetId) return;
    if (previewElements.length >= 4) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    const newElement: PreviewElement = {
      id: uuidv4(),
      presetId: selectedPresetId,
      params: { ...currentParams },
      color: preset.color,
      name: preset.name,
    };
    set({ previewElements: [...previewElements, newElement] });
  },

  removePreviewElement: (id: string) => {
    set((state) => ({
      previewElements: state.previewElements.filter((el) => el.id !== id),
    }));
  },

  openExport: () => set({ isExportOpen: true }),
  closeExport: () => set({ isExportOpen: false }),
  setPresetsCollapsed: (collapsed: boolean) => set({ isPresetsCollapsed: collapsed }),

  getSelectedPreset: () => {
    const { selectedPresetId, presets } = get();
    return presets.find((p) => p.id === selectedPresetId);
  },

  generateCSSCode: () => {
    const { selectedPresetId, currentParams, presets, previewElements } = get();
    const activeElements = previewElements.length > 0 ? previewElements : [];
    const preset = presets.find((p) => p.id === selectedPresetId);

    let code = '';

    if (preset) {
      code += preset.keyframes + '\n\n';
      const iterCount =
        currentParams.iterationCount === 0 ? 'infinite' : String(currentParams.iterationCount);
      code += `.animation-${preset.id} {\n`;
      code += `  animation-name: ${preset.id};\n`;
      code += `  animation-duration: ${currentParams.duration}s;\n`;
      code += `  animation-delay: ${currentParams.delay}s;\n`;
      code += `  animation-timing-function: ${currentParams.easing};\n`;
      code += `  animation-iteration-count: ${iterCount};\n`;
      code += `  animation-direction: ${currentParams.direction};\n`;
      code += `  animation-fill-mode: ${currentParams.fillMode};\n`;
      code += `}\n`;
    }

    for (const el of activeElements) {
      const elPreset = presets.find((p) => p.id === el.presetId);
      if (elPreset && elPreset.id !== selectedPresetId) {
        code += '\n' + elPreset.keyframes + '\n\n';
      }
      const iterCount2 = el.params.iterationCount === 0 ? 'infinite' : String(el.params.iterationCount);
      const pId = el.presetId;
      code += `.animation-${el.id} {\n`;
      code += `  animation-name: ${pId};\n`;
      code += `  animation-duration: ${el.params.duration}s;\n`;
      code += `  animation-delay: ${el.params.delay}s;\n`;
      code += `  animation-timing-function: ${el.params.easing};\n`;
      code += `  animation-iteration-count: ${iterCount2};\n`;
      code += `  animation-direction: ${el.params.direction};\n`;
      code += `  animation-fill-mode: ${el.params.fillMode};\n`;
      code += `}\n`;
    }

    if (!code) {
      code = '/* 请先选择一个动画预设 */\n';
    }

    return code;
  },
}));
