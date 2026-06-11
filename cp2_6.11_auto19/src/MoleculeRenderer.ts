import {
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  InstancedMesh,
  SphereGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  Matrix4,
  Vector3,
  Quaternion,
  Object3D,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  Float32BufferAttribute,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  TextureLoader,
  RepeatWrapping,
  PlaneGeometry,
  Mesh,
  Raycaster,
  DoubleSide,
  AdditiveBlending,
  Fog,
} from 'three';
import type { MoleculeData, AtomData, BondData, RenderMode, AtomHoverEvent } from './ModuleLoader';
import { getElementColor, getCovalentRadius } from './ModuleLoader';

const MODE_SCALES: Record<RenderMode, { atom: number; bond: number }> = {
  'ball-and-stick': { atom: 0.4, bond: 0.12 },
  'space-filling': { atom: 1.0, bond: 0.06 },
  'wireframe': { atom: 0.15, bond: 0.04 },
};

const ATOM_BASE_RADIUS = 0.5;
const BOND_BASE_RADIUS = 0.1;
const TRANSITION_DURATION = 0.3;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class MoleculeRenderer {
  scene: Scene;
  moleculeData: MoleculeData | null = null;
  atomMesh: InstancedMesh | null = null;
  bondMesh: InstancedMesh | null = null;
  wireframeLines: LineSegments | null = null;
  highlightMesh: InstancedMesh | null = null;
  labelSprites: Sprite[] = [];
  gridMesh: Mesh | null = null;

  currentMode: RenderMode = 'ball-and-stick';
  private _targetMode: RenderMode = 'ball-and-stick';
  private _startAtomScale: number = MODE_SCALES['ball-and-stick'].atom;
  private _startBondScale: number = MODE_SCALES['ball-and-stick'].bond;
  private _targetAtomScale: number = MODE_SCALES['ball-and-stick'].atom;
  private _targetBondScale: number = MODE_SCALES['ball-and-stick'].bond;
  private _transitionProgress: number = 1;
  showLabels: boolean = false;

  hoveredAtomIndex: number = -1;
  atomPositions: Vector3[] = [];
  atomElements: string[] = [];
  neighborMap: Map<number, number[]> = new Map();
  atomBondMap: Map<number, BondData[]> = new Map();

  private _dummy: Object3D = new Object3D();
  private _tempMatrix: Matrix4 = new Matrix4();
  private _tempVec: Vector3 = new Vector3();
  private _tempQuat: Quaternion = new Quaternion();

  constructor() {
    this.scene = new Scene();
    this.scene.background = new Color(0x0a0f1a);
    this.scene.fog = new Fog(0x0a0f1a, 60, 120);

    this._setupLighting();
    this._createGrid();
  }

  private _setupLighting(): void {
    const ambient = new AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dir1 = new DirectionalLight(0xffffff, 0.7);
    dir1.position.set(5, 8, 5);
    this.scene.add(dir1);

    const dir2 = new DirectionalLight(0x4fc3f7, 0.3);
    dir2.position.set(-5, 3, -5);
    this.scene.add(dir2);
  }

  private _createGrid(): void {
    const size = 100;
    const divisions = 50;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.06)';
    ctx.lineWidth = 1;

    const step = 512 / divisions;
    for (let i = 0; i <= divisions; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(512, i * step);
      ctx.stroke();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 2);

    const planeGeo = new PlaneGeometry(size, size);
    const planeMat = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
      side: DoubleSide,
    });
    this.gridMesh = new Mesh(planeGeo, planeMat);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.gridMesh.position.y = -10;
    this.scene.add(this.gridMesh);
  }

  loadMolecule(data: MoleculeData): void {
    this._clearMolecule();
    this.moleculeData = data;

    this.atomPositions = data.atoms.map(a => new Vector3(a.x, a.y, a.z));
    this.atomElements = data.atoms.map(a => a.element);

    this._buildNeighborMaps(data);
    this._createAtomMesh(data);
    this._createBondMesh(data);
    this._createHighlightMesh(data);

    if (this.showLabels) {
      this._createLabels(data);
    }
  }

  private _clearMolecule(): void {
    if (this.atomMesh) {
      this.scene.remove(this.atomMesh);
      this.atomMesh.dispose();
      this.atomMesh = null;
    }
    if (this.bondMesh) {
      this.scene.remove(this.bondMesh);
      this.bondMesh.dispose();
      this.bondMesh = null;
    }
    if (this.wireframeLines) {
      this.scene.remove(this.wireframeLines);
      this.wireframeLines = null;
    }
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.dispose();
      this.highlightMesh = null;
    }
    this._removeLabels();
    this.moleculeData = null;
    this.hoveredAtomIndex = -1;
  }

  private _buildNeighborMaps(data: MoleculeData): void {
    this.neighborMap.clear();
    this.atomBondMap.clear();

    for (const atom of data.atoms) {
      this.neighborMap.set(atom.index, []);
      this.atomBondMap.set(atom.index, []);
    }

    for (const bond of data.bonds) {
      const n1 = this.neighborMap.get(bond.atomIndex1);
      const n2 = this.neighborMap.get(bond.atomIndex2);
      if (n1) n1.push(bond.atomIndex2);
      if (n2) n2.push(bond.atomIndex1);

      const b1 = this.atomBondMap.get(bond.atomIndex1);
      const b2 = this.atomBondMap.get(bond.atomIndex2);
      if (b1) b1.push(bond);
      if (b2) b2.push(bond);
    }
  }

  private _createAtomMesh(data: MoleculeData): void {
    const segmentCount = data.atoms.length > 500 ? 16 : 24;
    const geo = new SphereGeometry(ATOM_BASE_RADIUS, segmentCount, segmentCount);
    const mat = new MeshPhysicalMaterial({
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    });

    this.atomMesh = new InstancedMesh(geo, mat, data.atoms.length);

    for (let i = 0; i < data.atoms.length; i++) {
      const atom = data.atoms[i];
      const color = getElementColor(atom.element);
      this.atomMesh.setColorAt(i, new Color(color));

      const scale = this._getAtomScale(atom.element);
      this._dummy.position.set(atom.x, atom.y, atom.z);
      this._dummy.scale.setScalar(scale);
      this._dummy.updateMatrix();
      this.atomMesh.setMatrixAt(i, this._dummy.matrix);
    }

    this.atomMesh.instanceMatrix.needsUpdate = true;
    if (this.atomMesh.instanceColor) this.atomMesh.instanceColor.needsUpdate = true;
    this.atomMesh.userData.isAtomMesh = true;
    this.scene.add(this.atomMesh);
  }

  private _createBondMesh(data: MoleculeData): void {
    if (data.bonds.length === 0) return;

    const geo = new CylinderGeometry(BOND_BASE_RADIUS, BOND_BASE_RADIUS, 1, 8, 1);
    const mat = new MeshPhysicalMaterial({
      roughness: 0.5,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
      clearcoat: 0.2,
    });

    this.bondMesh = new InstancedMesh(geo, mat, data.bonds.length);

    for (let i = 0; i < data.bonds.length; i++) {
      this._setBondMatrix(i, data.bonds[i]);
      const midColor = new Color(0x8899aa);
      this.bondMesh.setColorAt(i, midColor);
    }

    this.bondMesh.instanceMatrix.needsUpdate = true;
    if (this.bondMesh.instanceColor) this.bondMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.bondMesh);
  }

  private _setBondMatrix(index: number, bond: BondData, scaleOverride?: number): void {
    if (!this.atomPositions[bond.atomIndex1] || !this.atomPositions[bond.atomIndex2]) return;

    const p1 = this.atomPositions[bond.atomIndex1];
    const p2 = this.atomPositions[bond.atomIndex2];

    const mid = this._tempVec.addVectors(p1, p2).multiplyScalar(0.5);
    const direction = new Vector3().subVectors(p2, p1);
    const length = direction.length();
    direction.normalize();

    const bondScale = scaleOverride ?? this._currentBondScaleValue;

    this._dummy.position.copy(mid);
    this._dummy.scale.set(bondScale, length, bondScale);
    this._dummy.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    this._dummy.updateMatrix();
    this.bondMesh!.setMatrixAt(index, this._dummy.matrix);
  }

  private _createHighlightMesh(data: MoleculeData): void {
    const geo = new SphereGeometry(ATOM_BASE_RADIUS, 24, 24);
    const mat = new MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this.highlightMesh = new InstancedMesh(geo, mat, data.atoms.length);
    for (let i = 0; i < data.atoms.length; i++) {
      this._dummy.position.copy(this.atomPositions[i]);
      this._dummy.scale.setScalar(0.001);
      this._dummy.updateMatrix();
      this.highlightMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.highlightMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.highlightMesh);
  }

  private _getAtomScale(element: string, atomScale?: number): number {
    const baseRadius = getCovalentRadius(element) / getCovalentRadius('C');
    const scale = atomScale ?? this._currentAtomScaleValue;
    return baseRadius * scale;
  }

  private get _currentAtomScaleValue(): number {
    if (this._transitionProgress >= 1) return this._targetAtomScale;
    const t = easeOutCubic(this._transitionProgress);
    return this._startAtomScale + (this._targetAtomScale - this._startAtomScale) * t;
  }

  private get _currentBondScaleValue(): number {
    if (this._transitionProgress >= 1) return this._targetBondScale;
    const t = easeOutCubic(this._transitionProgress);
    return this._startBondScale + (this._targetBondScale - this._startBondScale) * t;
  }

  setRenderMode(mode: RenderMode): void {
    if (mode === this._targetMode && this._transitionProgress >= 1) return;
    this._startAtomScale = this._currentAtomScaleValue;
    this._startBondScale = this._currentBondScaleValue;
    this._targetMode = mode;
    this._targetAtomScale = MODE_SCALES[mode].atom;
    this._targetBondScale = MODE_SCALES[mode].bond;
    this._transitionProgress = 0;
  }

  toggleLabels(show: boolean): void {
    this.showLabels = show;
    if (this.moleculeData) {
      if (show) {
        this._createLabels(this.moleculeData);
      } else {
        this._removeLabels();
      }
    }
  }

  private _createLabels(data: MoleculeData): void {
    this._removeLabels();

    for (let i = 0; i < data.atoms.length; i++) {
      const atom = data.atoms[i];
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      ctx.font = 'bold 32px JetBrains Mono, monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${atom.element}${atom.index + 1}`, 64, 32);

      const texture = new CanvasTexture(canvas);
      const spriteMat = new SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new Sprite(spriteMat);
      sprite.position.set(atom.x, atom.y + ATOM_BASE_RADIUS * this._getAtomScale(atom.element) + 0.5, atom.z);
      sprite.scale.set(1.2, 0.6, 1);
      sprite.userData.atomIndex = i;
      this.scene.add(sprite);
      this.labelSprites.push(sprite);
    }
  }

  private _removeLabels(): void {
    for (const sprite of this.labelSprites) {
      this.scene.remove(sprite);
      if (sprite.material instanceof SpriteMaterial) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    }
    this.labelSprites = [];
  }

  setHoveredAtom(index: number): void {
    if (index === this.hoveredAtomIndex) return;

    if (this.hoveredAtomIndex >= 0) {
      this._setAtomHighlight(this.hoveredAtomIndex, false);
    }

    this.hoveredAtomIndex = index;

    if (index >= 0) {
      this._setAtomHighlight(index, true);
    }
  }

  private _setAtomHighlight(atomIndex: number, highlight: boolean): void {
    if (!this.highlightMesh || !this.atomMesh) return;

    const baseScale = this._getAtomScale(this.atomElements[atomIndex]);
    const hlScale = highlight ? baseScale * 1.8 : 0.001;

    this._dummy.position.copy(this.atomPositions[atomIndex]);
    this._dummy.scale.setScalar(hlScale);
    this._dummy.updateMatrix();
    this.highlightMesh.setMatrixAt(atomIndex, this._dummy.matrix);

    const neighbors = this.neighborMap.get(atomIndex) || [];
    for (const nIdx of neighbors) {
      const nBaseScale = this._getAtomScale(this.atomElements[nIdx]);
      const nHlScale = highlight ? nBaseScale * 1.3 : 0.001;
      this._dummy.position.copy(this.atomPositions[nIdx]);
      this._dummy.scale.setScalar(nHlScale);
      this._dummy.updateMatrix();
      this.highlightMesh.setMatrixAt(nIdx, this._dummy.matrix);
    }
    this.highlightMesh.instanceMatrix.needsUpdate = true;

    this._highlightBonds(atomIndex, highlight);
  }

  private _highlightBonds(atomIndex: number, highlight: boolean): void {
    if (!this.bondMesh || !this.moleculeData) return;

    const bonds = this.atomBondMap.get(atomIndex) || [];
    if (bonds.length === 0) return;

    for (const bond of bonds) {
      const bondIndex = this.moleculeData.bonds.indexOf(bond);
      if (bondIndex < 0) continue;

      if (highlight) {
        this.bondMesh.setColorAt(bondIndex, new Color(0x4fc3f7));
      } else {
        this.bondMesh.setColorAt(bondIndex, new Color(0x8899aa));
      }
    }
    if (this.bondMesh.instanceColor) {
      this.bondMesh.instanceColor.needsUpdate = true;
    }
  }

  update(delta: number): void {
    if (this._transitionProgress < 1) {
      this._transitionProgress = Math.min(1, this._transitionProgress + delta / TRANSITION_DURATION);

      if (this.atomMesh && this.moleculeData) {
        for (let i = 0; i < this.moleculeData.atoms.length; i++) {
          const atom = this.moleculeData.atoms[i];
          const scale = this._getAtomScale(atom.element);
          this._dummy.position.set(atom.x, atom.y, atom.z);
          this._dummy.scale.setScalar(scale);
          this._dummy.updateMatrix();
          this.atomMesh.setMatrixAt(i, this._dummy.matrix);
        }
        this.atomMesh.instanceMatrix.needsUpdate = true;
      }

      if (this.bondMesh && this.moleculeData) {
        for (let i = 0; i < this.moleculeData.bonds.length; i++) {
          this._setBondMatrix(i, this.moleculeData.bonds[i]);
        }
        this.bondMesh.instanceMatrix.needsUpdate = true;
      }

      if (this.hoveredAtomIndex >= 0) {
        this._setAtomHighlight(this.hoveredAtomIndex, true);
      }

      if (this._transitionProgress >= 1) {
        this.currentMode = this._targetMode;
      }
    }

    if (this.showLabels && this.moleculeData && this.labelSprites.length > 0) {
      for (let i = 0; i < this.labelSprites.length && i < this.moleculeData.atoms.length; i++) {
        const atom = this.moleculeData.atoms[i];
        const scale = this._getAtomScale(atom.element);
        this.labelSprites[i].position.set(atom.x, atom.y + ATOM_BASE_RADIUS * scale + 0.5, atom.z);
      }
    }
  }

  getAtomInfo(atomIndex: number, screenPos: { x: number; y: number }): AtomHoverEvent | null {
    if (!this.moleculeData || atomIndex < 0 || atomIndex >= this.moleculeData.atoms.length) return null;

    const atom = this.moleculeData.atoms[atomIndex];
    const neighbors = (this.neighborMap.get(atomIndex) || []).map(i => this.moleculeData!.atoms[i]);
    const bonds = this.atomBondMap.get(atomIndex) || [];

    return {
      atom,
      neighbors,
      bonds,
      worldPosition: this.atomPositions[atomIndex].clone(),
      screenPosition: screenPos,
    };
  }

  dispose(): void {
    this._clearMolecule();
    if (this.gridMesh) {
      this.scene.remove(this.gridMesh);
      (this.gridMesh.material as MeshBasicMaterial).map?.dispose();
      (this.gridMesh.material as MeshBasicMaterial).dispose();
      this.gridMesh.geometry.dispose();
    }
  }
}
