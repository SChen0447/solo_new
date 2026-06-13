import * as THREE from 'three';

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
  highlightMesh?: THREE.Mesh;
  shadowMesh?: THREE.Mesh;
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
  private brickCanvas: HTMLCanvasElement;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.brickCanvas = this.createBrickTexture();
    this.createGround();
    this.generateBuildings();
  }

  private createBrickTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#3a3a4a';
    const brickH = 16;
    const brickW = 32;
    for (let y = 0; y < 128; y += brickH) {
      const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let x = -offset; x < 128; x += brickW) {
        ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
      }
    }
    return canvas;
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(1050, 1050);
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 1024;
    groundCanvas.height = 1024;
    const gctx = groundCanvas.getContext('2d')!;
    gctx.fillStyle = '#1f1f33';
    gctx.fillRect(0, 0, 1024, 1024);
    gctx.strokeStyle = '#2e2e48';
    gctx.lineWidth = 2;
    const gridSize = 1024 / 20;
    for (let i = 0; i <= 1024; i += gridSize) {
      gctx.beginPath();
      gctx.moveTo(i, 0);
      gctx.lineTo(i, 1024);
      gctx.stroke();
      gctx.beginPath();
      gctx.moveTo(0, i);
      gctx.lineTo(1024, i);
      gctx.stroke();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.85,
      roughness: 0.9,
      metalness: 0.1,
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
        material = new THREE.MeshStandardMaterial({
          color: color.clone().multiplyScalar(1.1),
          metalness: 0.7,
          roughness: 0.2,
          transparent: true,
          opacity: 0.88,
        });
        const glassCanvas = document.createElement('canvas');
        glassCanvas.width = 64;
        glassCanvas.height = 64;
        const gctx = glassCanvas.getContext('2d')!;
        gctx.fillStyle = 'rgba(255,255,255,0.03)';
        gctx.fillRect(0, 0, 64, 64);
        gctx.strokeStyle = 'rgba(255,255,255,0.12)';
        gctx.lineWidth = 1;
        for (let l = 0; l <= 64; l += 8) {
          gctx.beginPath();
          gctx.moveTo(l, 0);
          gctx.lineTo(l, 64);
          gctx.stroke();
          gctx.beginPath();
          gctx.moveTo(0, l);
          gctx.lineTo(64, l);
          gctx.stroke();
        }
        material.map = new THREE.CanvasTexture(glassCanvas);
      } else {
        const tex = new THREE.CanvasTexture(this.brickCanvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(width / 10, height / 10);
        material = new THREE.MeshStandardMaterial({
          color: color.clone(),
          map: tex,
          roughness: 0.85,
          metalness: 0.05,
        });
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
      };

      this.buildings.push(data);
      this.buildingGroup.add(mesh);
    }
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

  filterBuildings(criteria: FilterCriteria): void {
    this.buildings.forEach((b) => {
      const heightOk = b.height >= criteria.minHeight && b.height <= criteria.maxHeight;
      const farOk = b.far >= criteria.minFAR && b.far <= criteria.maxFAR;
      const colorOk = criteria.colorFilter === 'all' || b.color === criteria.colorFilter;
      const visible = heightOk && farOk && colorOk;

      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      const wasTransparent = mat.transparent;
      const targetOpacity = visible ? (wasTransparent ? 0.88 : 1) : 0;

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
        if (b.shadowMesh) b.shadowMesh.visible = b.mesh.visible && mat.opacity > 0.5;
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
    });
  }
}
