import { useMoleculeStore } from '@/store/useMoleculeStore';
import type { Atom, Bond, Molecule, ElementType, BondType } from '@/molecule-core/MoleculeModel';
import { getBondsForAtom, getConnectedAtoms, calculateDistance } from '@/molecule-core/MoleculeModel';

export class EditorManager {
  static selectAtom(atomId: string | null) {
    const store = useMoleculeStore.getState();
    store.setSelectedAtomId(atomId);
  }

  static deselectAtom() {
    const store = useMoleculeStore.getState();
    store.setSelectedAtomId(null);
    store.setIsPanelOpen(false);
  }

  static addAtom(element: ElementType = 'C', x: number = 0, y: number = 0, z: number = 0) {
    const store = useMoleculeStore.getState();
    store.addAtomAction(element, x, y, z);
  }

  static removeAtom(atomId: string) {
    const store = useMoleculeStore.getState();
    store.removeAtomAction(atomId);
  }

  static updateAtom(atomId: string, updates: Partial<Pick<Atom, 'element' | 'x' | 'y' | 'z'>>) {
    const store = useMoleculeStore.getState();
    store.updateAtomAction(atomId, updates);
  }

  static addBond(atom1Id: string, atom2Id: string, type: BondType = 'single') {
    const store = useMoleculeStore.getState();
    store.addBondAction(atom1Id, atom2Id, type);
  }

  static removeBond(bondId: string) {
    const store = useMoleculeStore.getState();
    store.removeBondAction(bondId);
  }

  static undo() {
    const store = useMoleculeStore.getState();
    store.undo();
  }

  static redo() {
    const store = useMoleculeStore.getState();
    store.redo();
  }

  static getBondsForSelectedAtom(): Bond[] {
    const store = useMoleculeStore.getState();
    if (!store.selectedAtomId) return [];
    return getBondsForAtom(store.molecule, store.selectedAtomId);
  }

  static getConnectedAtomIds(): string[] {
    const store = useMoleculeStore.getState();
    if (!store.selectedAtomId) return [];
    return getConnectedAtoms(store.molecule, store.selectedAtomId);
  }

  static getDistanceBetweenAtoms(atomId1: string, atomId2: string): number {
    const store = useMoleculeStore.getState();
    const atom1 = store.molecule.atoms.find((a) => a.id === atomId1);
    const atom2 = store.molecule.atoms.find((a) => a.id === atomId2);
    if (!atom1 || !atom2) return 0;
    return calculateDistance(atom1, atom2);
  }

  static handleSceneClick(atomId: string | null, worldPos: { x: number; y: number; z: number } | null) {
    const store = useMoleculeStore.getState();
    const { activeTool, selectedAtomId } = store;

    if (activeTool === 'measure') {
      if (atomId) {
        store.addMeasurePoint(atomId);
      }
      return;
    }

    if (activeTool === 'addAtom') {
      if (worldPos) {
        const element: ElementType = 'C';
        store.addAtomAction(element, worldPos.x, worldPos.y, worldPos.z);
      }
      return;
    }

    if (activeTool === 'addBond') {
      if (atomId) {
        if (selectedAtomId && selectedAtomId !== atomId) {
          store.addBondAction(selectedAtomId, atomId, 'single');
          store.setSelectedAtomId(null);
        } else {
          store.setSelectedAtomId(atomId);
        }
      }
      return;
    }

    if (activeTool === 'select') {
      if (atomId) {
        store.setSelectedAtomId(atomId);
      } else {
        store.setSelectedAtomId(null);
        store.setIsPanelOpen(false);
      }
    }
  }
}
