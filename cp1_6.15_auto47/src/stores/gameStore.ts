import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Resources,
  Star,
  GameEvent,
  Achievement,
  RouteConnection,
  RESOURCE_LIMITS,
  INITIAL_RESOURCES,
  ACHIEVEMENTS,
  StarType,
} from '../utils/constants';

export interface FloatMessage {
  id: string;
  text: string;
  isPositive: boolean;
}

interface GameState {
  resources: Resources;
  currentStarId: string | null;
  selectedStarId: string | null;
  stars: Star[];
  connections: RouteConnection[];
  achievements: Achievement[];
  activeEvent: GameEvent | null;
  isEventAnimating: boolean;
  visitedStars: Set<string>;
  floatMessages: FloatMessage[];
  isNavigating: boolean;
  navigationProgress: number;
  navigationPath: { from: Star; to: Star } | null;
  showAchievementPanel: boolean;
  newlyUnlockedAchievement: Achievement | null;

  setResources: (resources: Partial<Resources>) => void;
  addResources: (delta: Partial<Resources>) => void;
  setCurrentStar: (starId: string) => void;
  setSelectedStar: (starId: string | null) => void;
  setStars: (stars: Star[]) => void;
  setConnections: (connections: RouteConnection[]) => void;
  triggerEvent: (event: GameEvent) => void;
  closeEvent: () => void;
  unlockAchievement: (starType: StarType) => void;
  addFloatMessage: (text: string, isPositive: boolean) => void;
  removeFloatMessage: (id: string) => void;
  startNavigation: (from: Star, to: Star) => void;
  updateNavigationProgress: (progress: number) => void;
  completeNavigation: () => void;
  toggleAchievementPanel: (show?: boolean) => void;
  setNewlyUnlockedAchievement: (achievement: Achievement | null) => void;
  addVisitedStar: (starId: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  resources: { ...INITIAL_RESOURCES },
  currentStarId: null,
  selectedStarId: null,
  stars: [],
  connections: [],
  achievements: ACHIEVEMENTS.map((a) => ({ ...a })),
  activeEvent: null,
  isEventAnimating: false,
  visitedStars: new Set<string>(),
  floatMessages: [],
  isNavigating: false,
  navigationProgress: 0,
  navigationPath: null,
  showAchievementPanel: false,
  newlyUnlockedAchievement: null,

  setResources: (resources) =>
    set((state) => {
      const newResources = { ...state.resources };
      (Object.keys(resources) as (keyof Resources)[]).forEach((key) => {
        const val = resources[key];
        if (val !== undefined) {
          newResources[key] = Math.max(0, Math.min(RESOURCE_LIMITS[key], val));
        }
      });
      return { resources: newResources };
    }),

  addResources: (delta) =>
    set((state) => {
      const newResources = { ...state.resources };
      (Object.keys(delta) as (keyof Resources)[]).forEach((key) => {
        const val = delta[key];
        if (val !== undefined) {
          newResources[key] = Math.max(
            0,
            Math.min(RESOURCE_LIMITS[key], state.resources[key] + val)
          );
        }
      });
      return { resources: newResources };
    }),

  setCurrentStar: (starId) => set({ currentStarId: starId }),
  setSelectedStar: (starId) => set({ selectedStarId: starId }),
  setStars: (stars) => set({ stars }),
  setConnections: (connections) => set({ connections }),

  triggerEvent: (event) => set({ activeEvent: event, isEventAnimating: true }),

  closeEvent: () => {
    set({ isEventAnimating: false });
    setTimeout(() => {
      set({ activeEvent: null });
    }, 200);
  },

  unlockAchievement: (starType) =>
    set((state) => {
      const achievement = state.achievements.find(
        (a) => a.unlockCondition === starType && !a.unlocked
      );
      if (achievement) {
        const updatedAchievements = state.achievements.map((a) =>
          a.id === achievement.id ? { ...a, unlocked: true } : a
        );
        return {
          achievements: updatedAchievements,
          newlyUnlockedAchievement: { ...achievement, unlocked: true },
          showAchievementPanel: true,
        };
      }
      return {};
    }),

  addFloatMessage: (text, isPositive) => {
    const id = uuidv4();
    set((state) => ({
      floatMessages: [...state.floatMessages, { id, text, isPositive }],
    }));
    setTimeout(() => {
      get().removeFloatMessage(id);
    }, 2500);
  },

  removeFloatMessage: (id) =>
    set((state) => ({
      floatMessages: state.floatMessages.filter((m) => m.id !== id),
    })),

  startNavigation: (from, to) =>
    set({
      isNavigating: true,
      navigationProgress: 0,
      navigationPath: { from, to },
      selectedStarId: null,
    }),

  updateNavigationProgress: (progress) =>
    set({ navigationProgress: Math.min(1, Math.max(0, progress)) }),

  completeNavigation: () =>
    set((state) => ({
      isNavigating: false,
      navigationProgress: 0,
      currentStarId: state.navigationPath?.to.id ?? state.currentStarId,
      navigationPath: null,
    })),

  toggleAchievementPanel: (show) =>
    set((state) => ({
      showAchievementPanel: show !== undefined ? show : !state.showAchievementPanel,
    })),

  setNewlyUnlockedAchievement: (achievement) =>
    set({ newlyUnlockedAchievement: achievement }),

  addVisitedStar: (starId) =>
    set((state) => {
      const newSet = new Set(state.visitedStars);
      newSet.add(starId);
      return { visitedStars: newSet };
    }),

  resetGame: () =>
    set({
      resources: { ...INITIAL_RESOURCES },
      currentStarId: null,
      selectedStarId: null,
      stars: [],
      connections: [],
      achievements: ACHIEVEMENTS.map((a) => ({ ...a })),
      activeEvent: null,
      isEventAnimating: false,
      visitedStars: new Set<string>(),
      floatMessages: [],
      isNavigating: false,
      navigationProgress: 0,
      navigationPath: null,
      showAchievementPanel: false,
      newlyUnlockedAchievement: null,
    }),
}));
