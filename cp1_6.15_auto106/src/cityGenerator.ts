import * as THREE from 'three';

export interface CityParams {
  density: number;
  heightDistribution: number;
  colorTheme: string;
}

export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  modern: {
    name: '现代灰白',
    primary: '#e0e0e0',
    secondary: '#9e9e9e',
    accent: '#616161'
  },
  sunset: {
    name: '暖色落日',
    primary: '#f4a261',
    secondary: '#e76f51',
    accent: '#2a9d8f'
  },
  cyberpunk: {
    name: '赛博朋克',
    primary: '#ff006e',
    secondary: '#00bbf9',
    accent: '#8338ec'
  },
  minimal: {
    name: '极简黑白',
    primary: '#ffffff',
    secondary: '#000000',
    accent: '#333333'
  }
};

interface BuildingData {
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  theme: ColorTheme;
  isHighRise: boolean;
  roofType: 'antenna' | 'dome' | 'none';
  windows: boolean[][];
}

export class CityGenerator {
  private scene: THREE.Scene;
  private buildingMesh?: THREE.InstancedMesh;
  private antennaMesh?: THREE.InstancedMesh;
  private domeMesh?: THREE.InstancedMesh;
  private windowMesh?: THREE.InstancedMesh;
  private ground!: THREE.Mesh;
  private grid!: THREE.GridHelper;
  private buildings: BuildingData[] = [];
  private dummy: THREE.Object3D;
  private isNight: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.createGround();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(100, 50, 0x3a3a4a, 0x3a3a4a);
    this.grid.position.y = 0.01;
    const gridMaterial = this.grid.material as THREE.Material;
    gridMaterial.opacity = 0.3;
    gridMaterial.transparent = true;
    this.scene.add(this.grid);
  }

  private createBrickTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, 64, 64);
    
    ctx.fillStyle = '#6b5344';
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 === 0 ? 0 : 8;
      for (let col = 0; col < 4; col++) {
        const x = col * 16 + offset;
        const y = row * 8;
        ctx.fillRect(x, y, 14, 6);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createGlassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(0.5, '#b0e0e6');
    gradient.addColorStop(1, '#4682b4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(10, 10, 50, 30);
    ctx.fillRect(70, 50, 40, 20);
    
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private generateWindows(floors: number, width: number, _depth: number): boolean[][] {
    const windowsPerFloor = Math.max(2, Math.floor(width / 2));
    const windows: boolean[][] = [];
    
    for (let f = 0; f < floors; f++) {
      const floorWindows: boolean[] = [];
      for (let w = 0; w < windowsPerFloor * 2; w++) {
        floorWindows.push(Math.random() > 0.3);
      }
      windows.push(floorWindows);
    }
    
    return windows;
  }

  private generateBuildingData(params: CityParams): BuildingData[] {
    const buildings: BuildingData[] = [];
    const theme = COLOR_THEMES[params.colorTheme] || COLOR_THEMES.modern;
    const gridSize = Math.ceil(Math.sqrt(params.density));
    const spacing = 80 / gridSize;
    
    const positions: THREE.Vector2[] = [];
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        positions.push(new THREE.Vector2(
          (x - gridSize / 2 + 0.5) * spacing + (Math.random() - 0.5) * spacing * 0.3,
          (z - gridSize / 2 + 0.5) * spacing + (Math.random() - 0.5) * spacing * 0.3
        ));
      }
    }
    
    const shuffled = positions.sort(() => Math.random() - 0.5).slice(0, params.density);
    
    for (let i = 0; i < params.density; i++) {
      const pos = shuffled[i];
      const isHighRise = Math.random() < params.heightDistribution / 10;
      
      const width = spacing * (0.5 + Math.random() * 0.4);
      const depth = spacing * (0.5 + Math.random() * 0.4);
      
      let height: number;
      if (isHighRise) {
        height = 15 + Math.random() * 25;
      } else {
        height = 3 + Math.random() * 10;
      }
      
      const roofRoll = Math.random();
      let roofType: 'antenna' | 'dome' | 'none';
      if (roofRoll < 0.3) roofType = 'antenna';
      else if (roofRoll < 0.5) roofType = 'dome';
      else roofType = 'none';
      
      const floors = Math.max(1, Math.floor(height / 1.5));
      const windows = this.generateWindows(floors, width, depth);
      
      buildings.push({
        position: new THREE.Vector3(pos.x, height / 2, pos.y),
        width,
        depth,
        height,
        theme,
        isHighRise,
        roofType,
        windows
      });
    }
    
    return buildings;
  }

  public generate(params: CityParams): number {
    const startTime = performance.now();
    
    this.clearBuildings();
    this.buildings = this.generateBuildingData(params);
    
    if (this.buildings.length === 0) return 0;
    
    const brickTexture = this.createBrickTexture();
    const glassTexture = this.createGlassTexture();
    
    const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    const buildingMaterials: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const colorChoice = Math.random();
      let color: string;
      if (colorChoice < 0.6) color = b.theme.primary;
      else if (colorChoice < 0.9) color = b.theme.secondary;
      else color = b.theme.accent;
      
      const map = b.isHighRise ? glassTexture.clone() : brickTexture.clone();
      map.repeat.set(Math.ceil(b.width), Math.ceil(b.height));
      
      buildingMaterials.push(new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        map,
        roughness: b.isHighRise ? 0.1 : 0.8,
        metalness: b.isHighRise ? 0.9 : 0.1
      }));
    }
    
    this.buildingMesh = new THREE.InstancedMesh(
      buildingGeometry,
      buildingMaterials,
      this.buildings.length
    );
    
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      this.dummy.position.copy(b.position);
      this.dummy.scale.set(b.width, b.height, b.depth);
      this.dummy.updateMatrix();
      this.buildingMesh.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.buildingMesh.castShadow = true;
    this.buildingMesh.receiveShadow = true;
    this.scene.add(this.buildingMesh);
    
    const antennaBuildings = this.buildings.filter(b => b.roofType === 'antenna');
    const domeBuildings = this.buildings.filter(b => b.roofType === 'dome');
    
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.5
    });
    
    if (antennaBuildings.length > 0) {
      const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
      
      this.antennaMesh = new THREE.InstancedMesh(
        antennaGeometry,
        roofMaterial,
        antennaBuildings.length
      );
      
      let antennaIndex = 0;
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.roofType !== 'antenna') continue;
        
        this.dummy.position.set(
          b.position.x,
          b.height + 1.5,
          b.position.z
        );
        this.dummy.rotation.y = Math.random() * Math.PI;
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.antennaMesh.setMatrixAt(antennaIndex, this.dummy.matrix);
        antennaIndex++;
      }
      
      this.antennaMesh.count = antennaIndex;
      this.antennaMesh.castShadow = true;
      this.scene.add(this.antennaMesh);
    }
    
    if (domeBuildings.length > 0) {
      const domeGeometry = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      
      this.domeMesh = new THREE.InstancedMesh(
        domeGeometry,
        roofMaterial,
        domeBuildings.length
      );
      
      let domeIndex = 0;
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.roofType !== 'dome') continue;
        
        const domeSize = Math.min(b.width, b.depth) * 0.3;
        this.dummy.position.set(
          b.position.x,
          b.height,
          b.position.z
        );
        this.dummy.scale.set(domeSize, domeSize, domeSize);
        this.dummy.updateMatrix();
        this.domeMesh.setMatrixAt(domeIndex, this.dummy.matrix);
        domeIndex++;
      }
      
      this.domeMesh.count = domeIndex;
      this.domeMesh.castShadow = true;
      this.scene.add(this.domeMesh);
    }
    
    this.createWindows();
    
    const generateTime = performance.now() - startTime;
    console.log(`City generated in ${generateTime.toFixed(2)}ms`);
    
    return generateTime;
  }

  private createWindows(): void {
    if (this.windowMesh) {
      this.scene.remove(this.windowMesh);
      this.windowMesh.dispose();
    }
    
    let windowCount = 0;
    for (const b of this.buildings) {
      for (const floor of b.windows) {
        windowCount += floor.filter(w => w).length;
      }
    }
    
    if (windowCount === 0) return;
    
    const windowGeometry = new THREE.PlaneGeometry(0.3, 0.4);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.windowMesh = new THREE.InstancedMesh(
      windowGeometry,
      windowMaterial,
      windowCount * 4
    );
    
    let windowIndex = 0;
    
    for (const b of this.buildings) {
      const windowsPerFloor = b.windows[0]?.length / 2 || 0;
      const floorHeight = b.height / b.windows.length;
      
      for (let floorIdx = 0; floorIdx < b.windows.length; floorIdx++) {
        const floor = b.windows[floorIdx];
        const y = b.position.y - b.height / 2 + floorHeight * (floorIdx + 0.5);
        
        for (let winIdx = 0; winIdx < floor.length; winIdx++) {
          if (!floor[winIdx]) continue;
          
          const side = Math.floor(winIdx / windowsPerFloor);
          const posOnSide = (winIdx % windowsPerFloor) / windowsPerFloor - 0.5;
          
          if (side === 0) {
            this.dummy.position.set(
              b.position.x + posOnSide * b.width,
              y,
              b.position.z + b.depth / 2 + 0.01
            );
            this.dummy.rotation.y = 0;
          } else if (side === 1) {
            this.dummy.position.set(
              b.position.x + posOnSide * b.width,
              y,
              b.position.z - b.depth / 2 - 0.01
            );
            this.dummy.rotation.y = Math.PI;
          } else if (side === 2) {
            this.dummy.position.set(
              b.position.x + b.width / 2 + 0.01,
              y,
              b.position.z + posOnSide * b.depth
            );
            this.dummy.rotation.y = Math.PI / 2;
          } else {
            this.dummy.position.set(
              b.position.x - b.width / 2 - 0.01,
              y,
              b.position.z + posOnSide * b.depth
            );
            this.dummy.rotation.y = -Math.PI / 2;
          }
          
          this.dummy.scale.set(1, 1, 1);
          this.dummy.updateMatrix();
          this.windowMesh.setMatrixAt(windowIndex, this.dummy.matrix);
          windowIndex++;
        }
      }
    }
    
    this.windowMesh.count = windowIndex;
    this.scene.add(this.windowMesh);
  }

  public setNightMode(isNight: boolean): void {
    this.isNight = isNight;
    
    if (this.windowMesh) {
      const material = this.windowMesh.material as THREE.MeshBasicMaterial;
      
      if (isNight) {
        material.color.setHex(0xffd700);
        material.opacity = 0.9;
      } else {
        material.color.setHex(0x1a1a2e);
        material.opacity = 0.8;
      }
      
      material.needsUpdate = true;
    }
  }

  public randomizeWindows(): void {
    if (!this.isNight || !this.windowMesh) return;
    
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const lightRatio = 0.6 + Math.random() * 0.3;
      
      for (let floorIdx = 0; floorIdx < b.windows.length; floorIdx++) {
        for (let winIdx = 0; winIdx < b.windows[floorIdx].length; winIdx++) {
          if (b.windows[floorIdx][winIdx]) {
            b.windows[floorIdx][winIdx] = Math.random() < lightRatio;
          }
        }
      }
    }
    
    this.createWindows();
    this.setNightMode(true);
  }

  private clearBuildings(): void {
    if (this.buildingMesh) {
      this.scene.remove(this.buildingMesh);
      this.buildingMesh.geometry.dispose();
      if (Array.isArray(this.buildingMesh.material)) {
        this.buildingMesh.material.forEach(m => m.dispose());
      } else {
        this.buildingMesh.material.dispose();
      }
      this.buildingMesh = undefined;
    }
    
    if (this.antennaMesh) {
      this.scene.remove(this.antennaMesh);
      this.antennaMesh.geometry.dispose();
      (this.antennaMesh.material as THREE.Material).dispose();
      this.antennaMesh = undefined;
    }
    
    if (this.domeMesh) {
      this.scene.remove(this.domeMesh);
      this.domeMesh.geometry.dispose();
      (this.domeMesh.material as THREE.Material).dispose();
      this.domeMesh = undefined;
    }
    
    if (this.windowMesh) {
      this.scene.remove(this.windowMesh);
      this.windowMesh.geometry.dispose();
      (this.windowMesh.material as THREE.Material).dispose();
      this.windowMesh = undefined;
    }
    
    this.buildings = [];
  }

  public dispose(): void {
    this.clearBuildings();
    this.scene.remove(this.ground);
    this.scene.remove(this.grid);
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
  }
}
