export type ElementType = 'C' | 'H' | 'O' | 'N' | 'S' | 'P';

export type BondType = 'single' | 'double' | 'triple';

export interface Atom {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  id: string;
  atom1Id: string;
  atom2Id: string;
  type: BondType;
}

export interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  C: '#808080',
  H: '#ffffff',
  O: '#ff0000',
  N: '#0000ff',
  S: '#ffff00',
  P: '#ff8c00',
};

export const ELEMENT_RADII: Record<ElementType, number> = {
  C: 0.5,
  H: 0.3,
  O: 0.45,
  N: 0.45,
  S: 0.55,
  P: 0.55,
};

export const ELEMENT_VALENCE: Record<ElementType, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 2,
  P: 3,
};

let idCounter = 0;

export function generateId(): string {
  idCounter += 1;
  return `a${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

const ELEMENT_MAP: Record<string, ElementType> = {
  C: 'C',
  H: 'H',
  O: 'O',
  N: 'N',
  S: 'S',
  P: 'P',
};

const BOND_LENGTH = 1.5;

function tetrahedralPositions(count: number, existingPositions: { x: number; y: number; z: number }[]): { x: number; y: number; z: number } {
  if (existingPositions.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const last = existingPositions[existingPositions.length - 1];
  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -0.33, y: 0.94, z: 0 },
    { x: -0.33, y: -0.47, z: 0.82 },
    { x: -0.33, y: -0.47, z: -0.82 },
  ];

  const dir = directions[count % directions.length];
  return {
    x: last.x + dir.x * BOND_LENGTH,
    y: last.y + dir.y * BOND_LENGTH,
    z: last.z + dir.z * BOND_LENGTH,
  };
}

export function parseSMILES(smiles: string): Molecule {
  resetIdCounter();

  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const stack: number[] = [];

  let prevAtomIndex = -1;
  let pendingBondType: BondType = 'single';
  let i = 0;

  while (i < smiles.length) {
    const ch = smiles[i];

    if (ch === '(') {
      stack.push(prevAtomIndex);
      i += 1;
      continue;
    }

    if (ch === ')') {
      prevAtomIndex = stack.pop() ?? -1;
      i += 1;
      continue;
    }

    if (ch === '-') {
      pendingBondType = 'single';
      i += 1;
      continue;
    }

    if (ch === '=') {
      pendingBondType = 'double';
      i += 1;
      continue;
    }

    if (ch === '#') {
      pendingBondType = 'triple';
      i += 1;
      continue;
    }

    const element = ELEMENT_MAP[ch.toUpperCase()];
    if (element) {
      const pos = tetrahedralPositions(atoms.length, atoms);
      const atom: Atom = {
        id: generateId(),
        element,
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100,
      };
      atoms.push(atom);

      if (prevAtomIndex >= 0) {
        bonds.push({
          id: generateId(),
          atom1Id: atoms[prevAtomIndex].id,
          atom2Id: atom.id,
          type: pendingBondType,
        });
        pendingBondType = 'single';
      }

      prevAtomIndex = atoms.length - 1;
      i += 1;
      continue;
    }

    if (ch === '[') {
      let j = i + 1;
      while (j < smiles.length && smiles[j] !== ']') {
        j += 1;
      }
      const bracketContent = smiles.substring(i + 1, j);
      const bracketElement = ELEMENT_MAP[bracketContent.toUpperCase()];
      if (bracketElement) {
        const pos = tetrahedralPositions(atoms.length, atoms);
        const atom: Atom = {
          id: generateId(),
          element: bracketElement,
          x: Math.round(pos.x * 100) / 100,
          y: Math.round(pos.y * 100) / 100,
          z: Math.round(pos.z * 100) / 100,
        };
        atoms.push(atom);

        if (prevAtomIndex >= 0) {
          bonds.push({
            id: generateId(),
            atom1Id: atoms[prevAtomIndex].id,
            atom2Id: atom.id,
            type: pendingBondType,
          });
          pendingBondType = 'single';
        }

        prevAtomIndex = atoms.length - 1;
      }
      i = j + 1;
      continue;
    }

    i += 1;
  }

  return { atoms, bonds };
}

export function createEmptyMolecule(): Molecule {
  return { atoms: [], bonds: [] };
}

export function getBondsForAtom(molecule: Molecule, atomId: string): Bond[] {
  return molecule.bonds.filter((b) => b.atom1Id === atomId || b.atom2Id === atomId);
}

export function getConnectedAtoms(molecule: Molecule, atomId: string): string[] {
  const bonds = getBondsForAtom(molecule, atomId);
  return bonds.map((b) => (b.atom1Id === atomId ? b.atom2Id : b.atom1Id));
}

export function calculateDistance(atom1: Atom, atom2: Atom): number {
  const dx = atom1.x - atom2.x;
  const dy = atom1.y - atom2.y;
  const dz = atom1.z - atom2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
