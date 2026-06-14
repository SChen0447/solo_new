export interface Scene {
  id: string;
  name: string;
  description: string;
  color: string;
  duration: number;
  order: number;
}

export interface Storyboard {
  id: string;
  name: string;
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}

export interface PreviewState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  progress: number;
  isFinished: boolean;
}

export const PRESET_COLORS = [
  '#e94560',
  '#f39c12',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
  '#e74c3c',
  '#f1c40f',
  '#00cec9',
  '#6c5ce7',
  '#fd79a8',
  '#636e72',
];

export const DEFAULT_SCENE: Omit<Scene, 'id' | 'order'> = {
  name: '',
  description: '',
  color: PRESET_COLORS[0],
  duration: 2,
};
