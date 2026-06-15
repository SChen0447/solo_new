export interface Atom {
  id: number;
  element: 'C' | 'O' | 'N' | 'H';
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  id: number;
  atom1: number;
  atom2: number;
}

export interface MoleculeData {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const ATOM_COLORS: Record<string, string> = {
  C: '#808080',
  O: '#ff0000',
  N: '#0000ff',
  H: '#ffffff',
};

export const ATOM_RADII: Record<string, number> = {
  C: 0.4,
  O: 0.35,
  N: 0.3,
  H: 0.3,
};

export function getAtomColor(element: string): string {
  return ATOM_COLORS[element] || '#808080';
}

export function getAtomRadius(element: string): number {
  return ATOM_RADII[element] || 0.3;
}

const CAFFEINE_ATOMS: Atom[] = [
  { id: 1, element: 'N', x: 0.0, y: 0.0, z: 0.0 },
  { id: 2, element: 'C', x: 1.45, y: 0.0, z: 0.0 },
  { id: 3, element: 'N', x: 2.18, y: 1.26, z: 0.0 },
  { id: 4, element: 'C', x: 1.45, y: 2.45, z: 0.0 },
  { id: 5, element: 'C', x: 0.0, y: 2.45, z: 0.0 },
  { id: 6, element: 'C', x: -0.73, y: 1.26, z: 0.0 },
  { id: 7, element: 'N', x: -2.18, y: 1.26, z: 0.0 },
  { id: 8, element: 'C', x: -2.9, y: 0.0, z: 0.0 },
  { id: 9, element: 'C', x: -2.18, y: -1.26, z: 0.0 },
  { id: 10, element: 'N', x: -0.73, y: -1.26, z: 0.0 },
  { id: 11, element: 'O', x: 2.2, y: -1.0, z: 0.0 },
  { id: 12, element: 'O', x: -0.73, y: 3.6, z: 0.0 },
  { id: 13, element: 'C', x: 2.0, y: -2.0, z: 0.0 },
  { id: 14, element: 'H', x: 2.6, y: -2.8, z: 0.0 },
  { id: 15, element: 'H', x: 2.0, y: -2.0, z: 1.0 },
  { id: 16, element: 'H', x: 1.0, y: -2.3, z: 0.0 },
  { id: 17, element: 'C', x: 3.6, y: 1.26, z: 0.0 },
  { id: 18, element: 'H', x: 4.0, y: 0.3, z: 0.0 },
  { id: 19, element: 'H', x: 4.0, y: 1.76, z: 0.9 },
  { id: 20, element: 'H', x: 4.0, y: 1.76, z: -0.9 },
  { id: 21, element: 'C', x: -2.9, y: -2.45, z: 0.0 },
  { id: 22, element: 'H', x: -2.4, y: -3.35, z: 0.0 },
  { id: 23, element: 'H', x: -3.9, y: -2.6, z: 0.0 },
  { id: 24, element: 'H', x: -2.7, y: -2.4, z: 1.0 },
];

const CAFFEINE_BONDS: Bond[] = [
  { id: 1, atom1: 1, atom2: 2 },
  { id: 2, atom1: 2, atom2: 3 },
  { id: 3, atom1: 3, atom2: 4 },
  { id: 4, atom1: 4, atom2: 5 },
  { id: 5, atom1: 5, atom2: 6 },
  { id: 6, atom1: 6, atom2: 1 },
  { id: 7, atom1: 6, atom2: 7 },
  { id: 8, atom1: 7, atom2: 8 },
  { id: 9, atom1: 8, atom2: 9 },
  { id: 10, atom1: 9, atom2: 10 },
  { id: 11, atom1: 10, atom2: 1 },
  { id: 12, atom1: 10, atom2: 11 },
  { id: 13, atom1: 5, atom2: 12 },
  { id: 14, atom1: 11, atom2: 13 },
  { id: 15, atom1: 13, atom2: 14 },
  { id: 16, atom1: 13, atom2: 15 },
  { id: 17, atom1: 13, atom2: 16 },
  { id: 18, atom1: 3, atom2: 17 },
  { id: 19, atom1: 17, atom2: 18 },
  { id: 20, atom1: 17, atom2: 19 },
  { id: 21, atom1: 17, atom2: 20 },
  { id: 22, atom1: 9, atom2: 21 },
  { id: 23, atom1: 21, atom2: 22 },
  { id: 24, atom1: 21, atom2: 23 },
  { id: 25, atom1: 21, atom2: 24 },
];

export const CAFFEINE_MOLECULE: MoleculeData = {
  name: '咖啡因 (Caffeine)',
  atoms: CAFFEINE_ATOMS,
  bonds: CAFFEINE_BONDS,
};

export function parsePDB(content: string): MoleculeData {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const lines = content.split('\n');
  let atomId = 0;
  let bondId = 0;

  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const element = line.substring(76, 78).trim() as Atom['element'];
      const x = parseFloat(line.substring(30, 38));
      const y = parseFloat(line.substring(38, 46));
      const z = parseFloat(line.substring(46, 54));
      if (!isNaN(x) && !isNaN(y) && !isNaN(z) && element) {
        atoms.push({ id: ++atomId, element, x, y, z });
      }
    } else if (line.startsWith('CONECT')) {
      const parts = line.substring(6).trim().split(/\s+/).map(Number);
      for (let i = 1; i < parts.length; i++) {
        bonds.push({ id: ++bondId, atom1: parts[0], atom2: parts[i] });
      }
    }
  }

  return { name: 'PDB Molecule', atoms, bonds };
}

export function centerMolecule(molecule: MoleculeData): MoleculeData {
  if (molecule.atoms.length === 0) return molecule;

  const sumX = molecule.atoms.reduce((s, a) => s + a.x, 0);
  const sumY = molecule.atoms.reduce((s, a) => s + a.y, 0);
  const sumZ = molecule.atoms.reduce((s, a) => s + a.z, 0);
  const n = molecule.atoms.length;
  const cx = sumX / n;
  const cy = sumY / n;
  const cz = sumZ / n;

  return {
    ...molecule,
    atoms: molecule.atoms.map((a) => ({
      ...a,
      x: a.x - cx,
      y: a.y - cy,
      z: a.z - cz,
    })),
  };
}
