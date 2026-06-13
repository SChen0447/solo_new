import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BuildingData, BuildingManager } from './BuildingManager';

export type AnalysisMode = 'none' | 'heatmap' | 'shadow';

export class AnalysisModule {
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  private currentMode: AnalysisMode = 'none';
  private labelGroup: THREE.Group;
  private mergedShadowMesh: THREE.Mesh | null = null;
  private heightMin: number = 10;
  private heightMax: number = 150;
  private sunAzimuth: number = 180 * (Math.PI / 180);
  private sunElevation: number = 80 * (Math.PI / 180);
  private originalMaterials: Map<number, THREE.Material | THREE.Material[]> = new Map();
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;

  constructor(scene: THREE.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);
  }

  private getHeatmapColor(height: number): THREE.Color {
    const t = THREE.MathUtils.clamp((height - this.heightMin) / (this.heightMax - this.heightMin), 0, 1);
    const color = new THREE.Color();
    if (t < 0.25) {
      const k = t / 0.25;
      color.r = 0;
      color.g = k * 0.8;
      color.b = 1;
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      color.r = 0;
      color.g = 0.8 + k * 0.2;
      color.b = 1 - k;
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      color.r = k;
      color.g = 1;
      color.b = 0;
    } else {
      const k = (t - 0.75) / 0.25;
      color.r = 1;
      color.g = 1 - k;
      color.b = 0;
    }
    return color;
  }

  private applyHeatmap(): void {
    const buildings = this.buildingManager.getBuildings();
    this.heightMin = this.buildingManager.getHeightRange().min;
    this.heightMax = this.buildingManager.getHeightRange().max;

    buildings.forEach((b) => {
      if (!this.originalMaterials.has(b.id)) {
        this.originalMaterials.set(b.id, b.mesh.material);
      }

      const color = this.getHeatmapColor(b.height);
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(color);
      mat.emissive.copy(color).multiplyScalar(0.1);

      if (!b.groundLabel) {
        const labelGeo = new THREE.PlaneGeometry(b.width * 1.1, b.depth * 1.1);
        const labelMat = new THREE.MeshBasicMaterial({
          color: color.clone(),
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.rotation.x = -Math.PI / 2;
        label.position.set(b.position.x, 0.05, b.position.z);
        b.groundLabel = label;
        this.labelGroup.add(label);
      } else {
        const labelMat = b.groundLabel.material as THREE.MeshBasicMaterial;
        labelMat.color.copy(color);
        b.groundLabel.visible = true;
      }
    });
  }

  private removeHeatmap(): void {
    const buildings = this.buildingManager.getBuildings();
    buildings.forEach((b) => {
      if (this.originalMaterials.has(b.id)) {
        b.mesh.material = this.originalMaterials.get(b.id) as THREE.Material | THREE.Material[];
      }
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) mat.emissive.set(0x000000);
      if (b.groundLabel) {
        b.groundLabel.visible = false;
      }
    });
    this.originalMaterials.clear();
  }

  private computeShadowProjectionGeometry(b: BuildingData): THREE.BufferGeometry | null {
    const tanElev = Math.tan(this.sunElevation);
    if (tanElev < 0.01) return null;
    const shadowLen = b.height / tanElev;
    const shadowDirX = Math.sin(this.sunAzimuth) * shadowLen;
    const shadowDirZ = Math.cos(this.sunAzimuth) * shadowLen;

    const hw = b.width / 2;
    const hd = b.depth / 2;
    const baseY = 0.02;

    const botCorners = [
      new THREE.Vector3(b.position.x + hw, baseY, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, baseY, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, baseY, b.position.z - hd),
      new THREE.Vector3(b.position.x + hw, baseY, b.position.z - hd),
    ];

    const projectedTop = [
      new THREE.Vector3(b.position.x + hw + shadowDirX, baseY, b.position.z + hd + shadowDirZ),
      new THREE.Vector3(b.position.x - hw + shadowDirX, baseY, b.position.z + hd + shadowDirZ),
      new THREE.Vector3(b.position.x - hw + shadowDirX, baseY, b.position.z - hd + shadowDirZ),
      new THREE.Vector3(b.position.x + hw + shadowDirX, baseY, b.position.z - hd + shadowDirZ),
    ];

    const allPts = [...botCorners, ...projectedTop];
    let cx = 0, cz = 0;
    allPts.forEach(p => { cx += p.x; cz += p.z; });
    cx /= allPts.length;
    cz /= allPts.length;

    const withAngle = allPts.map(p => ({
      p,
      a: Math.atan2(p.z - cz, p.x - cx),
    }));
    withAngle.sort((a, b) => a.a - b.a);

    const hullPts: THREE.Vector2[] = [];
    for (let i = 0; i < withAngle.length; i++) {
      const curr = withAngle[i];
      const prev = withAngle[(i - 1 + withAngle.length) % withAngle.length];
      const dx = curr.p.x - prev.p.x;
      const dz = curr.p.z - prev.p.z;
      if (i === 0 || (dx * dx + dz * dz) > 0.01) {
        hullPts.push(new THREE.Vector2(curr.p.x - cx, curr.p.z - cz));
      }
    }

    if (hullPts.length < 3) return null;

    try {
      const shape = new THREE.Shape();
      shape.moveTo(hullPts[0].x, hullPts[0].y);
      for (let i = 1; i < hullPts.length; i++) {
        shape.lineTo(hullPts[i].x, hullPts[i].y);
      }
      shape.closePath();

      const shapeGeo = new THREE.ShapeGeometry(shape);
      const posAttr = shapeGeo.attributes.position as THREE.BufferAttribute;
      const newPositions = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        newPositions[i * 3] = posAttr.getX(i) + cx;
        newPositions[i * 3 + 1] = baseY;
        newPositions[i * 3 + 2] = posAttr.getY(i) + cz;
      }
      posAttr.array = newPositions;
      posAttr.needsUpdate = true;
      shapeGeo.computeVertexNormals();
      return shapeGeo;
    } catch (e) {
      return null;
    }
  }

  private applyShadows(): void {
    const buildings = this.buildingManager.getBuildings();
    const geometries: THREE.BufferGeometry[] = [];

    buildings.forEach((b) => {
      if (!b.mesh.visible) return;
      const geo = this.computeShadowProjectionGeometry(b);
      if (geo) {
        geometries.push(geo);
      }
    });

    if (geometries.length === 0) return;

    let mergedGeo: THREE.BufferGeometry;
    try {
      mergedGeo = mergeGeometries(geometries, false);
    } catch (e) {
      let totalVerts = 0;
      geometries.forEach(g => { totalVerts += g.attributes.position.count; });
      const positions = new Float32Array(totalVerts * 3);
      let offset = 0;
      geometries.forEach(g => {
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          positions[offset++] = pos.getX(i);
          positions[offset++] = pos.getY(i);
          positions[offset++] = pos.getZ(i);
        }
      });
      mergedGeo = new THREE.BufferGeometry();
      mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    geometries.forEach(g => g.dispose());

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0.0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x111122,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mergedShadowMesh = new THREE.Mesh(mergedGeo, shadowMat);
    this.mergedShadowMesh.renderOrder = -1;
    this.scene.add(this.mergedShadowMesh);
  }

  private removeShadows(): void {
    if (this.mergedShadowMesh) {
      this.mergedShadowMesh.geometry.dispose();
      if (Array.isArray(this.mergedShadowMesh.material)) {
        this.mergedShadowMesh.material.forEach(m => m.dispose());
      } else {
        this.mergedShadowMesh.material.dispose();
      }
      this.scene.remove(this.mergedShadowMesh);
      this.mergedShadowMesh = null;
    }
  }

  setMode(mode: AnalysisMode): void {
    if (this.currentMode === mode) return;

    if (this.currentMode === 'heatmap') this.removeHeatmap();
    if (this.currentMode === 'shadow') this.removeShadows();

    this.currentMode = mode;

    if (mode === 'heatmap') this.applyHeatmap();
    if (mode === 'shadow') this.applyShadows();
  }

  getMode(): AnalysisMode {
    return this.currentMode;
  }

  getHeatmapLegendColors(): { value: number; color: THREE.Color }[] {
    return [
      { value: this.heightMin, color: this.getHeatmapColor(this.heightMin) },
      { value: this.heightMin + (this.heightMax - this.heightMin) * 0.33, color: this.getHeatmapColor(this.heightMin + (this.heightMax - this.heightMin) * 0.33) },
      { value: this.heightMin + (this.heightMax - this.heightMin) * 0.66, color: this.getHeatmapColor(this.heightMin + (this.heightMax - this.heightMin) * 0.66) },
      { value: this.heightMax, color: this.getHeatmapColor(this.heightMax) },
    ];
  }

  createSunLight(): THREE.DirectionalLight {
    const bounds = this.buildingManager.getWorldBounds();
    const dist = Math.sin(this.sunElevation);
    const height = Math.cos(this.sunElevation);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    this.sunLight.position.set(
      (bounds.minX + bounds.maxX) / 2 + Math.sin(this.sunAzimuth) * 300,
      height * 300,
      (bounds.minZ + bounds.maxZ) / 2 + Math.cos(this.sunAzimuth) * 300
    );
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.left = bounds.minX - 50;
    this.sunLight.shadow.camera.right = bounds.maxX + 50;
    this.sunLight.shadow.camera.top = bounds.maxZ + 50;
    this.sunLight.shadow.camera.bottom = bounds.minZ - 50;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 800;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.radius = 4;

    return this.sunLight;
  }

  getSunLight(): THREE.DirectionalLight | null {
    return this.sunLight;
  }

  dispose(): void {
    this.removeHeatmap();
    this.removeShadows();
    this.labelGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });
  }
}
