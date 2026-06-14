import { create } from 'zustand';
import { generateId } from '@utils/bondHelper';

export interface Atom {
  id: string;
  element: string;
  position: [number, number, number];
}

export interface Bond {
  id: string;
  atom1Id: string;
  atom2Id: string;
  type: 'single' | 'double';
}

export interface MeasureResult {
  atom1Id: string;
  atom2Id: string;
  distance: number;
}

export type ToolMode = 'select' | 'bond' | 'measure';

export interface WarningRipple {
  id: string;
  atom1Id: string;
  atom2Id: string;
  timestamp: number;
}

export interface AtomStoreState {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  selectedBondId: string | null;
  allSelected: boolean;
  toolMode: ToolMode;
  bondClickBuffer: string | null;
  measureClickBuffer: string | null;
  measureResults: MeasureResult[];
  warningRipples: WarningRipple[];
  fps: number;
  addAtom: (element: string, position: [number, number, number]) => void;
  removeAtom: (id: string) => void;
  addBond: (atom1Id: string, atom2Id: string, type?: 'single' | 'double') => boolean;
  removeBond: (id: string) => void;
  selectAtom: (id: string | null) => void;
  selectBond: (id: string | null) => void;
  setAllSelected: (selected: boolean) => void;
  setToolMode: (mode: ToolMode) => void;
  handleAtomClickForBond: (atomId: string) => boolean;
  handleAtomClickForMeasure: (atomId: string) => void;
  clearMeasureResults: () => void;
  addWarningRipple: (atom1Id: string, atom2Id: string) => void;
  removeWarningRipple: (id: string) => void;
  setFps: (fps: number) => void;
  clearAll: () => void;
  exportData: () => string;
  updateAtomPosition: (id: string, position: [number, number, number]) => void;
}

export const useAtomStore = create<AtomStoreState>((set, get) => ({
  atoms: [],
  bonds: [],
  selectedAtomId: null,
  selectedBondId: null,
  allSelected: false,
  toolMode: 'select',
  bondClickBuffer: null,
  measureClickBuffer: null,
  measureResults: [],
  warningRipples: [],
  fps: 60,

  addAtom: (element, position) =>
    set((state) => ({
      atoms: [
        ...state.atoms,
        {
          id: generateId(),
          element,
          position,
        },
      ],
    })),

  removeAtom: (id) =>
    set((state) => ({
      atoms: state.atoms.filter((a) => a.id !== id),
      bonds: state.bonds.filter((b) => b.atom1Id !== id && b.atom2Id !== id),
      selectedAtomId: state.selectedAtomId === id ? null : state.selectedAtomId,
      measureResults: state.measureResults.filter(
        (m) => m.atom1Id !== id && m.atom2Id !== id
      ),
    })),

  addBond: (atom1Id, atom2Id, type = 'single') => {
    const { atoms, bonds } = get();
    const atom1 = atoms.find((a) => a.id === atom1Id);
    const atom2 = atoms.find((a) => a.id === atom2Id);
    if (!atom1 || !atom2 || atom1Id === atom2Id) return false;

    const alreadyExists = bonds.some(
      (b) =>
        (b.atom1Id === atom1Id && b.atom2Id === atom2Id) ||
        (b.atom1Id === atom2Id && b.atom2Id === atom1Id)
    );
    if (alreadyExists) return false;

    set((state) => ({
      bonds: [
        ...state.bonds,
        {
          id: generateId(),
          atom1Id,
          atom2Id,
          type,
        },
      ],
    }));
    return true;
  },

  removeBond: (id) =>
    set((state) => ({
      bonds: state.bonds.filter((b) => b.id !== id),
      selectedBondId: state.selectedBondId === id ? null : state.selectedBondId,
    })),

  selectAtom: (id) =>
    set({
      selectedAtomId: id,
      selectedBondId: null,
      allSelected: false,
    }),

  selectBond: (id) =>
    set({
      selectedBondId: id,
      selectedAtomId: null,
      allSelected: false,
    }),

  setAllSelected: (selected) =>
    set({
      allSelected: selected,
      selectedAtomId: null,
      selectedBondId: null,
    }),

  setToolMode: (mode) =>
    set({
      toolMode: mode,
      bondClickBuffer: null,
      measureClickBuffer: null,
    }),

  handleAtomClickForBond: (atomId) => {
    const { bondClickBuffer, addBond, addWarningRipple, atoms } = get();
    if (bondClickBuffer === null) {
      set({ bondClickBuffer: atomId });
      return false;
    }
    if (bondClickBuffer === atomId) {
      set({ bondClickBuffer: null });
      return false;
    }

    const atom1 = atoms.find((a) => a.id === bondClickBuffer);
    const atom2 = atoms.find((a) => a.id === atomId);

    if (atom1 && atom2) {
      const dx = atom2.position[0] - atom1.position[0];
      const dy = atom2.position[1] - atom1.position[1];
      const dz = atom2.position[2] - atom1.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= 3.0) {
        addBond(bondClickBuffer, atomId, 'single');
        set({ bondClickBuffer: null });
        return true;
      } else {
        addWarningRipple(bondClickBuffer, atomId);
        set({ bondClickBuffer: null });
        return false;
      }
    }
    set({ bondClickBuffer: null });
    return false;
  },

  handleAtomClickForMeasure: (atomId) => {
    const { measureClickBuffer, atoms, measureResults } = get();
    if (measureClickBuffer === null) {
      set({ measureClickBuffer: atomId });
      return;
    }
    if (measureClickBuffer === atomId) {
      set({ measureClickBuffer: null });
      return;
    }

    const atom1 = atoms.find((a) => a.id === measureClickBuffer);
    const atom2 = atoms.find((a) => a.id === atomId);

    if (atom1 && atom2) {
      const dx = atom2.position[0] - atom1.position[0];
      const dy = atom2.position[1] - atom1.position[1];
      const dz = atom2.position[2] - atom1.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const alreadyExists = measureResults.some(
        (m) =>
          (m.atom1Id === measureClickBuffer && m.atom2Id === atomId) ||
          (m.atom1Id === atomId && m.atom2Id === measureClickBuffer)
      );

      if (!alreadyExists) {
        set((state) => ({
          measureResults: [
            ...state.measureResults,
            {
              atom1Id: measureClickBuffer,
              atom2Id: atomId,
              distance: dist,
            },
          ],
        }));
      }
    }
    set({ measureClickBuffer: null });
  },

  clearMeasureResults: () => set({ measureResults: [] }),

  addWarningRipple: (atom1Id, atom2Id) =>
    set((state) => ({
      warningRipples: [
        ...state.warningRipples,
        {
          id: generateId(),
          atom1Id,
          atom2Id,
          timestamp: Date.now(),
        },
      ],
    })),

  removeWarningRipple: (id) =>
    set((state) => ({
      warningRipples: state.warningRipples.filter((w) => w.id !== id),
    })),

  setFps: (fps) => set({ fps }),

  clearAll: () =>
    set({
      atoms: [],
      bonds: [],
      selectedAtomId: null,
      selectedBondId: null,
      allSelected: false,
      bondClickBuffer: null,
      measureClickBuffer: null,
      measureResults: [],
      warningRipples: [],
    }),

  exportData: () => {
    const { atoms, bonds } = get();
    return JSON.stringify(
      {
        atoms: atoms.map((a) => ({
          element: a.element,
          position: a.position,
        })),
        bonds: bonds.map((b) => ({
          atom1Index: atoms.findIndex((a) => a.id === b.atom1Id),
          atom2Index: atoms.findIndex((a) => a.id === b.atom2Id),
          type: b.type,
        })),
      },
      null,
      2
    );
  },

  updateAtomPosition: (id, position) =>
    set((state) => ({
      atoms: state.atoms.map((a) =>
        a.id === id ? { ...a, position } : a
      ),
    })),
}));
