import { create } from 'zustand';
import { MoleculeData, CAFFEINE_MOLECULE, centerMolecule, Atom, Bond } from './moleculeParser';

export type DisplayMode = 'ball-stick' | 'space-filling';

export interface CameraState {
  distance: number;
  polar: number;
  azimuth: number;
  target: [number, number, number];
}

interface MoleculeStore {
  molecule: MoleculeData;
  selectedAtomId: number | null;
  showHydrogen: boolean;
  displayMode: DisplayMode;
  cameraResetKey: number;
  initialCamera: CameraState;

  selectAtom: (id: number | null) => void;
  toggleHydrogen: () => void;
  setShowHydrogen: (show: boolean) => void;
  toggleDisplayMode: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  resetCamera: () => void;
  getAtomBonds: (atomId: number) => Bond[];
  getAtomById: (atomId: number) => Atom | undefined;
}

export const useMoleculeStore = create<MoleculeStore>((set, get) => ({
  molecule: centerMolecule(CAFFEINE_MOLECULE),
  selectedAtomId: null,
  showHydrogen: true,
  displayMode: 'ball-stick',
  cameraResetKey: 0,
  initialCamera: {
    distance: 4,
    polar: Math.PI / 6,
    azimuth: 0,
    target: [0, 0, 0],
  },

  selectAtom: (id) => set({ selectedAtomId: id }),

  toggleHydrogen: () => set((state) => ({ showHydrogen: !state.showHydrogen })),

  setShowHydrogen: (show) => set({ showHydrogen: show }),

  toggleDisplayMode: () =>
    set((state) => ({
      displayMode: state.displayMode === 'ball-stick' ? 'space-filling' : 'ball-stick',
    })),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  resetCamera: () => set((state) => ({ cameraResetKey: state.cameraResetKey + 1 })),

  getAtomBonds: (atomId) => {
    const { molecule } = get();
    return molecule.bonds.filter(
      (b) => b.atom1 === atomId || b.atom2 === atomId
    );
  },

  getAtomById: (atomId) => {
    const { molecule } = get();
    return molecule.atoms.find((a) => a.id === atomId);
  },
}));
