import { Vector3 } from 'three';

export interface AtomData {
  index: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  atomIndex1: number;
  atomIndex2: number;
  order: number;
  length: number;
}

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
  boundingBox: { min: Vector3; max: Vector3 };
  center: Vector3;
}

export type RenderMode = 'ball-and-stick' | 'space-filling' | 'wireframe';

export interface AtomHoverEvent {
  atom: AtomData;
  neighbors: AtomData[];
  bonds: BondData[];
  worldPosition: Vector3;
  screenPosition: { x: number; y: number };
}

const COVALENT_RADII: Record<string, number> = {
  H: 0.31, He: 0.28,
  Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57,
  Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02,
  K: 2.03, Ca: 1.76, Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39,
  Fe: 1.32, Co: 1.26, Ni: 1.24, Cu: 1.32, Zn: 1.22, Ga: 1.22, Ge: 1.20,
  As: 1.19, Se: 1.20, Br: 1.20,
  Rb: 2.20, Sr: 1.95, Ag: 1.45, Cd: 1.44, In: 1.42, Sn: 1.39, Sb: 1.39,
  Te: 1.38, I: 1.39,
  Cs: 2.44, Ba: 2.15, Au: 1.36, Hg: 1.32, Tl: 1.45, Pb: 1.46, Bi: 1.48,
};

export function getCovalentRadius(element: string): number {
  return COVALENT_RADII[element] || 1.5;
}

export const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff, D: 0xffffc0, T: 0xffffa0,
  He: 0xd9ffff,
  Li: 0xcc80ff, Be: 0xc2ff00, B: 0xffb5b5,
  C: 0x909090, N: 0x3050f8, O: 0xff0d0d,
  F: 0x90e050, Ne: 0xb3e3f5,
  Na: 0xab5cf2, Mg: 0x8aff00, Al: 0xbfa6a6,
  Si: 0xf0c8a0, P: 0xff8000, S: 0xffff30,
  Cl: 0x1ff01f, Ar: 0x80d1e3,
  K: 0x8f40d4, Ca: 0x3dff00, Sc: 0xe6e6e6,
  Ti: 0xbfc2c7, V: 0xa6a6ab, Cr: 0x8a99c7,
  Mn: 0x9c7ac7, Fe: 0xe06633, Co: 0xf090a0,
  Ni: 0x50d050, Cu: 0xc88033, Zn: 0x7d80b0,
  Ga: 0xc28f8f, Ge: 0x668f8f, As: 0xbd80e3,
  Se: 0xffa100, Br: 0xa62929,
  Rb: 0x707070, Sr: 0x00ff00, Ag: 0xc0c0c0,
  Cd: 0xffd98f, In: 0xa67573, Sn: 0x668080,
  Sb: 0x9e4b5a, Te: 0xd47a00, I: 0x940094,
  Cs: 0xff87c3, Ba: 0x00c900, Au: 0xffd123,
  Hg: 0xb8b8d0, Tl: 0xa0542a, Pb: 0x575961,
  Bi: 0x9e4fb5,
};

export function getElementColor(element: string): number {
  return ELEMENT_COLORS[element] || 0xffb5b5;
}

function detectBonds(atoms: AtomData[]): BondData[] {
  const bonds: BondData[] = [];
  const tolerance = 1.3;
  const maxDist = 4.0;

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i];
      const b = atoms[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > maxDist) continue;

      const rSum = getCovalentRadius(a.element) + getCovalentRadius(b.element);
      if (dist < rSum * tolerance) {
        bonds.push({
          atomIndex1: i,
          atomIndex2: j,
          order: 1,
          length: dist,
        });
      }
    }
  }

  return bonds;
}

export function parseXYZ(text: string): MoleculeData {
  const lines = text.trim().split('\n');
  const atomCount = parseInt(lines[0].trim(), 10);

  const atoms: AtomData[] = [];
  const startLine = 2;

  for (let i = 0; i < atomCount && startLine + i < lines.length; i++) {
    const parts = lines[startLine + i].trim().split(/\s+/);
    if (parts.length < 4) continue;

    const element = parts[0];
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);

    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    atoms.push({ index: atoms.length, element, x, y, z });
  }

  const bonds = detectBonds(atoms);
  return computeBoundingBox(atoms, bonds);
}

export function parsePDB(text: string): MoleculeData {
  const lines = text.split('\n');
  const atoms: AtomData[] = [];
  const atomMap = new Map<number, number>();

  for (const line of lines) {
    const recordType = line.substring(0, 6).trim();

    if (recordType === 'ATOM' || recordType === 'HETATM') {
      const serial = parseInt(line.substring(6, 11).trim(), 10);
      const element = line.substring(76, 78).trim() || line.substring(12, 16).trim().replace(/[0-9]/g, '');
      const x = parseFloat(line.substring(30, 38).trim());
      const y = parseFloat(line.substring(38, 46).trim());
      const z = parseFloat(line.substring(46, 54).trim());

      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

      atomMap.set(serial, atoms.length);
      atoms.push({ index: atoms.length, element, x, y, z });
    }
  }

  let bonds: BondData[] = [];

  for (const line of lines) {
    const recordType = line.substring(0, 6).trim();
    if (recordType === 'CONECT') {
      const parts = line.trim().split(/\s+/).map(Number);
      if (parts.length >= 3) {
        const sourceSerial = parts[1];
        const sourceIdx = atomMap.get(sourceSerial);
        if (sourceIdx === undefined) continue;

        for (let k = 2; k < parts.length; k++) {
          const targetSerial = parts[k];
          const targetIdx = atomMap.get(targetSerial);
          if (targetIdx === undefined || targetIdx <= sourceIdx) continue;

          const a = atoms[sourceIdx];
          const b = atoms[targetIdx];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          bonds.push({
            atomIndex1: sourceIdx,
            atomIndex2: targetIdx,
            order: 1,
            length: dist,
          });
        }
      }
    }
  }

  if (bonds.length === 0 && atoms.length > 0) {
    bonds = detectBonds(atoms);
  }

  return computeBoundingBox(atoms, bonds);
}

function computeBoundingBox(atoms: AtomData[], bonds: BondData[]): MoleculeData {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);

  for (const atom of atoms) {
    min.x = Math.min(min.x, atom.x);
    min.y = Math.min(min.y, atom.y);
    min.z = Math.min(min.z, atom.z);
    max.x = Math.max(max.x, atom.x);
    max.y = Math.max(max.y, atom.y);
    max.z = Math.max(max.z, atom.z);
  }

  const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);

  return { atoms, bonds, boundingBox: { min, max }, center };
}

export function loadMoleculeFromFile(file: File): Promise<MoleculeData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === 'pdb') {
          resolve(parsePDB(text));
        } else {
          resolve(parseXYZ(text));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function generateSampleMolecule(): MoleculeData {
  const atoms: AtomData[] = [];
  const s = 1.54;

  atoms.push({ index: 0, element: 'C', x: 0, y: 0, z: 0 });
  atoms.push({ index: 1, element: 'C', x: s, y: 0, z: 0 });
  atoms.push({ index: 2, element: 'C', x: s * 2, y: 0, z: 0 });
  atoms.push({ index: 3, element: 'C', x: s * 3, y: 0, z: 0 });
  atoms.push({ index: 4, element: 'C', x: s * 3, y: s, z: 0 });
  atoms.push({ index: 5, element: 'C', x: s * 2, y: s, z: 0 });
  atoms.push({ index: 6, element: 'H', x: -s * 0.5, y: s * 0.5, z: s * 0.5 });
  atoms.push({ index: 7, element: 'H', x: -s * 0.5, y: -s * 0.5, z: -s * 0.5 });
  atoms.push({ index: 8, element: 'H', x: s * 0.5, y: -s * 0.5, z: s * 0.5 });
  atoms.push({ index: 9, element: 'H', x: s * 3.5, y: s * 0.5, z: s * 0.5 });
  atoms.push({ index: 10, element: 'O', x: s * 4.3, y: 0, z: 0 });
  atoms.push({ index: 11, element: 'H', x: s * 4.8, y: 0.5, z: 0.5 });
  atoms.push({ index: 12, element: 'N', x: s, y: s, z: 0 });
  atoms.push({ index: 13, element: 'H', x: s * 0.5, y: s * 1.5, z: 0.5 });
  atoms.push({ index: 14, element: 'H', x: s * 1.5, y: s * 1.5, z: -0.5 });

  const bonds = detectBonds(atoms);
  return computeBoundingBox(atoms, bonds);
}
