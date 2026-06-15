import { create } from 'zustand';

export type GamePhase = 'searching' | 'matching' | 'completed';

export interface Fragment {
  id: number;
  slotId: number;
  position: { x: number; y: number; z: number };
  originalPosition: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  size: number;
  color: string;
  matched: boolean;
  isHovered: boolean;
  isDragging: boolean;
  vertices: { x: number; y: number }[];
}

export interface Slot {
  id: number;
  position: { x: number; y: number; z: number };
  fragmentId: number;
  matched: boolean;
  isHighlighted: boolean;
}

export interface RippleEffect {
  id: number;
  position: { x: number; y: number; z: number };
  startTime: number;
}

interface GameState {
  fragments: Fragment[];
  slots: Slot[];
  gamePhase: GamePhase;
  selectedFragmentId: number | null;
  matchedCount: number;
  totalFragments: number;
  clueText: string;
  clueRevealed: boolean;
  ripples: RippleEffect[];
  backgroundTransition: number;
  generateLayout: () => void;
  setSelectedFragment: (id: number | null) => void;
  setFragmentHover: (id: number, hovered: boolean) => void;
  setFragmentDragging: (id: number, dragging: boolean) => void;
  updateFragmentPosition: (id: number, x: number, y: number, z: number) => void;
  updateFragmentRotation: (id: number, x: number, y: number, z: number) => void;
  setSlotHighlighted: (id: number, highlighted: boolean) => void;
  matchFragment: (fragmentId: number, slotId: number) => void;
  snapFragmentToSlot: (fragmentId: number) => void;
  resetFragmentPosition: (fragmentId: number) => void;
  addRipple: (position: { x: number; y: number; z: number }) => void;
  removeRipple: (id: number) => void;
  setBackgroundTransition: (value: number) => void;
  resetGame: () => void;
}

const CLUE_TEXTS = [
  '那年夏天，阳光透过树叶洒在石板路上，我们笑着奔跑，说要永远做最好的朋友，那些日子像金子一样闪闪发光。',
  '老旧的钟表停在三点十七分，窗外的雨一直下，茶杯里的热气慢慢消散，而你的笑容却永远定格在那一刻。',
  '记忆中的灯塔依然亮着，海浪拍打着礁石，你说要一起看遍世界的日出，我默默记下了这个未曾实现的约定。'
];

function generateIrregularPolygon(size: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = [];
  const sides = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + Math.random() * 0.3;
    const r = size * (0.7 + Math.random() * 0.3);
    vertices.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r
    });
  }
  return vertices;
}

function generateFragmentsAndSlots(): { fragments: Fragment[]; slots: Slot[] } {
  const fragments: Fragment[] = [];
  const slots: Slot[] = [];
  const count = 8;

  for (let i = 0; i < count; i++) {
    const slotAngle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const slotRadius = 1.5 + Math.random() * 1.5;
    const slotPos = {
      x: Math.cos(slotAngle) * slotRadius,
      y: 0,
      z: Math.sin(slotAngle) * slotRadius
    };

    const fragAngle = slotAngle + Math.PI + (Math.random() - 0.5) * 0.5;
    const fragRadius = 4 + Math.random() * 2;
    const fragPos = {
      x: Math.cos(fragAngle) * fragRadius,
      y: 0.05,
      z: Math.sin(fragAngle) * fragRadius
    };

    const size = 0.4 + Math.random() * 0.4;
    const vertices = generateIrregularPolygon(size);

    slots.push({
      id: i,
      position: slotPos,
      fragmentId: i,
      matched: false,
      isHighlighted: false
    });

    fragments.push({
      id: i,
      slotId: i,
      position: { ...fragPos },
      originalPosition: { ...fragPos },
      targetPosition: { ...slotPos },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      size,
      color: '#ffcc00',
      matched: false,
      isHovered: false,
      isDragging: false,
      vertices
    });
  }

  return { fragments, slots };
}

export const useGameStore = create<GameState>((set, get) => {
  const initial = generateFragmentsAndSlots();
  return {
    fragments: initial.fragments,
    slots: initial.slots,
    gamePhase: 'searching',
    selectedFragmentId: null,
    matchedCount: 0,
    totalFragments: 8,
    clueText: CLUE_TEXTS[Math.floor(Math.random() * CLUE_TEXTS.length)],
    clueRevealed: false,
    ripples: [],
    backgroundTransition: 0,

    generateLayout: () => {
      const { fragments, slots } = generateFragmentsAndSlots();
      set({
        fragments,
        slots,
        gamePhase: 'searching',
        selectedFragmentId: null,
        matchedCount: 0,
        clueText: CLUE_TEXTS[Math.floor(Math.random() * CLUE_TEXTS.length)],
        clueRevealed: false,
        ripples: [],
        backgroundTransition: 0
      });
    },

    setSelectedFragment: (id) => set({ selectedFragmentId: id }),

    setFragmentHover: (id, hovered) =>
      set((state) => ({
        fragments: state.fragments.map((f) =>
          f.id === id ? { ...f, isHovered: hovered } : f
        )
      })),

    setFragmentDragging: (id, dragging) =>
      set((state) => ({
        fragments: state.fragments.map((f) =>
          f.id === id ? { ...f, isDragging: dragging } : f
        ),
        gamePhase: dragging ? 'matching' : state.gamePhase
      })),

    updateFragmentPosition: (id, x, y, z) =>
      set((state) => ({
        fragments: state.fragments.map((f) =>
          f.id === id ? { ...f, position: { x, y, z } } : f
        )
      })),

    updateFragmentRotation: (id, x, y, z) =>
      set((state) => ({
        fragments: state.fragments.map((f) =>
          f.id === id ? { ...f, rotation: { x, y, z } } : f
        )
      })),

    setSlotHighlighted: (id, highlighted) =>
      set((state) => ({
        slots: state.slots.map((s) =>
          s.id === id ? { ...s, isHighlighted: highlighted } : s
        )
      })),

    matchFragment: (fragmentId, slotId) =>
      set((state) => {
        const newFragments = state.fragments.map((f) =>
          f.id === fragmentId ? { ...f, matched: true, isDragging: false } : f
        );
        const newSlots = state.slots.map((s) =>
          s.id === slotId ? { ...s, matched: true, isHighlighted: false } : s
        );
        const newMatchedCount = state.matchedCount + 1;
        const allMatched = newMatchedCount >= state.totalFragments;
        return {
          fragments: newFragments,
          slots: newSlots,
          matchedCount: newMatchedCount,
          selectedFragmentId: null,
          gamePhase: allMatched ? 'completed' : state.gamePhase,
          clueRevealed: allMatched
        };
      }),

    snapFragmentToSlot: (fragmentId) => {
      const state = get();
      const fragment = state.fragments.find((f) => f.id === fragmentId);
      if (!fragment) return;
      set((s) => ({
        fragments: s.fragments.map((f) =>
          f.id === fragmentId
            ? {
                ...f,
                position: { ...f.targetPosition },
                rotation: { x: 0, y: 0, z: 0 }
              }
            : f
        )
      }));
    },

    resetFragmentPosition: (fragmentId) =>
      set((state) => ({
        fragments: state.fragments.map((f) =>
          f.id === fragmentId
            ? {
                ...f,
                position: { ...f.originalPosition },
                isDragging: false,
                rotation: { x: 0, y: f.rotation.y, z: 0 }
              }
            : f
        ),
        selectedFragmentId: null
      })),

    addRipple: (position) =>
      set((state) => ({
        ripples: [
          ...state.ripples,
          {
            id: Date.now() + Math.random(),
            position,
            startTime: performance.now()
          }
        ]
      })),

    removeRipple: (id) =>
      set((state) => ({
        ripples: state.ripples.filter((r) => r.id !== id)
      })),

    setBackgroundTransition: (value) => set({ backgroundTransition: value }),

    resetGame: () => {
      get().generateLayout();
    }
  };
});
