import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

export interface BuildingData {
  id: number;
  mesh: THREE.Mesh;
  height: number;
  width: number;
  depth: number;
  position: THREE.Vector3;
  floors: number;
  floorArea: number;
  far: number;
  color: string;
  originalColor: THREE.Color;
  originalMaterial: THREE.MeshStandardMaterial;
  highlightMesh?: THREE.LineSegments;
  groundLabel?: THREE.Mesh;
}

export interface FilterCriteria {
  minHeight: number;
  maxHeight: number;
  minFAR: number;
  maxFAR: number;
  colorFilter: 'default' | 'warm' | 'cool' | 'all';
}

const BUILDING_COLORS = {
  default: '#c0c0c0',
  warm: '#e8a87c',
  cool: '#8ecae6',
};

export class BuildingManager {
  private scene: THREE.Scene;
  private buildings: BuildingData[] = [];
  private buildingGroup: THREE.Group;
  private groundMesh!: THREE.Mesh;
  private brickTexture!: THREE.CanvasTexture;
  private glassTexture!: THREE.CanvasTexture;
  private bvhBuilt = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.brickTexture = this.createBrickTexture();
    this.glassTexture = this.createGlassTexture();
    this.createGround();
    this.generateBuildings();
  }

  private createBrickTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3d3530';
    ctx.fillRect(0, 0, 256, 256);

    const brickW = 48;
    const brickH = 20;
    const mortarSize = 3;

    for (let row = 0; row < 256 / (brickH + mortarSize); row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2 + mortarSize / 2;
      for (let col = -1; col < 256 / (brickW + mortarSize) + 1; col++) {
        const x = col * (brickW + mortarSize) + offset;
        const y = row * (brickH + mortarSize);

        const variation = (Math.random() - 0.5) * 25;
        const baseR = 90 + variation;
        const baseG = 65 + variation * 0.7;
        const baseB = 55 + variation * 0.5;

        ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
        ctx.fillRect(x + mortarSize, y + mortarSize, brickW - mortarSize, brickH - mortarSize);

        const gradient = ctx.createLinearGradient(x + mortarSize, y + mortarSize, x + brickW - mortarSize, y + brickH - mortarSize);
        gradient.addColorStop(0, 'rgba(255,255,255,0.04)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.02)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.03)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x + mortarSize, y + mortarSize, brickW - mortarSize, brickH - mortarSize);

        for (let i = 0; i < 3; i++) {
          const sx = x + mortarSize + Math.random() * (brickW - mortarSize - 4);
          const sy = y + mortarSize + Math.random() * (brickH - mortarSize - 2);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(sx, sy, 2 + Math.random() * 3, 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(60,50,40,0.6)';
    ctx.lineWidth = mortarSize;
    for (let row = 0; row <= 256; row += brickH + mortarSize) {
      ctx.beginPath();
      ctx.moveTo(0, row);
      ctx.lineTo(256, row);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    return tex;
  }

  private createGlassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a2a40';
    ctx.fillRect(0, 0, 256, 256);

    const paneW = 32;
    const paneH = 40;
    const frameSize = 3;

    for (let row = 0; row < 256 / (paneH + frameSize); row++) {
      for (let col = 0; col < 256 / (paneW + frameSize); col++) {
        const x = col * (paneW + frameSize) + frameSize;
        const y = row * (paneH + frameSize) + frameSize;

        const reflectShift = Math.random() * 0.15;
        const r = 40 + reflectShift * 80;
        const g = 60 + reflectShift * 100;
        const b = 100 + reflectShift * 120;

        const grad = ctx.createLinearGradient(x, y, x + paneW, y + paneH);
        grad.addColorStop(0, `rgba(${r + 20},${g + 30},${b + 40},0.9)`);
        grad.addColorStop(0.3, `rgba(${r + 40},${g + 50},${b + 60},0.7)`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},0.85)`);
        grad.addColorStop(1, `rgba(${r - 10},${g - 10},${b + 20},0.9)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, paneW, paneH);

        ctx.fillStyle = 'rgba(200,220,255,0.06)';
        ctx.fillRect(x, y, paneW, paneH * 0.3);

        ctx.fillStyle = 'rgba(0,10,30,0.1)';
        ctx.fillRect(x, y + paneH * 0.8, paneW, paneH * 0.2);
      }
    }

    ctx.fillStyle = '#2a3a50';
    for (let row = 0; row <= 256; row += paneH + frameSize) {
      ctx.fillRect(0, row, 256, frameSize);
    }
    for (let col = 0; col <= 256; col += paneW + frameSize) {
      ctx.fillRect(col, 0, frameSize, 256);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    return tex;
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(1100, 1100);
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 2048;
    groundCanvas.height = 2048;
    const gctx = groundCanvas.getContext('2d')!;
    gctx.fillStyle = '#1a1a2e';
    gctx.fillRect(0, 0, 2048, 2048);

    const gridStep = 2048 / 20;
    gctx.strokeStyle = 'rgba(60, 60, 100, 0.35)';
    gctx.lineWidth = 1;
    for (let i = 0; i <= 2048; i += gridStep) {
      gctx.beginPath();
      gctx.moveTo(i, 0);
      gctx.lineTo(i, 2048);
      gctx.stroke();
      gctx.beginPath();
      gctx.moveTo(0, i);
      gctx.lineTo(2048, i);
      gctx.stroke();
    }

    gctx.strokeStyle = 'rgba(80, 80, 130, 0.15)';
    gctx.lineWidth = 0.5;
    const subStep = gridStep / 5;
    for (let i = 0; i <= 2048; i += subStep) {
      gctx.beginPath();
      gctx.moveTo(i, 0);
      gctx.lineTo(i, 2048);
      gctx.stroke();
      gctx.beginPath();
      gctx.moveTo(0, i);
      gctx.lineTo(2048, i);
      gctx.stroke();
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.92,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private generateBuildings(): void {
    const gridSize = 20;
    const blockSize = 50;
    const totalBuildings = 500;
    const halfWorld = (gridSize * blockSize) / 2;

    const positions: { x: number; z: number }[] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const bx = -halfWorld + gx * blockSize + blockSize / 2;
        const bz = -halfWorld + gz * blockSize + blockSize / 2;
        positions.push({ x: bx, z: bz });
      }
    }
    while (positions.length < totalBuildings) {
      const gx = Math.floor(Math.random() * gridSize);
      const gz = Math.floor(Math.random() * gridSize);
      const bx = -halfWorld + gx * blockSize + (Math.random() - 0.5) * blockSize * 0.6;
      const bz = -halfWorld + gz * blockSize + (Math.random() - 0.5) * blockSize * 0.6;
      positions.push({ x: bx, z: bz });
    }
    positions.length = totalBuildings;

    for (let i = 0; i < totalBuildings; i++) {
      const height = 10 + Math.random() * 140;
      const width = 15 + Math.random() * 25;
      const depth = 15 + Math.random() * 25;
      const colorKeys: Array<'default' | 'warm' | 'cool'> = ['default', 'warm', 'cool'];
      const colorKey = colorKeys[Math.floor(Math.random() * 3)];
      const colorStr = BUILDING_COLORS[colorKey];
      const color = new THREE.Color(colorStr);
      const floors = Math.floor(height / 3.2);
      const floorArea = width * depth;
      const far = (floorArea * floors) / (50 * 50);

      const geometry = new THREE.BoxGeometry(width, height, depth);
      const useGlass = Math.random() > 0.5;
      let material: THREE.MeshStandardMaterial;

      if (useGlass) {
        const glassTex = this.glassTexture.clone();
        glassTex.needsUpdate = true;
        glassTex.wrapS = THREE.RepeatWrapping;
        glassTex.wrapT = THREE.RepeatWrapping;
        glassTex.repeat.set(
          Math.max(1, Math.round(width / 8)),
          Math.max(1, Math.round(height / 12))
        );

        material = new THREE.MeshStandardMaterial({
          color: color.clone().lerp(new THREE.Color('#4488bb'), 0.3),
          map: glassTex,
          metalness: 0.75,
          roughness: 0.15,
          transparent: true,
          opacity: 0.9,
          envMapIntensity: 1.2,
        });
      } else {
        const brickTex = this.brickTexture.clone();
        brickTex.needsUpdate = true;
        brickTex.wrapS = THREE.RepeatWrapping;
        brickTex.wrapT = THREE.RepeatWrapping;
        brickTex.repeat.set(
          Math.max(1, Math.round(width / 6)),
          Math.max(1, Math.round(height / 4))
        );

        material = new THREE.MeshStandardMaterial({
          color: color.clone().lerp(new THREE.Color('#8b7355'), 0.2),
          map: brickTex,
          roughness: 0.85,
          metalness: 0.05,
          bumpScale: 0.02,
        });

        const bumpCanvas = document.createElement('canvas');
        bumpCanvas.width = 128;
        bumpCanvas.height = 128;
        const bctx = bumpCanvas.getContext('2d')!;
        bctx.fillStyle = '#808080';
        bctx.fillRect(0, 0, 128, 128);
        for (let by = 0; by < 128; by += 10) {
          const bOffset = (by / 10) % 2 === 0 ? 0 : 16;
          for (let bx = -bOffset; bx < 128; bx += 32) {
            bctx.fillStyle = '#a0a0a0';
            bctx.fillRect(bx + 1, by + 1, 30, 8);
          }
        }
        const bumpTex = new THREE.CanvasTexture(bumpCanvas);
        bumpTex.wrapS = THREE.RepeatWrapping;
        bumpTex.wrapT = THREE.RepeatWrapping;
        bumpTex.repeat.set(
          Math.max(1, Math.round(width / 6)),
          Math.max(1, Math.round(height / 4))
        );
        material.bumpMap = bumpTex;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(positions[i].x, height / 2, positions[i].z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.buildingId = i;

      const data: BuildingData = {
        id: i,
        mesh,
        height,
        width,
        depth,
        position: mesh.position.clone(),
        floors,
        floorArea: parseFloat(floorArea.toFixed(1)),
        far: parseFloat(far.toFixed(2)),
        color: colorKey,
        originalColor: color.clone(),
        originalMaterial: material,
      };

      this.buildings.push(data);
      this.buildingGroup.add(mesh);
    }

    this.buildBVH();
  }

  buildBVH(): void {
    if (this.bvhBuilt) return;
    this.buildingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        try {
          const bvh = new MeshBVH(child.geometry as THREE.BufferGeometry);
          (child as any).boundsTree = bvh;
        } catch (e) {
          // skip if geometry incompatible
        }
      }
    });
    this.bvhBuilt = true;
  }

  getBuildings(): BuildingData[] {
    return this.buildings;
  }

  getBuildingById(id: number): BuildingData | undefined {
    return this.buildings[id];
  }

  getBuildingGroup(): THREE.Group {
    return this.buildingGroup;
  }

  getWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const halfWorld = (20 * 50) / 2;
    return {
      minX: -halfWorld - 30,
      maxX: halfWorld + 30,
      minZ: -halfWorld - 30,
      maxZ: halfWorld + 30,
    };
  }

  filterBuildings(criteria: FilterCriteria): void {
    this.buildings.forEach((b) => {
      const heightOk = b.height >= criteria.minHeight && b.height <= criteria.maxHeight;
      const farOk = b.far >= criteria.minFAR && b.far <= criteria.maxFAR;
      const colorOk = criteria.colorFilter === 'all' || b.color === criteria.colorFilter;
      const visible = heightOk && farOk && colorOk;

      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      const targetOpacity = visible ? (mat.metalness > 0.5 ? 0.9 : 1) : 0;
      const startOpacity = mat.opacity;
      const startTime = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / 200, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        mat.opacity = startOpacity + (targetOpacity - startOpacity) * eased;
        mat.transparent = true;
        b.mesh.visible = mat.opacity > 0.01;
        if (b.highlightMesh) b.highlightMesh.visible = b.mesh.visible;
        if (b.groundLabel) b.groundLabel.visible = b.mesh.visible;
        if (t < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }

  getHeightRange(): { min: number; max: number } {
    let min = Infinity, max = -Infinity;
    this.buildings.forEach(b => { min = Math.min(min, b.height); max = Math.max(max, b.height); });
    return { min, max };
  }

  getFARRange(): { min: number; max: number } {
    let min = Infinity, max = -Infinity;
    this.buildings.forEach(b => { min = Math.min(min, b.far); max = Math.max(max, b.far); });
    return { min, max };
  }

  dispose(): void {
    this.buildings.forEach(b => {
      b.mesh.geometry.dispose();
      if (Array.isArray(b.mesh.material)) {
        b.mesh.material.forEach(m => m.dispose());
      } else {
        b.mesh.material.dispose();
      }
      if (b.highlightMesh) {
        b.highlightMesh.geometry.dispose();
        if (Array.isArray(b.highlightMesh.material)) {
          b.highlightMesh.material.forEach(m => m.dispose());
        } else {
          b.highlightMesh.material.dispose();
        }
      }
      if (b.groundLabel) {
        b.groundLabel.geometry.dispose();
        if (Array.isArray(b.groundLabel.material)) {
          b.groundLabel.material.forEach(m => m.dispose());
        } else {
          b.groundLabel.material.dispose();
        }
      }
    });
  }
}
