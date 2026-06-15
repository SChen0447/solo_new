import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type FragmentRarity = 'common' | 'rare' | 'legendary';

export interface MemoryFragment {
  id: string;
  order: number;
  icon: string;
  rarity: FragmentRarity;
  color: string;
  story: string;
  collected: boolean;
  collectedTime: number;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
}

export interface TimelineSlot {
  index: number;
  fragmentId: string | null;
}

export interface CollectingAnimation {
  fragmentId: string;
  startTime: number;
  fromX: number;
  fromY: number;
}

export interface DragState {
  fragmentId: string;
  offsetX: number;
  offsetY: number;
  source: 'backpack' | 'timeline';
  sourceSlotIndex?: number;
}

export interface StoryPopup {
  text: string;
  visible: boolean;
}

const RARITY_COLORS: Record<FragmentRarity, string> = {
  common: '#c0c0c0',
  rare: '#ffd700',
  legendary: '#a855f7',
};

const ICONS = ['🔑', '⏰', '🪶', '🕯️', '📖', '🗝️', '⭐', '🌙', '🔮', '💎', '🦋', '🎵', '🏹', '🎭', '🌙'];

const STORIES = [
  '在遗忘的城堡深处，第一缕记忆之光穿透了尘封的窗户。那是一把古老的钥匙，打开了通往过去的大门...',
  '时钟的指针开始倒转，时间在这片空间中不再线性流动。每一个碎片都是一段被遗忘的时光...',
  '羽毛从天而降，承载着某种远古的讯息。它轻轻触碰水面，涟漪中映出了模糊的面孔...',
  '烛火摇曳，照亮了墙壁上刻满的文字。这些文字诉说着一个关于失落王国的故事...',
  '书页翻动，墨迹在纸上重新凝聚。文字组合成了新的篇章，揭示了记忆碎片的真正意义...',
];

const RARITY_DISTRIBUTION: FragmentRarity[] = [
  'common','common','common','common','common','common','common',
  'rare','rare','rare','rare','rare',
  'legendary','legendary','legendary',
];

function generateFragments(): MemoryFragment[] {
  const shuffled = [...RARITY_DISTRIBUTION].sort(() => Math.random() - 0.5);
  return shuffled.map((rarity, i) => ({
    id: uuidv4(),
    order: i + 1,
    icon: ICONS[i % ICONS.length],
    rarity,
    color: RARITY_COLORS[rarity],
    story: STORIES[i % STORIES.length],
    collected: false,
    collectedTime: 0,
  }));
}

function loadProgress(): { collectedIds: string[]; unlockedStories: number } | null {
  try {
    const raw = localStorage.getItem('memory-fragment-progress');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveProgress(state: GameStore) {
  const collectedIds = state.fragments.filter(f => f.collected).map(f => f.id);
  const data = { collectedIds, unlockedStories: state.unlockedStories };
  localStorage.setItem('memory-fragment-progress', JSON.stringify(data));
}

export interface GameStore {
  fragments: MemoryFragment[];
  backpack: string[];
  timeline: TimelineSlot[];
  dragState: DragState | null;
  storyPopup: StoryPopup;
  unlockedStories: number;
  collectingAnimations: CollectingAnimation[];
  errorMessage: string;
  errorMessageTime: number;
  shakeBackpack: boolean;
  snapHighlightSlot: number | null;
  fps: number;
  sceneWidth: number;
  sceneHeight: number;
  fragmentsOnScene: { id: string; x: number; y: number }[];

  initScene: (width: number, height: number) => void;
  collectFragment: (id: string, canvasX: number, canvasY: number) => void;
  startDrag: (drag: DragState) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: (x: number, y: number) => void;
  cancelDrag: () => void;
  showStory: (text: string) => void;
  hideStory: () => void;
  setErrorMessage: (msg: string) => void;
  setFps: (fps: number) => void;
  validateTimeline: () => void;
  removeCollectingAnimation: (id: string) => void;
  markCollected: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  fragments: generateFragments(),
  backpack: [],
  timeline: Array.from({ length: 15 }, (_, i) => ({ index: i, fragmentId: null })),
  dragState: null,
  storyPopup: { text: '', visible: false },
  unlockedStories: 0,
  collectingAnimations: [],
  errorMessage: '',
  errorMessageTime: 0,
  shakeBackpack: false,
  snapHighlightSlot: null,
  fps: 60,
  sceneWidth: 1200,
  sceneHeight: 800,
  fragmentsOnScene: [],

  initScene: (width, height) => {
    const state = get();
    const padding = 50;
    const minDist = 90;
    const positions: { id: string; x: number; y: number }[] = [];

    const saved = loadProgress();
    let fragments = state.fragments;

    if (saved) {
      const collectedSet = new Set(saved.collectedIds);
      fragments = fragments.map(f => ({
        ...f,
        collected: collectedSet.has(f.id),
        collectedTime: collectedSet.has(f.id) ? Date.now() : 0,
      }));
    }

    for (const frag of fragments) {
      if (frag.collected) continue;
      let placed = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        const x = padding + Math.random() * (width - padding * 2);
        const y = padding + Math.random() * (height - padding * 2 - 160);
        const tooClose = positions.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        });
        if (!tooClose) {
          positions.push({ id: frag.id, x, y });
          placed = true;
          break;
        }
      }
      if (!placed) {
        positions.push({
          id: frag.id,
          x: padding + Math.random() * (width - padding * 2),
          y: padding + Math.random() * (height - padding * 2 - 160),
        });
      }
    }

    const backpack = fragments.filter(f => f.collected).map(f => f.id);

    let timeline = Array.from({ length: 15 }, (_, i) => ({ index: i, fragmentId: null as string | null }));
    let unlockedStories = saved ? saved.unlockedStories : 0;

    set({
      fragments,
      backpack,
      timeline,
      fragmentsOnScene: positions,
      sceneWidth: width,
      sceneHeight: height,
      unlockedStories,
    });
  },

  collectFragment: (id, canvasX, canvasY) => {
    const state = get();
    const frag = state.fragments.find(f => f.id === id);
    if (!frag || frag.collected) return;

    set(s => ({
      fragments: s.fragments.map(f =>
        f.id === id ? { ...f, collected: true, collectedTime: Date.now() } : f
      ),
      backpack: [...s.backpack, id],
      fragmentsOnScene: s.fragmentsOnScene.filter(f => f.id !== id),
      collectingAnimations: [
        ...s.collectingAnimations,
        { fragmentId: id, startTime: Date.now(), fromX: canvasX, fromY: canvasY },
      ],
    }));

    saveProgress(get());
  },

  startDrag: (drag) => {
    set({ dragState: drag });
  },

  updateDrag: (x, y) => {
    const state = get();
    if (!state.dragState) return;

    const timelineEl = document.getElementById('timeline-panel');
    if (timelineEl) {
      const rect = timelineEl.getBoundingClientRect();
      const relX = x - rect.left;
      const relY = y - rect.top;

      if (relY >= -30 && relY <= rect.height + 30) {
        const slotWidth = rect.width / 15;
        const slotIndex = Math.floor(relX / slotWidth);
        if (slotIndex >= 0 && slotIndex < 15) {
          const slotCenterX = slotIndex * slotWidth + slotWidth / 2;
          if (Math.abs(relX - slotCenterX) < 50) {
            set({ snapHighlightSlot: slotIndex });
            return;
          }
        }
      }
    }
    set({ snapHighlightSlot: null });
  },

  endDrag: (x, y) => {
    const state = get();
    if (!state.dragState) return;

    const drag = state.dragState;
    const timelineEl = document.getElementById('timeline-panel');
    let placed = false;
    let targetSlot = -1;

    if (timelineEl) {
      const rect = timelineEl.getBoundingClientRect();
      const relX = x - rect.left;
      const relY = y - rect.top;

      if (relY >= -30 && relY <= rect.height + 30) {
        const slotWidth = rect.width / 15;
        targetSlot = Math.floor(relX / slotWidth);
        if (targetSlot >= 0 && targetSlot < 15) {
          const slotCenterX = targetSlot * slotWidth + slotWidth / 2;
          if (Math.abs(relX - slotCenterX) < 50 && !state.timeline[targetSlot].fragmentId) {
            placed = true;
          }
        }
      }
    }

    if (placed && targetSlot >= 0) {
      const newTimeline = [...state.timeline];
      newTimeline[targetSlot] = { index: targetSlot, fragmentId: drag.fragmentId };

      let newBackpack = [...state.backpack];
      if (drag.source === 'backpack') {
        newBackpack = newBackpack.filter(id => id !== drag.fragmentId);
      } else if (drag.source === 'timeline' && drag.sourceSlotIndex !== undefined) {
        newTimeline[drag.sourceSlotIndex] = { index: drag.sourceSlotIndex, fragmentId: null };
      }

      set({
        timeline: newTimeline,
        backpack: newBackpack,
        dragState: null,
        snapHighlightSlot: null,
      });

      const placedCount = newTimeline.filter(s => s.fragmentId !== null).length;
      if (placedCount >= 5 && placedCount % 5 === 0) {
        setTimeout(() => get().validateTimeline(), 300);
      }
    } else {
      if (drag.source === 'timeline' && drag.sourceSlotIndex !== undefined) {
        const frag = state.timeline[drag.sourceSlotIndex]?.fragmentId;
        if (frag) {
          const newTimeline = [...state.timeline];
          newTimeline[drag.sourceSlotIndex] = { index: drag.sourceSlotIndex, fragmentId: null };
          set({
            timeline: newTimeline,
            backpack: [...state.backpack, frag],
            dragState: null,
            snapHighlightSlot: null,
            shakeBackpack: true,
          });
          setTimeout(() => set({ shakeBackpack: false }), 400);
          return;
        }
      }

      set({
        dragState: null,
        snapHighlightSlot: null,
        shakeBackpack: true,
      });
      setTimeout(() => set({ shakeBackpack: false }), 400);
    }
  },

  cancelDrag: () => {
    set({ dragState: null, snapHighlightSlot: null });
  },

  showStory: (text) => {
    set({ storyPopup: { text, visible: true } });
  },

  hideStory: () => {
    set({ storyPopup: { text: '', visible: false } });
  },

  setErrorMessage: (msg) => {
    set({ errorMessage: msg, errorMessageTime: Date.now(), shakeBackpack: true });
    setTimeout(() => set({ shakeBackpack: false }), 400);
    setTimeout(() => set({ errorMessage: '' }), 1500);
  },

  setFps: (fps) => set({ fps }),

  removeCollectingAnimation: (id) => {
    set(s => ({
      collectingAnimations: s.collectingAnimations.filter(a => a.fragmentId !== id),
    }));
  },

  markCollected: (id) => {
    set(s => ({
      fragments: s.fragments.map(f =>
        f.id === id ? { ...f, collected: true } : f
      ),
    }));
    saveProgress(get());
  },

  validateTimeline: () => {
    const state = get();
    const placedSlots = state.timeline.filter(s => s.fragmentId !== null).sort((a, b) => a.index - b.index);
    if (placedSlots.length < 5) return;

    const firstThree = placedSlots.slice(0, 3);
    let correct = true;
    for (let i = 0; i < firstThree.length; i++) {
      const frag = state.fragments.find(f => f.id === firstThree[i].fragmentId);
      if (!frag || frag.order !== firstThree[i].index + 1) {
        correct = false;
        break;
      }
    }

    if (correct) {
      const storyIndex = state.unlockedStories;
      const storyFragments = placedSlots.slice(0, 5);
      const story = storyFragments
        .map(s => {
          const frag = state.fragments.find(f => f.id === s.fragmentId);
          return frag ? frag.story : '';
        })
        .join('\n\n');

      set(s => ({
        unlockedStories: s.unlockedStories + 1,
        storyPopup: { text: story || STORIES[storyIndex % STORIES.length], visible: true },
      }));
      playSuccessSound();
      saveProgress(get());
    } else {
      set(s => {
        const returnIds = s.timeline.filter(slot => slot.fragmentId !== null).map(slot => slot.fragmentId!);
        return {
          timeline: Array.from({ length: 15 }, (_, i) => ({ index: i, fragmentId: null as string | null })),
          backpack: [...s.backpack, ...returnIds],
          errorMessage: '顺序错误',
          errorMessageTime: Date.now(),
          shakeBackpack: true,
        };
      });
      setTimeout(() => set({ shakeBackpack: false }), 400);
      setTimeout(() => set({ errorMessage: '' }), 1500);
      playErrorSound();
      saveProgress(get());
    }
  },
}));

function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function playErrorSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}
