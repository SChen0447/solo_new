import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StoreState, Element, Substance, Recipe } from './types';

const basicElements: Element[] = [
  {
    id: 'fire',
    name: '火',
    type: 'fire',
    icon: 'fa-fire',
    color: '#FF6B35',
    glowColor: 'rgba(255, 107, 53, 0.6)',
    category: 'basic',
    description: '炽热的火焰，万物之源',
    isBasic: true,
  },
  {
    id: 'water',
    name: '水',
    type: 'water',
    icon: 'fa-droplet',
    color: '#4DA8DA',
    glowColor: 'rgba(77, 168, 218, 0.6)',
    category: 'basic',
    description: '清澈的流水，生命之源',
    isBasic: true,
  },
  {
    id: 'earth',
    name: '土',
    type: 'earth',
    icon: 'fa-mountain',
    color: '#8B6914',
    glowColor: 'rgba(139, 105, 20, 0.6)',
    category: 'basic',
    description: '厚重的大地，承载万物',
    isBasic: true,
  },
  {
    id: 'air',
    name: '气',
    type: 'air',
    icon: 'fa-wind',
    color: '#A8E6CF',
    glowColor: 'rgba(168, 230, 207, 0.6)',
    category: 'basic',
    description: '无形的空气，流动不息',
    isBasic: true,
  },
];

const initialSubstances: Substance[] = [
  {
    id: 'fire',
    name: '火',
    icon: 'fa-fire',
    color: '#FF6B35',
    category: 'basic',
    description: '炽热的火焰，万物之源',
    recipeTree: ['fire'],
    hint: '基础元素之一',
    discovered: true,
  },
  {
    id: 'water',
    name: '水',
    icon: 'fa-droplet',
    color: '#4DA8DA',
    category: 'basic',
    description: '清澈的流水，生命之源',
    recipeTree: ['water'],
    hint: '基础元素之一',
    discovered: true,
  },
  {
    id: 'earth',
    name: '土',
    icon: 'fa-mountain',
    color: '#8B6914',
    category: 'basic',
    description: '厚重的大地，承载万物',
    recipeTree: ['earth'],
    hint: '基础元素之一',
    discovered: true,
  },
  {
    id: 'air',
    name: '气',
    icon: 'fa-wind',
    color: '#A8E6CF',
    category: 'basic',
    description: '无形的空气，流动不息',
    recipeTree: ['air'],
    hint: '基础元素之一',
    discovered: true,
  },
  {
    id: 'steam',
    name: '蒸汽',
    icon: 'fa-cloud',
    color: '#B8C5D6',
    category: 'gas',
    description: '水与火的结合，升腾的热气',
    recipeTree: ['water', 'fire'],
    hint: '将水加热至沸腾',
    discovered: false,
  },
  {
    id: 'mud',
    name: '泥土',
    icon: 'fa-shovel',
    color: '#6B4423',
    category: 'stone',
    description: '水与土的融合，肥沃的泥浆',
    recipeTree: ['water', 'earth'],
    hint: '水滋润大地的产物',
    discovered: false,
  },
  {
    id: 'lava',
    name: '熔岩',
    icon: 'fa-volcano',
    color: '#FF4500',
    category: 'liquid',
    description: '火与土的结晶，流动的烈焰',
    recipeTree: ['fire', 'earth'],
    hint: '大地深处的炽热熔岩',
    discovered: false,
  },
  {
    id: 'dust',
    name: '尘埃',
    icon: 'fa-dust',
    color: '#C4A484',
    category: 'gas',
    description: '土与气的舞动，飘浮的微粒',
    recipeTree: ['earth', 'air'],
    hint: '风吹过大地扬起的微粒',
    discovered: false,
  },
  {
    id: 'energy',
    name: '能量',
    icon: 'fa-bolt',
    color: '#FFD700',
    category: 'magic',
    description: '火与气的激荡，纯粹的力量',
    recipeTree: ['fire', 'air'],
    hint: '火焰与狂风碰撞产生的力量',
    discovered: false,
  },
  {
    id: 'mist',
    name: '薄雾',
    icon: 'fa-smog',
    color: '#87CEEB',
    category: 'gas',
    description: '水与气的交融，朦胧的水汽',
    recipeTree: ['water', 'air'],
    hint: '水面上升起的朦胧水汽',
    discovered: false,
  },
  {
    id: 'charcoal',
    name: '木炭',
    icon: 'fa-tree',
    color: '#2C2C2C',
    category: 'plant',
    description: '燃烧后的木材，纯净的碳',
    recipeTree: ['fire', 'earth', 'plant'],
    hint: '找一种可以燃烧的黑色物质',
    discovered: false,
  },
  {
    id: 'sulphur',
    name: '硫磺',
    icon: 'fa-gem',
    color: '#FFFF00',
    category: 'stone',
    description: '燃烧的黄色石头，炼金术的基础',
    recipeTree: ['fire', 'earth', 'fire'],
    hint: '找一种可以燃烧的黄色石头',
    discovered: false,
  },
  {
    id: 'iron',
    name: '铁',
    icon: 'fa-hammer',
    color: '#708090',
    category: 'metal',
    description: '从矿石中提炼的坚硬金属',
    recipeTree: ['fire', 'earth', 'earth'],
    hint: '在烈火中锻造的坚硬金属',
    discovered: false,
  },
  {
    id: 'gold',
    name: '黄金',
    icon: 'fa-coins',
    color: '#FFD700',
    category: 'metal',
    description: '永不褪色的贵重金属，炼金术的终极目标',
    recipeTree: ['fire', 'earth', 'sulphur', 'energy'],
    hint: '将硫磺与能量在熔炉中完美结合',
    discovered: false,
  },
  {
    id: 'herb',
    name: '草药',
    icon: 'fa-leaf',
    color: '#228B22',
    category: 'plant',
    description: '具有神奇疗效的植物',
    recipeTree: ['water', 'earth', 'water'],
    hint: '在水与土的滋养下生长的植物',
    discovered: false,
  },
  {
    id: 'potion',
    name: '药水',
    icon: 'fa-flask',
    color: '#9932CC',
    category: 'magic',
    description: '蕴含魔力的药剂',
    recipeTree: ['water', 'herb', 'energy'],
    hint: '将草药与能量融入水中',
    discovered: false,
  },
  {
    id: 'crystal',
    name: '水晶',
    icon: 'fa-diamond',
    color: '#E0FFFF',
    category: 'stone',
    description: '纯净的能量结晶',
    recipeTree: ['earth', 'energy', 'water'],
    hint: '能量在水与土中凝结成的宝石',
    discovered: false,
  },
  {
    id: 'philosopher_stone',
    name: '贤者之石',
    icon: 'fa-star',
    color: '#FF1493',
    category: 'magic',
    description: '传说中的炼金术终极产物，能将任何物质转化为黄金',
    recipeTree: ['gold', 'crystal', 'potion', 'energy'],
    hint: '炼金术的终极奥秘，需要黄金、水晶、药水和能量的完美融合',
    discovered: false,
  },
];

const initialRecipes: Recipe[] = [
  { id: 'r1', element1Id: 'fire', element2Id: 'water', resultId: 'steam', particleColor: '#B8C5D6' },
  { id: 'r2', element1Id: 'water', element2Id: 'earth', resultId: 'mud', particleColor: '#6B4423' },
  { id: 'r3', element1Id: 'fire', element2Id: 'earth', resultId: 'lava', particleColor: '#FF4500' },
  { id: 'r4', element1Id: 'earth', element2Id: 'air', resultId: 'dust', particleColor: '#C4A484' },
  { id: 'r5', element1Id: 'fire', element2Id: 'air', resultId: 'energy', particleColor: '#FFD700' },
  { id: 'r6', element1Id: 'water', element2Id: 'air', resultId: 'mist', particleColor: '#87CEEB' },
  { id: 'r7', element1Id: 'lava', element2Id: 'water', resultId: 'charcoal', particleColor: '#2C2C2C' },
  { id: 'r8', element1Id: 'fire', element2Id: 'lava', resultId: 'sulphur', particleColor: '#FFFF00' },
  { id: 'r9', element1Id: 'lava', element2Id: 'earth', resultId: 'iron', particleColor: '#708090' },
  { id: 'r10', element1Id: 'sulphur', element2Id: 'energy', resultId: 'gold', particleColor: '#FFD700' },
  { id: 'r11', element1Id: 'mud', element2Id: 'water', resultId: 'herb', particleColor: '#228B22' },
  { id: 'r12', element1Id: 'herb', element2Id: 'energy', resultId: 'potion', particleColor: '#9932CC' },
  { id: 'r13', element1Id: 'energy', element2Id: 'mud', resultId: 'crystal', particleColor: '#E0FFFF' },
  { id: 'r14', element1Id: 'gold', element2Id: 'crystal', resultId: 'philosopher_stone', particleColor: '#FF1493' },
  { id: 'r15', element1Id: 'fire', element2Id: 'charcoal', resultId: 'energy', particleColor: '#8B0000' },
  { id: 'r16', element1Id: 'potion', element2Id: 'energy', resultId: 'philosopher_stone', particleColor: '#FF1493' },
];

const derivedElements: Element[] = initialSubstances
  .filter((s) => !s.discovered || !s.category || s.category !== 'basic')
  .map((s) => ({
    id: s.id,
    name: s.name,
    type: 'derived' as const,
    icon: s.icon,
    color: s.color,
    glowColor: s.color + '99',
    category: s.category,
    description: s.description,
    isBasic: false,
  }));

export const useStore = create<StoreState>((set, get) => ({
  elements: [...basicElements],
  substances: initialSubstances,
  recipes: initialRecipes,
  notes: [],
  fusionState: {
    isFusing: false,
    success: null,
    resultId: null,
    particleColor: '#888888',
    draggedElement: null,
    secondElement: null,
  },
  selectedSubstance: null,
  searchQuery: '',
  ratingFilter: null,
  draggedElement: null,

  setDraggedElement: (element) => set({ draggedElement: element }),

  startFusion: (element1, element2) => {
    const { recipes } = get();
    const recipe = recipes.find(
      (r) =>
        (r.element1Id === element1.id && r.element2Id === element2.id) ||
        (r.element1Id === element2.id && r.element2Id === element1.id)
    );

    if (recipe) {
      set({
        fusionState: {
          isFusing: true,
          success: true,
          resultId: recipe.resultId,
          particleColor: recipe.particleColor,
          draggedElement: element1,
          secondElement: element2,
        },
      });
    } else {
      set({
        fusionState: {
          isFusing: true,
          success: false,
          resultId: null,
          particleColor: '#888888',
          draggedElement: element1,
          secondElement: element2,
        },
      });
    }
  },

  completeFusion: () => {
    const { fusionState } = get();
    if (fusionState.success && fusionState.resultId) {
      const { discoverSubstance, addNote, fusionState: state } = get();
      discoverSubstance(fusionState.resultId);
      if (state.draggedElement && state.secondElement) {
        addNote(state.draggedElement.id, state.secondElement.id, fusionState.resultId);
      }

      const { substances, elements } = get();
      const newSubstance = substances.find((s) => s.id === fusionState.resultId);
      if (newSubstance && !elements.find((e) => e.id === newSubstance.id)) {
        const newElement: Element = {
          id: newSubstance.id,
          name: newSubstance.name,
          type: 'derived',
          icon: newSubstance.icon,
          color: newSubstance.color,
          glowColor: newSubstance.color + '99',
          category: newSubstance.category,
          description: newSubstance.description,
          isBasic: false,
        };
        set({ elements: [...elements, newElement] });
      }
    }
  },

  failFusion: () => {
    set((state) => ({
      fusionState: {
        ...state.fusionState,
        isFusing: false,
        success: null,
        resultId: null,
        draggedElement: null,
        secondElement: null,
      },
    }));
  },

  resetFusion: () => {
    set({
      fusionState: {
        isFusing: false,
        success: null,
        resultId: null,
        particleColor: '#888888',
        draggedElement: null,
        secondElement: null,
      },
      draggedElement: null,
    });
  },

  discoverSubstance: (substanceId) => {
    set((state) => ({
      substances: state.substances.map((s) =>
        s.id === substanceId ? { ...s, discovered: true } : s
      ),
    }));
  },

  addNote: (element1Id, element2Id, resultId) => {
    const newNote = {
      id: uuidv4(),
      timestamp: new Date(),
      element1Id,
      element2Id,
      resultId,
      comment: '',
      rating: 0,
    };
    set((state) => ({ notes: [newNote, ...state.notes] }));
  },

  updateNoteComment: (noteId, comment) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, comment } : n)),
    }));
  },

  updateNoteRating: (noteId, rating) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, rating } : n)),
    }));
  },

  setSelectedSubstance: (substance) => set({ selectedSubstance: substance }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setRatingFilter: (rating) => set({ ratingFilter: rating }),
}));
