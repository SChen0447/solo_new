import * as THREE from 'three';

export interface AtomData {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  atom1: number;
  atom2: number;
  order: number;
}

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
}

export interface AtomObject {
  mesh: THREE.Mesh;
  element: string;
  index: number;
  label: string;
  originalColor: THREE.Color;
  highlightMesh?: THREE.Mesh;
}

export interface BondObject {
  meshes: THREE.Mesh[];
  atom1: number;
  atom2: number;
}

export interface MoleculeObjects {
  atoms: AtomObject[];
  bonds: BondObject[];
}

const ELEMENT_COLORS: Record<string, number> = {
  C: 0x555555,
  O: 0xff0000,
  N: 0x0000ff,
  H: 0xffffff,
  S: 0xffff00
};

const ELEMENT_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.5,
  O: 0.45,
  N: 0.45,
  S: 0.55
};

const DEFAULT_COLOR = 0x888888;
const DEFAULT_RADIUS = 0.4;

export class MoleculeParser {
  private atomGeometry: THREE.SphereGeometry;
  private highlightGeometry: THREE.SphereGeometry;

  constructor() {
    this.atomGeometry = new THREE.SphereGeometry(1, 32, 32);
    this.highlightGeometry = new THREE.SphereGeometry(1.05, 32, 32);
  }

  parse(text: string): MoleculeData {
    const lines = text.trim().split('\n').map(l => l.trim());
    const atoms: AtomData[] = [];
    const bonds: BondData[] = [];

    let atomCount = 0;
    let bondCount = 0;
    let headerEnd = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('END')) break;
      
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        const possibleAtomCount = Number(parts[0]);
        const possibleBondCount = Number(parts[1]);
        if (possibleAtomCount > 0 && possibleBondCount >= 0) {
          atomCount = possibleAtomCount;
          bondCount = possibleBondCount;
          headerEnd = i + 1;
          break;
        }
      }
    }

    if (atomCount === 0) {
      for (const line of lines) {
        if (line.includes('END') || line === '') continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const element = parts[3] || parts[0];
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          const z = parseFloat(parts[2]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            atoms.push({ element, x, y, z });
          }
        }
      }
    } else {
      for (let i = 0; i < atomCount && headerEnd + i < lines.length; i++) {
        const parts = lines[headerEnd + i].split(/\s+/);
        if (parts.length >= 4) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          const z = parseFloat(parts[2]);
          const element = parts[3] || 'C';
          atoms.push({ element, x, y, z });
        }
      }

      const bondsStart = headerEnd + atomCount;
      for (let i = 0; i < bondCount && bondsStart + i < lines.length; i++) {
        const parts = lines[bondsStart + i].split(/\s+/);
        if (parts.length >= 3) {
          const atom1 = parseInt(parts[0]) - 1;
          const atom2 = parseInt(parts[1]) - 1;
          const order = parseInt(parts[2]) || 1;
          bonds.push({ atom1, atom2, order });
        }
      }
    }

    return { atoms, bonds };
  }

  generateMoleculeObjects(data: MoleculeData): MoleculeObjects {
    const atoms: AtomObject[] = [];
    const bonds: BondObject[] = [];

    data.atoms.forEach((atomData, index) => {
      const color = ELEMENT_COLORS[atomData.element] ?? DEFAULT_COLOR;
      const radius = ELEMENT_RADII[atomData.element] ?? DEFAULT_RADIUS;

      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 100,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(this.atomGeometry, material);
      mesh.position.set(atomData.x, atomData.y, atomData.z);
      mesh.scale.setScalar(radius);

      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });

      const highlightMesh = new THREE.Mesh(this.highlightGeometry, highlightMaterial);
      highlightMesh.position.copy(mesh.position);
      highlightMesh.scale.copy(mesh.scale);

      atoms.push({
        mesh,
        element: atomData.element,
        index,
        label: atomData.element,
        originalColor: new THREE.Color(color),
        highlightMesh
      });
    });

    data.bonds.forEach(bondData => {
      const atom1 = data.atoms[bondData.atom1];
      const atom2 = data.atoms[bondData.atom2];
      if (!atom1 || !atom2) return;

      const hasCarbon = atom1.element === 'C' || atom2.element === 'C';
      const baseRadius = hasCarbon ? 0.08 : 0.05;
      const bondMeshes: THREE.Mesh[] = [];

      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);

      if (bondData.order === 1) {
        const cylinder = this.createBondCylinder(start, end, baseRadius, 0.7);
        bondMeshes.push(cylinder);
      } else if (bondData.order === 2) {
        const offset = 0.1;
        const perp = this.getPerpendicularVector(start, end, offset);
        const c1 = this.createBondCylinder(
          start.clone().add(perp),
          end.clone().add(perp),
          baseRadius * 0.7,
          0.7
        );
        const c2 = this.createBondCylinder(
          start.clone().sub(perp),
          end.clone().sub(perp),
          baseRadius * 0.7,
          0.7
        );
        bondMeshes.push(c1, c2);
      } else if (bondData.order >= 3) {
        const offset = 0.08;
        const perp = this.getPerpendicularVector(start, end, offset);
        const c1 = this.createBondCylinder(
          start.clone().add(perp),
          end.clone().add(perp),
          baseRadius * 0.55,
          0.7
        );
        const c2 = this.createBondCylinder(start, end, baseRadius * 0.55, 0.7);
        const c3 = this.createBondCylinder(
          start.clone().sub(perp),
          end.clone().sub(perp),
          baseRadius * 0.55,
          0.7
        );
        bondMeshes.push(c1, c2, c3);
      }

      bonds.push({
        meshes: bondMeshes,
        atom1: bondData.atom1,
        atom2: bondData.atom2
      });
    });

    return { atoms, bonds };
  }

  private createBondCylinder(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    opacity: number
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 12);
    const material = new THREE.MeshPhongMaterial({
      color: 0x888888,
      transparent: true,
      opacity
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5));
    cylinder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    return cylinder;
  }

  private getPerpendicularVector(
    start: THREE.Vector3,
    end: THREE.Vector3,
    length: number
  ): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const up = Math.abs(direction.y) < 0.9 
      ? new THREE.Vector3(0, 1, 0) 
      : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(direction, up).normalize();
    return perp.multiplyScalar(length);
  }

  getElementColor(element: string): string {
    const color = ELEMENT_COLORS[element] ?? DEFAULT_COLOR;
    return '#' + color.toString(16).padStart(6, '0');
  }

  getDemoMoleculeData(): MoleculeData {
    return {
      atoms: [
        { element: 'C', x: 0, y: 0, z: 0 },
        { element: 'C', x: 1.54, y: 0, z: 0 },
        { element: 'C', x: 2.31, y: 1.33, z: 0 },
        { element: 'C', x: 1.54, y: 2.66, z: 0 },
        { element: 'C', x: 0, y: 2.66, z: 0 },
        { element: 'C', x: -0.77, y: 1.33, z: 0 },
        { element: 'H', x: 0, y: -1.1, z: 0 },
        { element: 'H', x: 1.54, y: -1.1, z: 0 },
        { element: 'H', x: 3.41, y: 1.33, z: 0 },
        { element: 'H', x: 1.54, y: 3.76, z: 0 },
        { element: 'H', x: 0, y: 3.76, z: 0 },
        { element: 'H', x: -1.87, y: 1.33, z: 0 }
      ],
      bonds: [
        { atom1: 0, atom2: 1, order: 1 },
        { atom1: 1, atom2: 2, order: 2 },
        { atom1: 2, atom2: 3, order: 1 },
        { atom1: 3, atom2: 4, order: 2 },
        { atom1: 4, atom2: 5, order: 1 },
        { atom1: 5, atom2: 0, order: 2 },
        { atom1: 0, atom2: 6, order: 1 },
        { atom1: 1, atom2: 7, order: 1 },
        { atom1: 2, atom2: 8, order: 1 },
        { atom1: 3, atom2: 9, order: 1 },
        { atom1: 4, atom2: 10, order: 1 },
        { atom1: 5, atom2: 11, order: 1 }
      ]
    };
  }
}
