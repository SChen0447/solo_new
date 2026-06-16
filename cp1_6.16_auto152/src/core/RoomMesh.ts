import * as THREE from 'three';
import { RoomDimensions, SoundSource, AcousticResult, SurfaceGridData } from '@/types';

const MIN_SPL = 30;
const MAX_SPL = 80;
const COLOR_LOW = new THREE.Color('#1565C0');
const COLOR_HIGH = new THREE.Color('#FF1744');

interface SurfaceMeshes {
  floor: THREE.Mesh;
  ceiling: THREE.Mesh;
  wallNorth: THREE.Mesh;
  wallSouth: THREE.Mesh;
  wallEast: THREE.Mesh;
  wallWest: THREE.Mesh;
}

export class RoomMesh {
  private group: THREE.Group;
  private dimensions: RoomDimensions;
  private surfaces: SurfaceMeshes;
  private sourceMeshes: THREE.Mesh[] = [];
  private wallColor: string = '#F0F0F0';
  private targetColors: Map<THREE.BufferGeometry, Float32Array> = new Map();
  private currentColors: Map<THREE.BufferGeometry, Float32Array> = new Map();

  constructor(dimensions: RoomDimensions) {
    this.dimensions = dimensions;
    this.group = new THREE.Group();
    this.surfaces = this.createSurfaces();
    this.createSourceMarkers();
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getSurfaces(): SurfaceMeshes {
    return this.surfaces;
  }

  public getPickableMeshes(): THREE.Mesh[] {
    return Object.values(this.surfaces);
  }

  public setDimensions(dimensions: RoomDimensions): void {
    this.dimensions = dimensions;
    this.rebuild();
  }

  public setWallColor(color: string): void {
    this.wallColor = color;
    this.updateBaseColors();
  }

  private rebuild(): void {
    Object.values(this.surfaces).forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose());
      } else {
        m.material.dispose();
      }
    });
    this.sourceMeshes.forEach((m) => {
      this.group.remove(m);
      m.geometry.dispose();
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose());
      } else {
        m.material.dispose();
      }
    });
    this.targetColors.clear();
    this.currentColors.clear();
    this.surfaces = this.createSurfaces();
    this.createSourceMarkers();
  }

  private createPlaneGeometry(
    width: number,
    height: number,
    gridW: number,
    gridH: number
  ): THREE.PlaneGeometry {
    return new THREE.PlaneGeometry(width, height, gridW - 1, gridH - 1);
  }

  private createColoredMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05
    });
  }

  private createSurfaces(): SurfaceMeshes {
    const { width: w, depth: d, height: h } = this.dimensions;
    const grid = 20;

    const floorGeo = this.createPlaneGeometry(w, d, grid, grid);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(w / 2, 0, d / 2);
    const floor = new THREE.Mesh(floorGeo, this.createColoredMaterial());
    floor.name = 'floor';
    this.group.add(floor);

    const ceilingGeo = this.createPlaneGeometry(w, d, grid, grid);
    ceilingGeo.rotateX(Math.PI / 2);
    ceilingGeo.translate(w / 2, h, d / 2);
    const ceiling = new THREE.Mesh(ceilingGeo, this.createColoredMaterial());
    ceiling.name = 'ceiling';
    this.group.add(ceiling);

    const wallNorthGeo = this.createPlaneGeometry(w, h, grid, grid);
    wallNorthGeo.translate(w / 2, h / 2, d);
    const wallNorth = new THREE.Mesh(wallNorthGeo, this.createColoredMaterial());
    wallNorth.name = 'wallNorth';
    this.group.add(wallNorth);

    const wallSouthGeo = this.createPlaneGeometry(w, h, grid, grid);
    wallSouthGeo.rotateY(Math.PI);
    wallSouthGeo.translate(w / 2, h / 2, 0);
    const wallSouth = new THREE.Mesh(wallSouthGeo, this.createColoredMaterial());
    wallSouth.name = 'wallSouth';
    this.group.add(wallSouth);

    const wallEastGeo = this.createPlaneGeometry(d, h, grid, grid);
    wallEastGeo.rotateY(Math.PI / 2);
    wallEastGeo.translate(w, h / 2, d / 2);
    const wallEast = new THREE.Mesh(wallEastGeo, this.createColoredMaterial());
    wallEast.name = 'wallEast';
    this.group.add(wallEast);

    const wallWestGeo = this.createPlaneGeometry(d, h, grid, grid);
    wallWestGeo.rotateY(-Math.PI / 2);
    wallWestGeo.translate(0, h / 2, d / 2);
    const wallWest = new THREE.Mesh(wallWestGeo, this.createColoredMaterial());
    wallWest.name = 'wallWest';
    this.group.add(wallWest);

    this.initVertexColors(floorGeo);
    this.initVertexColors(ceilingGeo);
    this.initVertexColors(wallNorthGeo);
    this.initVertexColors(wallSouthGeo);
    this.initVertexColors(wallEastGeo);
    this.initVertexColors(wallWestGeo);

    return { floor, ceiling, wallNorth, wallSouth, wallEast, wallWest };
  }

  private initVertexColors(geometry: THREE.BufferGeometry): void {
    const positionAttr = geometry.getAttribute('position');
    const vertexCount = positionAttr.count;
    const colors = new Float32Array(vertexCount * 3);
    const baseColor = new THREE.Color(this.wallColor);

    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.currentColors.set(geometry, new Float32Array(colors));
    this.targetColors.set(geometry, new Float32Array(colors));
  }

  private updateBaseColors(): void {
    const baseColor = new THREE.Color(this.wallColor);
    Object.values(this.surfaces).forEach((mesh) => {
      const geometry = mesh.geometry;
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
      const colors = colorAttr.array as Float32Array;
      const target = this.targetColors.get(geometry)!;

      for (let i = 0; i < colorAttr.count; i++) {
        const t = this.getColorMixFactor(colors, i);
        const mixed = new THREE.Color().copy(baseColor).lerp(COLOR_HIGH, t * 0);
        colors[i * 3] = mixed.r;
        colors[i * 3 + 1] = mixed.g;
        colors[i * 3 + 2] = mixed.b;
        target[i * 3] = mixed.r;
        target[i * 3 + 1] = mixed.g;
        target[i * 3 + 2] = mixed.b;
      }
      colorAttr.needsUpdate = true;
    });
  }

  private getColorMixFactor(colors: Float32Array, vertexIndex: number): number {
    const r = colors[vertexIndex * 3];
    const g = colors[vertexIndex * 3 + 1];
    const b = colors[vertexIndex * 3 + 2];
    const low = COLOR_LOW;
    const high = COLOR_HIGH;
    const distLow = Math.sqrt((r - low.r) ** 2 + (g - low.g) ** 2 + (b - low.b) ** 2);
    const distHigh = Math.sqrt((r - high.r) ** 2 + (g - high.g) ** 2 + (b - high.b) ** 2);
    const total = distLow + distHigh;
    return total > 0 ? distLow / total : 0.5;
  }

  private mapSPLToColor(spl: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (spl - MIN_SPL) / (MAX_SPL - MIN_SPL)));
    const color = new THREE.Color();
    color.copy(COLOR_LOW).lerp(COLOR_HIGH, t);
    return color;
  }

  private applyGridToSurface(
    geometry: THREE.BufferGeometry,
    gridData: SurfaceGridData,
    swapUV: boolean = false
  ): void {
    const positionAttr = geometry.getAttribute('position');
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const target = this.targetColors.get(geometry)!;
    const gridW = gridData.width;
    const gridH = gridData.height;
    const bbox = new THREE.Box3().setFromAttribute(positionAttr);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const min = bbox.min;

    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const z = positionAttr.getZ(i);

      let u: number, v: number;
      if (swapUV) {
        u = (z - min.z) / (size.z || 1);
        v = (y - min.y) / (size.y || 1);
      } else {
        u = (x - min.x) / (size.x || 1);
        v = (Math.abs(size.y) > 0.01 ? (y - min.y) / size.y : (z - min.z) / (size.z || 1));
      }

      u = Math.max(0, Math.min(0.999, u));
      v = Math.max(0, Math.min(0.999, v));

      const gi = Math.floor(u * (gridW - 1));
      const gj = Math.floor(v * (gridH - 1));
      const spl = gridData.splValues[gi]?.[gj] ?? MIN_SPL;
      const color = this.mapSPLToColor(spl);

      target[i * 3] = color.r;
      target[i * 3 + 1] = color.g;
      target[i * 3 + 2] = color.b;
    }
  }

  public updateAcousticColors(result: AcousticResult): void {
    this.applyGridToSurface(this.surfaces.floor.geometry, result.floor, false);
    this.applyGridToSurface(this.surfaces.ceiling.geometry, result.ceiling, false);
    this.applyGridToSurface(this.surfaces.wallNorth.geometry, result.wallNorth, false);
    this.applyGridToSurface(this.surfaces.wallSouth.geometry, result.wallSouth, false);
    this.applyGridToSurface(this.surfaces.wallEast.geometry, result.wallEast, true);
    this.applyGridToSurface(this.surfaces.wallWest.geometry, result.wallWest, true);
  }

  public animateColors(deltaTime: number, transitionDuration: number = 0.5): void {
    const alpha = Math.min(1, deltaTime / transitionDuration);

    Object.values(this.surfaces).forEach((mesh) => {
      const geometry = mesh.geometry;
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
      const colors = colorAttr.array as Float32Array;
      const current = this.currentColors.get(geometry)!;
      const target = this.targetColors.get(geometry);
      if (!target) return;

      let changed = false;
      for (let i = 0; i < colors.length; i++) {
        if (Math.abs(current[i] - target[i]) > 0.0001) {
          current[i] += (target[i] - current[i]) * alpha;
          colors[i] = current[i];
          changed = true;
        }
      }

      if (changed) {
        colorAttr.needsUpdate = true;
      }
    });
  }

  private createSourceMarkers(): void {
    this.sourceMeshes = [];
    const defaultPositions: Array<[number, number, number]> = [
      [2, 1.5, 2],
      [6, 1.5, 4],
      [4, 1.5, 7]
    ];

    defaultPositions.forEach((pos) => {
      const geo = new THREE.SphereGeometry(0.3, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: '#FFD54F',
        transparent: true,
        opacity: 0.75,
        emissive: '#FFD54F',
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.name = 'soundSource';
      this.group.add(mesh);
      this.sourceMeshes.push(mesh);
    });
  }

  public updateSourcePositions(sources: SoundSource[]): void {
    sources.forEach((src, idx) => {
      if (this.sourceMeshes[idx]) {
        this.sourceMeshes[idx].position.set(src.x, src.y, src.z);
      }
    });
  }
}
