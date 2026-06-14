import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ElementType = 'C' | 'H' | 'O' | 'N' | 'S';
export type BondType = 1 | 2 | 3;

export interface Atom {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  atomicNumber: number;
}

export interface Bond {
  id: string;
  from: string;
  to: string;
  type: BondType;
}

export interface HistoryEntry {
  atoms: Atom[];
  bonds: Bond[];
}

interface AtomsState {
  atoms: Atom[];
  bonds: Bond[];
  selectedAtomId: string | null;
  selectedBondId: string | null;
  selectedElement: ElementType;
  history: HistoryEntry[];
  historyIndex: number;
  is3DMode: boolean;
  atomAnimations: Map<string, { startTime: number; type: 'bounce' | 'flash' }>;
  bondAnimations: Map<string, { startTime: number; type: 'connect' | 'switch' }>;

  addAtom: (x: number, y: number) => void;
  addBond: (fromId: string, toId: string, type?: BondType) => void;
  switchBondType: (bondId: string) => void;
  deleteSelected: () => void;
  selectAtom: (id: string | null) => void;
  selectBond: (id: string | null) => void;
  setSelectedElement: (element: ElementType) => void;
  updateAtomPosition: (id: string, x: number, y: number) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  toggle3DMode: () => void;
  clearAll: () => void;
  changeAtomElement: (atomId: string, element: ElementType) => void;
  changeBondType: (bondId: string, type: BondType) => void;
  addAtomAnimation: (atomId: string, type: 'bounce' | 'flash') => void;
  addBondAnimation: (bondId: string, type: 'connect' | 'switch') => void;
}

export const ELEMENT_PROPERTIES: Record<ElementType, { radius: number; color: string; atomicNumber: number; name: string }> = {
  C: { radius: 0.77, color: '#909090', atomicNumber: 6, name: '碳' },
  H: { radius: 0.37, color: '#FFFFFF', atomicNumber: 1, name: '氢' },
  O: { radius: 0.66, color: '#FF4444', atomicNumber: 8, name: '氧' },
  N: { radius: 0.70, color: '#4444FF', atomicNumber: 7, name: '氮' },
  S: { radius: 1.04, color: '#FFFF44', atomicNumber: 16, name: '硫' }
};

export const ELEMENTS: ElementType[] = ['C', 'H', 'O', 'N', 'S'];

export const createInitialState = () => ({
  atoms: [] as Atom[],
  bonds: [] as Bond[],
  selectedAtomId: null as string | null,
  selectedBondId: null as string | null,
  selectedElement: 'C' as ElementType,
  history: [] as HistoryEntry[],
  historyIndex: -1,
  is3DMode: false,
  atomAnimations: new Map(),
  bondAnimations: new Map()
});

export const useAtomsStore = create<AtomsState>((set, get) => ({
  ...createInitialState(),

  addAtom: (x: number, y: number) => {
    const { selectedElement, atoms, bonds, history, historyIndex } = get();
    const props = ELEMENT_PROPERTIES[selectedElement];
    const newAtom: Atom = {
      id: uuidv4(),
      element: selectedElement,
      x,
      y,
      z: 0,
      radius: props.radius,
      color: props.color,
      atomicNumber: props.atomicNumber
    };

    const newAtoms = [...atoms, newAtom];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...newAtoms], bonds: [...bonds] });

    set({ atoms: newAtoms, history: newHistory, historyIndex: newHistory.length - 1 });
    get().addAtomAnimation(newAtom.id, 'bounce');
  },

  addBond: (fromId: string, toId: string, type: BondType = 1) => {
    const { atoms, bonds, history, historyIndex } = get();
    if (fromId === toId) return;

    const exists = bonds.some(
      b => (b.from === fromId && b.to === toId) || (b.from === toId && b.to === fromId)
    );
    if (exists) return;

    const newBond: Bond = {
      id: uuidv4(),
      from: fromId,
      to: toId,
      type
    };

    const newBonds = [...bonds, newBond];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...atoms], bonds: [...newBonds] });

    set({ bonds: newBonds, history: newHistory, historyIndex: newHistory.length - 1 });
    get().addBondAnimation(newBond.id, 'connect');
  },

  switchBondType: (bondId: string) => {
    const { bonds, atoms, history, historyIndex } = get();
    const newBonds = bonds.map(b => {
      if (b.id === bondId) {
        const newType = ((b.type % 3) + 1) as BondType;
        return { ...b, type: newType };
      }
      return b;
    });

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...atoms], bonds: [...newBonds] });

    set({ bonds: newBonds, history: newHistory, historyIndex: newHistory.length - 1 });
    get().addBondAnimation(bondId, 'switch');
  },

  deleteSelected: () => {
    const { selectedAtomId, selectedBondId, atoms, bonds, history, historyIndex } = get();
    let newAtoms = atoms;
    let newBonds = bonds;

    if (selectedAtomId) {
      newAtoms = atoms.filter(a => a.id !== selectedAtomId);
      newBonds = bonds.filter(b => b.from !== selectedAtomId && b.to !== selectedAtomId);
    } else if (selectedBondId) {
      newBonds = bonds.filter(b => b.id !== selectedBondId);
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...newAtoms], bonds: [...newBonds] });

    set({
      atoms: newAtoms,
      bonds: newBonds,
      selectedAtomId: null,
      selectedBondId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  selectAtom: (id: string | null) => {
    set({ selectedAtomId: id, selectedBondId: null });
  },

  selectBond: (id: string | null) => {
    set({ selectedBondId: id, selectedAtomId: null });
  },

  setSelectedElement: (element: ElementType) => {
    set({ selectedElement: element });
  },

  updateAtomPosition: (id: string, x: number, y: number) => {
    set(state => ({
      atoms: state.atoms.map(a => (a.id === id ? { ...a, x, y } : a))
    }));
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const entry = history[newIndex];
      set({
        atoms: [...entry.atoms],
        bonds: [...entry.bonds],
        historyIndex: newIndex,
        selectedAtomId: null,
        selectedBondId: null
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];
      set({
        atoms: [...entry.atoms],
        bonds: [...entry.bonds],
        historyIndex: newIndex,
        selectedAtomId: null,
        selectedBondId: null
      });
    }
  },

  saveHistory: () => {
    const { atoms, bonds, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...atoms], bonds: [...bonds] });
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  toggle3DMode: () => {
    set(state => ({ is3DMode: !state.is3DMode }));
  },

  clearAll: () => {
    set({
      ...createInitialState(),
      history: [{ atoms: [], bonds: [] }],
      historyIndex: 0
    });
  },

  changeAtomElement: (atomId: string, element: ElementType) => {
    const props = ELEMENT_PROPERTIES[element];
    const { atoms, bonds, history, historyIndex } = get();
    const newAtoms = atoms.map(a =>
      a.id === atomId
        ? { ...a, element, radius: props.radius, color: props.color, atomicNumber: props.atomicNumber }
        : a
    );

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...newAtoms], bonds: [...bonds] });

    set({ atoms: newAtoms, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  changeBondType: (bondId: string, type: BondType) => {
    const { atoms, bonds, history, historyIndex } = get();
    const newBonds = bonds.map(b => (b.id === bondId ? { ...b, type } : b));

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ atoms: [...atoms], bonds: [...newBonds] });

    set({ bonds: newBonds, history: newHistory, historyIndex: newHistory.length - 1 });
    get().addBondAnimation(bondId, 'switch');
  },

  addAtomAnimation: (atomId: string, type: 'bounce' | 'flash') => {
    set(state => {
      const newAnimations = new Map(state.atomAnimations);
      newAnimations.set(atomId, { startTime: performance.now(), type });
      return { atomAnimations: newAnimations };
    });
  },

  addBondAnimation: (bondId: string, type: 'connect' | 'switch') => {
    set(state => {
      const newAnimations = new Map(state.bondAnimations);
      newAnimations.set(bondId, { startTime: performance.now(), type });
      return { bondAnimations: newAnimations };
    });
  }
}));
