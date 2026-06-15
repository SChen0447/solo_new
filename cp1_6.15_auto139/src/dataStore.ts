import { create } from 'zustand';
import type { CelestialBody, FilterOption, SortOption } from './types';

function computeVisibleIds(
  bodies: CelestialBody[],
  filter: FilterOption
): Set<string> {
  const ids = new Set<string>();
  for (const body of bodies) {
    if (filter === 'all') {
      ids.add(body.id);
    } else if (filter === 'bright' && body.brightness > 80) {
      ids.add(body.id);
    } else if (filter === 'medium' && body.brightness >= 50 && body.brightness <= 80) {
      ids.add(body.id);
    } else if (filter === 'dim' && body.brightness < 50) {
      ids.add(body.id);
    }
  }
  return ids;
}

function applySort(bodies: CelestialBody[], sort: SortOption): CelestialBody[] {
  const arr = bodies.slice();
  switch (sort) {
    case 'brightnessDesc':
      return arr.sort((a, b) => b.brightness - a.brightness);
    case 'brightnessAsc':
      return arr.sort((a, b) => a.brightness - b.brightness);
    case 'xAsc':
      return arr.sort((a, b) => a.x - b.x);
    default:
      return arr;
  }
}

interface CelestialStore {
  bodies: CelestialBody[];
  sortedBodies: CelestialBody[];
  visibleIds: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  filterOption: FilterOption;
  sortOption: SortOption;

  setBodies: (bodies: CelestialBody[]) => void;
  selectBody: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setFilter: (option: FilterOption) => void;
  setSort: (option: SortOption) => void;
  getBodyById: (id: string) => CelestialBody | undefined;
  getVisibleBodies: () => CelestialBody[];
}

type StoreSelector<T> = (s: CelestialStore) => T;
type StoreListener = (state: CelestialStore, prevState: CelestialStore) => void;

const baseStore = create<CelestialStore>((set, get) => ({
  bodies: [],
  sortedBodies: [],
  visibleIds: new Set(),
  selectedId: null,
  hoveredId: null,
  filterOption: 'all',
  sortOption: 'brightnessDesc',

  setBodies: (bodies) => {
    const st = get();
    const sorted = applySort(bodies, st.sortOption);
    const visible = computeVisibleIds(sorted, st.filterOption);
    set({
      bodies,
      sortedBodies: sorted,
      visibleIds: visible
    });
  },

  selectBody: (id) => set({ selectedId: id }),

  setHovered: (id) => set({ hoveredId: id }),

  setFilter: (option) => {
    const st = get();
    const visible = computeVisibleIds(st.bodies, option);
    set({
      filterOption: option,
      visibleIds: visible
    });
  },

  setSort: (option) => {
    const st = get();
    const sorted = applySort(st.bodies, option);
    set({
      sortOption: option,
      sortedBodies: sorted
    });
  },

  getBodyById: (id) => {
    return get().bodies.find((b) => b.id === id);
  },

  getVisibleBodies: () => {
    const st = get();
    return st.sortedBodies.filter((b) => st.visibleIds.has(b.id));
  }
}));

export const useCelestialStore = baseStore;

export function getStoreState(): CelestialStore {
  return baseStore.getState();
}

export function subscribeStore<T>(
  selector: StoreSelector<T>,
  cb: (value: T, prev: T) => void
): () => void {
  let prev = selector(getStoreState());
  return baseStore.subscribe((state) => {
    const curr = selector(state);
    if (curr !== prev) {
      const prevSnapshot = prev;
      prev = curr;
      cb(curr, prevSnapshot);
    }
  });
}

export function subscribeStoreRaw(listener: StoreListener): () => void {
  return baseStore.subscribe(listener);
}
