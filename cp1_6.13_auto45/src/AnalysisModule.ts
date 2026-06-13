import * as THREE from 'three';
import { BuildingData, BuildingManager } from './BuildingManager';

export type AnalysisMode = 'none' | 'heatmap' | 'shadow';

export class AnalysisModule {
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  private currentMode: AnalysisMode = 'none';
  private shadowGroup: THREE.Group;
  private labelGroup: THREE.Group;
  private heightMin: number = 10;
  private heightMax: number = 150;
  private sunAzimuth: number = 180 * (Math.PI / 180);
  private sunElevation: number = 80 * (Math.PI / 180);
  private originalMaterials: Map<number, THREE.Material | THREE.Material[]> = new Map();

  constructor(scene: THREE.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.shadowGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.scene.add(this.shadowGroup);
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
      if (mat.map) {
        mat.map = null;
      }
      mat.emissive.copy(color).multiplyScalar(0.08);

      if (!b.groundLabel) {
        const labelGeo = new THREE.PlaneGeometry(b.width * 1.05, b.depth * 1.05);
        const labelMat = new THREE.MeshBasicMaterial({
          color: color.clone(),
          transparent: true,
          opacity: 0.35,
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
        const orig = this.originalMaterials.get(b.id);
        b.mesh.material = orig as THREE.Material | THREE.Material[];
      }
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) mat.emissive.set(0x000000);

      if (b.groundLabel) {
        b.groundLabel.visible = false;
      }
    });
    this.originalMaterials.clear();
  }

  private computeShadowProjection(b: BuildingData): THREE.BufferGeometry {
    const tanElev = Math.tan(this.sunElevation);
    const offsetY = b.height / tanElev;
    const shadowDirX = Math.sin(this.sunAzimuth) * offsetY;
    const shadowDirZ = Math.cos(this.sunAzimuth) * offsetY;

    const hw = b.width / 2;
    const hd = b.depth / 2;
    const baseY = 0.03;

    const topCorners = [
      new THREE.Vector3(b.position.x + hw, b.height, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, b.height, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, b.height, b.position.z - hd),
      new THREE.Vector3(b.position.x + hw, b.height, b.position.z - hd),
    ];

    const botCorners = [
      new THREE.Vector3(b.position.x + hw, baseY, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, baseY, b.position.z + hd),
      new THREE.Vector3(b.position.x - hw, baseY, b.position.z - hd),
      new THREE.Vector3(b.position.x + hw, baseY, b.position.z - hd),
    ];

    const projectedTop = topCorners.map(c => new THREE.Vector3(
      c.x + shadowDirX,
      baseY,
      c.z + shadowDirZ,
    ));

    const shape = new THREE.Shape();
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

    shape.moveTo(withAngle[0].p.x - cx, withAngle[0].p.z - cz);
    for (let i = 1; i < withAngle.length; i++) {
      shape.lineTo(withAngle[i].p.x - cx, withAngle[i].p.z - cz);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getY(i);
      posAttr.setXYZ(i, x + cx, baseY, z + cz);
    }
    geo.computeVertexNormals();
    return geo;
  }

  private applyShadows(): void {
    const buildings = this.buildingManager.getBuildings();
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    buildings.forEach((b) => {
      if (!b.shadowMesh) {
        try {
          const geo = this.computeShadowProjection(b);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            alphaMap: shadowTex,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geo, mat);
          b.shadowMesh = mesh;
          this.shadowGroup.add(mesh);
        } catch (e) {
          const hw = b.width / 2 + 3;
          const hd = b.depth / 2 + 3;
          const geo = new THREE.PlaneGeometry(hw * 2, hd * 2);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(b.position.x, 0.03, b.position.z);
          b.shadowMesh = mesh;
          this.shadowGroup.add(mesh);
        }
      } else {
        b.shadowMesh.visible = true;
      }
    });
  }

  private removeShadows(): void {
    const buildings = this.buildingManager.getBuildings();
    buildings.forEach((b) => {
      if (b.shadowMesh) {
        b.shadowMesh.visible = false;
      }
    });
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

  dispose(): void {
    this.removeHeatmap();
    this.removeShadows();
    this.shadowGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });
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
