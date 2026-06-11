export type BlockType = 'sticky' | 'image';

export interface BlockBase {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface StickyNoteBlock extends BlockBase {
  type: 'sticky';
  content: string;
  backgroundColor: string;
}

export interface ImageBlockData extends BlockBase {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  cropInfo?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: string;
  };
}

export type Block = StickyNoteBlock | ImageBlockData;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CanvasStateData {
  blocks: Block[];
  viewport: Viewport;
  history: { past: Block[][]; future: Block[][] };
  selectedBlockId: string | null;
  searchQuery: string;
  filterType: BlockType | 'all';
}

export const STICKY_COLORS = [
  '#FDE2E4',
  '#FAD2E1',
  '#E2ECE9',
  '#BEE1E6',
  '#F0E6D2',
  '#E4C1F9',
  '#CDB4DB',
  '#FFD6A5',
  '#CAFFBF',
  '#9BF6FF',
  '#A0C4FF',
  '#BDB2FF',
];

export const CARMEL_ORANGE = '#E07A5F';
export const HAZE_BLUE = '#81B29A';
export const WARM_WHITE = '#FFFBF5';

export const DEFAULT_STICKY_SIZE = { width: 240, height: 200 };
export const DEFAULT_IMAGE_SIZE = { width: 320, height: 240 };
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 3;
export const SNAP_THRESHOLD = 10;
export const ROTATION_SNAP = 15;

export function getRandomStickyColor(): string {
  return STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
}
