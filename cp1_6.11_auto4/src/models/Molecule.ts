export interface AtomData {
  symbol: string;
  name: string;
  atomicNumber: number;
  mass: number;
  color: string;
  radius: number;
}

export interface AtomInstance {
  id: number;
  symbol: string;
  position: [number, number, number];
}

export interface BondData {
  atomId1: number;
  atomId2: number;
  order: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomInstance[];
  bonds: BondData[];
}

const ELEMENT_TABLE: Record<string, AtomData> = {
  H: { symbol: 'H', name: '氢', atomicNumber: 1, mass: 1.008, color: '#ffffff', radius: 0.31 },
  C: { symbol: 'C', name: '碳', atomicNumber: 6, mass: 12.011, color: '#909090', radius: 0.77 },
  O: { symbol: 'O', name: '氧', atomicNumber: 8, mass: 15.999, color: '#ff0d0d', radius: 0.73 },
  N: { symbol: 'N', name: '氮', atomicNumber: 7, mass: 14.007, color: '#3050f8', radius: 0.75 },
  S: { symbol: 'S', name: '硫', atomicNumber: 16, mass: 32.06, color: '#ffff30', radius: 1.02 },
  Cl: { symbol: 'Cl', name: '氯', atomicNumber: 17, mass: 35.45, color: '#1ff01f', radius: 0.99 },
};

export function getElementData(symbol: string): AtomData {
  const data = ELEMENT_TABLE[symbol];
  if (!data) {
    return { symbol, name: symbol, atomicNumber: 0, mass: 0, color: '#ff69b4', radius: 0.5 };
  }
  return data;
}

const SCALE = 1.5;

const H2O_JSON = `{
  "name": "水",
  "formula": "H₂O",
  "atoms": [
    { "id": 0, "symbol": "O", "position": [0, 0, 0] },
    { "id": 1, "symbol": "H", "position": [${0.757 * SCALE}, ${0.586 * SCALE}, 0] },
    { "id": 2, "symbol": "H", "position": [${-0.757 * SCALE}, ${0.586 * SCALE}, 0] }
  ],
  "bonds": [
    { "atomId1": 0, "atomId2": 1, "order": 1 },
    { "atomId1": 0, "atomId2": 2, "order": 1 }
  ]
}`;

const CO2_JSON = `{
  "name": "二氧化碳",
  "formula": "CO₂",
  "atoms": [
    { "id": 0, "symbol": "C", "position": [0, 0, 0] },
    { "id": 1, "symbol": "O", "position": [${1.16 * SCALE}, 0, 0] },
    { "id": 2, "symbol": "O", "position": [${-1.16 * SCALE}, 0, 0] }
  ],
  "bonds": [
    { "atomId1": 0, "atomId2": 1, "order": 2 },
    { "atomId1": 0, "atomId2": 2, "order": 2 }
  ]
}`;

const C6H6_JSON = `{
  "name": "苯",
  "formula": "C₆H₆",
  "atoms": [
    { "id": 0, "symbol": "C", "position": [${1.4 * SCALE}, 0, 0] },
    { "id": 1, "symbol": "C", "position": [${0.7 * SCALE}, 0, ${1.212 * SCALE}] },
    { "id": 2, "symbol": "C", "position": [${-0.7 * SCALE}, 0, ${1.212 * SCALE}] },
    { "id": 3, "symbol": "C", "position": [${-1.4 * SCALE}, 0, 0] },
    { "id": 4, "symbol": "C", "position": [${-0.7 * SCALE}, 0, ${-1.212 * SCALE}] },
    { "id": 5, "symbol": "C", "position": [${0.7 * SCALE}, 0, ${-1.212 * SCALE}] },
    { "id": 6, "symbol": "H", "position": [${2.48 * SCALE}, 0, 0] },
    { "id": 7, "symbol": "H", "position": [${1.24 * SCALE}, 0, ${2.147 * SCALE}] },
    { "id": 8, "symbol": "H", "position": [${-1.24 * SCALE}, 0, ${2.147 * SCALE}] },
    { "id": 9, "symbol": "H", "position": [${-2.48 * SCALE}, 0, 0] },
    { "id": 10, "symbol": "H", "position": [${-1.24 * SCALE}, 0, ${-2.147 * SCALE}] },
    { "id": 11, "symbol": "H", "position": [${1.24 * SCALE}, 0, ${-2.147 * SCALE}] }
  ],
  "bonds": [
    { "atomId1": 0, "atomId2": 1, "order": 2 },
    { "atomId1": 1, "atomId2": 2, "order": 1 },
    { "atomId1": 2, "atomId2": 3, "order": 2 },
    { "atomId1": 3, "atomId2": 4, "order": 1 },
    { "atomId1": 4, "atomId2": 5, "order": 2 },
    { "atomId1": 5, "atomId2": 0, "order": 1 },
    { "atomId1": 0, "atomId2": 6, "order": 1 },
    { "atomId1": 1, "atomId2": 7, "order": 1 },
    { "atomId1": 2, "atomId2": 8, "order": 1 },
    { "atomId1": 3, "atomId2": 9, "order": 1 },
    { "atomId1": 4, "atomId2": 10, "order": 1 },
    { "atomId1": 5, "atomId2": 11, "order": 1 }
  ]
}`;

export const BUILTIN_MOLECULES: Record<string, string> = {
  h2o: H2O_JSON,
  co2: CO2_JSON,
  c6h6: C6H6_JSON,
};

export function parseMolecule(json: string): MoleculeData {
  const parsed = JSON.parse(json) as MoleculeData;
  return {
    name: parsed.name,
    formula: parsed.formula,
    atoms: parsed.atoms.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      position: [...a.position] as [number, number, number],
    })),
    bonds: parsed.bonds.map((b) => ({
      atomId1: b.atomId1,
      atomId2: b.atomId2,
      order: b.order,
    })),
  };
}

export class Molecule {
  readonly data: MoleculeData;

  constructor(data: MoleculeData) {
    this.data = data;
  }

  static fromJson(json: string): Molecule {
    return new Molecule(parseMolecule(json));
  }

  static builtin(key: string): Molecule {
    const json = BUILTIN_MOLECULES[key];
    if (!json) throw new Error(`Unknown molecule: ${key}`);
    return Molecule.fromJson(json);
  }

  getAtomById(id: number): AtomInstance | undefined {
    return this.data.atoms.find((a) => a.id === id);
  }

  center(): [number, number, number] {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const n = this.data.atoms.length;
    for (const a of this.data.atoms) {
      cx += a.position[0];
      cy += a.position[1];
      cz += a.position[2];
    }
    return [cx / n, cy / n, cz / n];
  }
}
