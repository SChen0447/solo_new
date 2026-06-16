import { v4 as uuidv4 } from 'uuid';
import type { EmitterConfig, ColorStop, GradientType, MotionType } from './particleEngine';

export interface Artwork {
  id: string;
  name: string;
  backgroundColor: string;
  emitters: EmitterConfig[];
  createdAt: number;
  thumbnail?: string;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  emitters: EmitterConfig[];
}

const STORAGE_KEY = 'particle_art_workshop_artworks';

const defaultColors: Record<string, ColorStop[]> = {
  nebula: [
    { color: '#FF6B9D', position: 0 },
    { color: '#C44DFF', position: 0.5 },
    { color: '#4D9FFF', position: 1 }
  ],
  firework: [
    { color: '#FFD700', position: 0 },
    { color: '#FF6347', position: 0.5 },
    { color: '#FF1493', position: 1 }
  ],
  water: [
    { color: '#00CED1', position: 0 },
    { color: '#1E90FF', position: 0.5 },
    { color: '#0000CD', position: 1 }
  ],
  flame: [
    { color: '#FFFF00', position: 0 },
    { color: '#FFA500', position: 0.5 },
    { color: '#FF4500', position: 1 }
  ],
  forest: [
    { color: '#00FF7F', position: 0 },
    { color: '#32CD32', position: 0.5 },
    { color: '#228B22', position: 1 }
  ],
  galaxy: [
    { color: '#E0B0FF', position: 0 },
    { color: '#9370DB', position: 0.5 },
    { color: '#4B0082', position: 1 }
  ],
  ocean: [
    { color: '#00FFFF', position: 0 },
    { color: '#20B2AA', position: 0.5 },
    { color: '#008B8B', position: 1 }
  ],
  sunset: [
    { color: '#FFD700', position: 0 },
    { color: '#FF8C00', position: 0.5 },
    { color: '#DC143C', position: 1 }
  ],
  snow: [
    { color: '#FFFFFF', position: 0 },
    { color: '#E0FFFF', position: 0.5 },
    { color: '#B0E0E6', position: 1 }
  ],
  aurora: [
    { color: '#00FF7F', position: 0 },
    { color: '#00CED1', position: 0.33 },
    { color: '#9370DB', position: 0.66 },
    { color: '#FF69B4', position: 1 }
  ]
};

function createEmitter(
  x: number,
  y: number,
  rotation: number,
  particleCount: number,
  particleSize: number,
  colors: ColorStop[],
  gradientType: GradientType,
  motionType: MotionType,
  speed: number,
  lifetime: number
): EmitterConfig {
  return {
    id: uuidv4(),
    x,
    y,
    rotation,
    particleCount,
    particleSize,
    colors,
    gradientType,
    motionType,
    speed,
    lifetime
  };
}

export const presetTemplates: PresetTemplate[] = [
  {
    id: 'nebula',
    name: '星云',
    description: '梦幻般的星云效果，多种颜色交织',
    backgroundColor: '#0D0D1A',
    emitters: [
      createEmitter(400, 300, 0, 200, 4, defaultColors.nebula, 'radial', 'spiral', 1.5, 6),
      createEmitter(600, 200, 45, 150, 3, defaultColors.nebula, 'linear', 'sine', 2, 5),
      createEmitter(200, 400, 120, 100, 5, defaultColors.nebula, 'radial', 'linear', 1, 8)
    ]
  },
  {
    id: 'firework',
    name: '烟花',
    description: '绚丽多彩的烟花绽放效果',
    backgroundColor: '#0D0D1A',
    emitters: [
      createEmitter(400, 450, -90, 300, 3, defaultColors.firework, 'radial', 'linear', 3, 2.5),
      createEmitter(200, 400, -90, 200, 2.5, defaultColors.firework, 'linear', 'linear', 3.5, 2),
      createEmitter(600, 380, -90, 200, 2.5, defaultColors.firework, 'linear', 'linear', 3.5, 2)
    ]
  },
  {
    id: 'water',
    name: '水流',
    description: '清澈流动的水波纹效果',
    backgroundColor: '#0A1628',
    emitters: [
      createEmitter(100, 300, 0, 250, 4, defaultColors.water, 'linear', 'sine', 2, 6),
      createEmitter(100, 200, 15, 150, 3, defaultColors.water, 'linear', 'sine', 2.5, 5),
      createEmitter(100, 400, -15, 150, 3, defaultColors.water, 'linear', 'sine', 2.5, 5)
    ]
  },
  {
    id: 'flame',
    name: '火焰',
    description: '热烈燃烧的火焰效果',
    backgroundColor: '#1A0A00',
    emitters: [
      createEmitter(400, 500, -90, 400, 6, defaultColors.flame, 'radial', 'linear', 2.5, 3),
      createEmitter(350, 500, -80, 200, 4, defaultColors.flame, 'linear', 'sine', 2, 2.5),
      createEmitter(450, 500, -100, 200, 4, defaultColors.flame, 'linear', 'sine', 2, 2.5)
    ]
  },
  {
    id: 'forest',
    name: '森林',
    description: '生机盎然的绿色森林气息',
    backgroundColor: '#0A1A0A',
    emitters: [
      createEmitter(400, 550, -90, 150, 5, defaultColors.forest, 'radial', 'linear', 1.5, 7),
      createEmitter(250, 550, -90, 120, 4, defaultColors.forest, 'linear', 'sine', 1.2, 6),
      createEmitter(550, 550, -90, 120, 4, defaultColors.forest, 'linear', 'sine', 1.2, 6),
      createEmitter(400, 100, 90, 80, 3, defaultColors.forest, 'linear', 'linear', 0.8, 10)
    ]
  },
  {
    id: 'galaxy',
    name: '银河',
    description: '浩瀚宇宙中的银河星尘',
    backgroundColor: '#050510',
    emitters: [
      createEmitter(400, 300, 0, 500, 2, defaultColors.galaxy, 'radial', 'spiral', 1, 10),
      createEmitter(300, 250, 0, 200, 1.5, defaultColors.galaxy, 'linear', 'spiral', 0.8, 8),
      createEmitter(500, 350, 0, 200, 1.5, defaultColors.galaxy, 'linear', 'spiral', 0.8, 8)
    ]
  },
  {
    id: 'ocean',
    name: '深海',
    description: '深邃神秘的深海之光',
    backgroundColor: '#001a33',
    emitters: [
      createEmitter(400, 300, 0, 300, 3, defaultColors.ocean, 'radial', 'sine', 1.5, 7),
      createEmitter(200, 200, 45, 150, 2.5, defaultColors.ocean, 'linear', 'linear', 2, 5),
      createEmitter(600, 400, 225, 150, 2.5, defaultColors.ocean, 'linear', 'linear', 2, 5)
    ]
  },
  {
    id: 'sunset',
    name: '日落',
    description: '温暖浪漫的日落余晖',
    backgroundColor: '#1a0a00',
    emitters: [
      createEmitter(400, 500, -90, 350, 5, defaultColors.sunset, 'radial', 'linear', 2, 4),
      createEmitter(300, 500, -90, 200, 4, defaultColors.sunset, 'linear', 'sine', 1.8, 3.5),
      createEmitter(500, 500, -90, 200, 4, defaultColors.sunset, 'linear', 'sine', 1.8, 3.5)
    ]
  },
  {
    id: 'snow',
    name: '飘雪',
    description: '轻盈飘落的雪花效果',
    backgroundColor: '#0f1a24',
    emitters: [
      createEmitter(400, -20, 90, 200, 4, defaultColors.snow, 'radial', 'linear', 1, 10),
      createEmitter(200, -20, 90, 150, 3, defaultColors.snow, 'linear', 'sine', 0.8, 8),
      createEmitter(600, -20, 90, 150, 3, defaultColors.snow, 'linear', 'sine', 0.8, 8)
    ]
  },
  {
    id: 'aurora',
    name: '极光',
    description: '绚丽变幻的极光效果',
    backgroundColor: '#050510',
    emitters: [
      createEmitter(100, 200, 0, 200, 4, defaultColors.aurora, 'linear', 'sine', 2, 6),
      createEmitter(100, 350, 0, 200, 4, defaultColors.aurora, 'linear', 'sine', 2.2, 5.5),
      createEmitter(100, 500, 0, 200, 4, defaultColors.aurora, 'linear', 'sine', 1.8, 6.5)
    ]
  }
];

export function getPresetById(id: string): PresetTemplate | undefined {
  return presetTemplates.find(p => p.id === id);
}

export function getPresetByName(name: string): PresetTemplate | undefined {
  return presetTemplates.find(p => p.name === name);
}

export function loadArtworks(): Artwork[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load artworks:', e);
  }
  return [];
}

export function saveArtwork(artwork: Artwork): void {
  const artworks = loadArtworks();
  const existingIndex = artworks.findIndex(a => a.id === artwork.id);
  if (existingIndex >= 0) {
    artworks[existingIndex] = artwork;
  } else {
    artworks.push(artwork);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artworks));
  } catch (e) {
    console.error('Failed to save artwork:', e);
  }
}

export function deleteArtwork(id: string): void {
  const artworks = loadArtworks();
  const filtered = artworks.filter(a => a.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete artwork:', e);
  }
}

export function createArtworkFromEmitters(
  name: string,
  emitters: EmitterConfig[],
  backgroundColor: string,
  thumbnail?: string
): Artwork {
  return {
    id: uuidv4(),
    name,
    backgroundColor,
    emitters: emitters.map(e => ({ ...e, id: e.id || uuidv4() })),
    createdAt: Date.now(),
    thumbnail
  };
}

export function applyPresetToEmitters(preset: PresetTemplate, canvasWidth: number, canvasHeight: number): {
  emitters: EmitterConfig[];
  backgroundColor: string;
} {
  const scaleX = canvasWidth / 800;
  const scaleY = canvasHeight / 600;

  const emitters = preset.emitters.map(e => ({
    ...e,
    id: uuidv4(),
    x: e.x * scaleX,
    y: e.y * scaleY
  }));

  return {
    emitters,
    backgroundColor: preset.backgroundColor
  };
}
