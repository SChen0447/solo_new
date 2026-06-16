import { create } from 'zustand';
import type { Pet, PetState, Task, DailyHistory } from '../../../shared/types.js';

type PetStoreState = {
  petId: string | null;
  pet: Pet | null;
  petState: PetState;
  tasks: Task[];
  speed: 1 | 2 | 4;
  wsConnected: boolean;
  selectedDate: string | null;
  history: DailyHistory[];
  setPetId: (id: string | null) => void;
  setPet: (pet: Pet | null) => void;
  setPetState: (state: PetState) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  completeTask: (taskId: string) => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  setWsConnected: (connected: boolean) => void;
  setSelectedDate: (date: string | null) => void;
  setHistory: (history: DailyHistory[]) => void;
  reset: () => void;
};

const initialState = {
  petId: null as string | null,
  pet: null as Pet | null,
  petState: { hunger: 80, energy: 80, social: 80, hygiene: 80 } as PetState,
  tasks: [] as Task[],
  speed: 1 as 1 | 2 | 4,
  wsConnected: false,
  selectedDate: null as string | null,
  history: [] as DailyHistory[],
};

export const usePetStore = create<PetStoreState>((set) => ({
  ...initialState,
  setPetId: (id) => set({ petId: id }),
  setPet: (pet) => set({ pet }),
  setPetState: (state) => set({ petState: state }),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  completeTask: (taskId) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
      ),
    })),
  setSpeed: (speed) => set({ speed }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setHistory: (history) => set({ history }),
  reset: () => set(initialState),
}));
