import { create } from 'zustand';
import type { Atom, Bond, Molecule, ElementType, BondType } from '@/molecule-core/MoleculeModel';
import {
  parseSMILES,
  createEmptyMolecule,
  generateId,
  getBondsForAtom,
} from '@/molecule-core/MoleculeModel';

interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

type ToolType = 'select' | 'addAtom' | 'addBond' | 'measure' | 'rotate' | 'zoom';

interface MoleculeStore {
  molecule: Molecule;
  selectedAtomId: string | null;
  activeTool: ToolType;
  measurePoints: string[];
  history: Command[];
  historyIndex: number;
  isPanelOpen: boolean;
  smilesInput: string;
  focusAtomId: string | null;

  setMolecule: (m: Molecule) => void;
  setSelectedAtomId: (id: string | null) => void;
  setActiveTool: (tool: ToolType) => void;
  setIsPanelOpen: (open: boolean) => void;
  setSmilesInput: (s: string) => void;
  setFocusAtomId: (id: string | null) => void;

  loadSMILES: (smiles: string) => void;

  addAtomAction: (element: ElementType, x: number, y: number, z: number) => void;
  removeAtomAction: (id: string) => void;
  updateAtomAction: (id: string, updates: Partial<Pick<Atom, 'element' | 'x' | 'y' | 'z'>>) => void;
  addBondAction: (atom1Id: string, atom2Id: string, type: BondType) => void;
  removeBondAction: (id: string) => void;

  undo: () => void;
  redo: () => void;

  addMeasurePoint: (atomId: string) => void;
  clearMeasurePoints: () => void;
}

export const useMoleculeStore = create<MoleculeStore>((set, get) => {
  function pushCommand(cmd: Command) {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex);
    newHistory.push(cmd);
    set({ history: newHistory, historyIndex: newHistory.length });
  }

  return {
    molecule: createEmptyMolecule(),
    selectedAtomId: null,
    activeTool: 'select',
    measurePoints: [],
    history: [],
    historyIndex: 0,
    isPanelOpen: false,
    smilesInput: '',
    focusAtomId: null,

    setMolecule: (m) => set({ molecule: m }),
    setSelectedAtomId: (id) => set({ selectedAtomId: id, isPanelOpen: id !== null }),
    setActiveTool: (tool) => set({ activeTool: tool, measurePoints: [] }),
    setIsPanelOpen: (open) => set({ isPanelOpen: open, selectedAtomId: open ? get().selectedAtomId : null }),
    setSmilesInput: (s) => set({ smilesInput: s }),
    setFocusAtomId: (id) => set({ focusAtomId: id }),

    loadSMILES: (smiles) => {
      if (!smiles.trim()) return;
      const molecule = parseSMILES(smiles);
      set({
        molecule,
        history: [],
        historyIndex: 0,
        selectedAtomId: null,
        isPanelOpen: false,
        measurePoints: [],
      });
    },

    addAtomAction: (element, x, y, z) => {
      const newAtom: Atom = { id: generateId(), element, x, y, z };
      const prevMolecule = get().molecule;

      pushCommand({
        description: 'Add atom',
        execute: () => {
          set((s) => ({
            molecule: { ...s.molecule, atoms: [...s.molecule.atoms, newAtom] },
            focusAtomId: newAtom.id,
          }));
        },
        undo: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              atoms: s.molecule.atoms.filter((a) => a.id !== newAtom.id),
              bonds: s.molecule.bonds.filter(
                (b) => b.atom1Id !== newAtom.id && b.atom2Id !== newAtom.id
              ),
            },
            focusAtomId: null,
          }));
        },
      });

      set((s) => ({
        molecule: { ...s.molecule, atoms: [...s.molecule.atoms, newAtom] },
        focusAtomId: newAtom.id,
      }));
    },

    removeAtomAction: (id) => {
      const prevMolecule = get().molecule;
      const removedAtom = prevMolecule.atoms.find((a) => a.id === id);
      const removedBonds = getBondsForAtom(prevMolecule, id);
      if (!removedAtom) return;

      pushCommand({
        description: 'Remove atom',
        execute: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              atoms: s.molecule.atoms.filter((a) => a.id !== id),
              bonds: s.molecule.bonds.filter(
                (b) => b.atom1Id !== id && b.atom2Id !== id
              ),
            },
            selectedAtomId: null,
            isPanelOpen: false,
            focusAtomId: null,
          }));
        },
        undo: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              atoms: [...s.molecule.atoms, removedAtom],
              bonds: [...s.molecule.bonds, ...removedBonds],
            },
          }));
        },
      });

      set((s) => ({
        molecule: {
          ...s.molecule,
          atoms: s.molecule.atoms.filter((a) => a.id !== id),
          bonds: s.molecule.bonds.filter(
            (b) => b.atom1Id !== id && b.atom2Id !== id
          ),
        },
        selectedAtomId: null,
        isPanelOpen: false,
        focusAtomId: null,
      }));
    },

    updateAtomAction: (id, updates) => {
      const prevMolecule = get().molecule;
      const prevAtom = prevMolecule.atoms.find((a) => a.id === id);
      if (!prevAtom) return;

      pushCommand({
        description: 'Update atom',
        execute: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              atoms: s.molecule.atoms.map((a) =>
                a.id === id ? { ...a, ...updates } : a
              ),
            },
          }));
        },
        undo: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              atoms: s.molecule.atoms.map((a) =>
                a.id === id ? prevAtom : a
              ),
            },
          }));
        },
      });

      set((s) => ({
        molecule: {
          ...s.molecule,
          atoms: s.molecule.atoms.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        },
      }));
    },

    addBondAction: (atom1Id, atom2Id, type) => {
      const newBond: Bond = { id: generateId(), atom1Id, atom2Id, type };

      pushCommand({
        description: 'Add bond',
        execute: () => {
          set((s) => ({
            molecule: { ...s.molecule, bonds: [...s.molecule.bonds, newBond] },
          }));
        },
        undo: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              bonds: s.molecule.bonds.filter((b) => b.id !== newBond.id),
            },
          }));
        },
      });

      set((s) => ({
        molecule: { ...s.molecule, bonds: [...s.molecule.bonds, newBond] },
      }));
    },

    removeBondAction: (id) => {
      const prevMolecule = get().molecule;
      const removedBond = prevMolecule.bonds.find((b) => b.id === id);
      if (!removedBond) return;

      pushCommand({
        description: 'Remove bond',
        execute: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              bonds: s.molecule.bonds.filter((b) => b.id !== id),
            },
          }));
        },
        undo: () => {
          set((s) => ({
            molecule: {
              ...s.molecule,
              bonds: [...s.molecule.bonds, removedBond],
            },
          }));
        },
      });

      set((s) => ({
        molecule: {
          ...s.molecule,
          bonds: s.molecule.bonds.filter((b) => b.id !== id),
        },
      }));
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;
      const cmd = history[historyIndex - 1];
      cmd.undo();
      set({ historyIndex: historyIndex - 1 });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length) return;
      const cmd = history[historyIndex];
      cmd.execute();
      set({ historyIndex: historyIndex + 1 });
    },

    addMeasurePoint: (atomId) => {
      const { measurePoints } = get();
      if (measurePoints.length >= 2) {
        set({ measurePoints: [atomId] });
      } else if (measurePoints.length === 1 && measurePoints[0] !== atomId) {
        set({ measurePoints: [measurePoints[0], atomId] });
      } else if (measurePoints.length === 0) {
        set({ measurePoints: [atomId] });
      }
    },

    clearMeasurePoints: () => set({ measurePoints: [] }),
  };
});
