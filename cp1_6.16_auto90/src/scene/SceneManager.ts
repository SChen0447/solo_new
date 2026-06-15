import * as THREE from 'three';
import { eventBus, Events } from '../core/EventBus';
import {
  RoomSize,
  MaterialPreset,
  MATERIAL_PRESETS,
  FurnitureItem,
  LightState,
} from '../core/Types';
import { generateId, damp, dampVector3, clamp } from '../utils/MathUtils';

export class SceneManager {
  public scene: THREE.Scene;
  public roomSize: RoomSize = { width: 8, depth: 5, height: 3 };
  
  private walls: THREE.Mesh[] = [];
  private floor!: THREE.Mesh;
  private ceiling!: THREE.Mesh;
  private furniture: FurnitureItem[] = [];
  
  private wallMaterials: THREE.MeshStandardMaterial[] = [];
  private floorMaterial!: THREE.MeshStandardMaterial;
  private ceilingMaterial!: THREE.MeshStandardMaterial;
  
  private materialTransitions: Map<THREE.MeshStandardMaterial, {
    targetColor: number;
    startColor: number;
    progress: number;
    targetRoughness: number;
    startRoughness: number;
    targetMetalness: number;
    startMetalness: number;
  }> = new Map();
  
  private readonly TRANSITION_DURATION = 0.3;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.createRoom();
    this.createFurniture();
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    eventBus.on<RoomSize>(Events.ROOM_SIZE_CHANGED, (size) => this.updateRoomSize(size));
    eventBus.on<{ surface: 'walls' | 'floor' | 'ceiling'; material: MaterialPreset }>(
      Events.ROOM_MATERIAL_CHANGED,
      (data) => this.updateMaterial(data.surface, data.material)
    );
  }
  
  private createRoom(): void {
    const { width, depth, height } = this.roomSize;
    
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    
    const backWall = new THREE.Mesh(wallGeo, this.createWallMaterial());
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.scale.set(width, height, 0.1);
    backWall.receiveShadow = true;
    
    const leftWall = new THREE.Mesh(wallGeo, this.createWallMaterial());
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.scale.set(0.1, height, depth);
    leftWall.receiveShadow = true;
    
    const rightWall = new THREE.Mesh(wallGeo, this.createWallMaterial());
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.scale.set(0.1, height, depth);
    rightWall.receiveShadow = true;
    
    this.walls = [backWall, leftWall, rightWall];
    this.walls.forEach(wall => this.scene.add(wall));
    
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    this.floorMaterial = this.createFloorMaterial();
    this.floor = new THREE.Mesh(floorGeo, this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    
    const ceilingGeo = new THREE.PlaneGeometry(width, depth);
    this.ceilingMaterial = this.createCeilingMaterial();
    this.ceiling = new THREE.Mesh(ceilingGeo, this.ceilingMaterial);
    this.ceiling.rotation.x = Math.PI / 2;
    this.ceiling.position.y = height;
    this.ceiling.receiveShadow = true;
    this.scene.add(this.ceiling);
  }
  
  private createWallMaterial(): THREE.MeshStandardMaterial {
    const config = MATERIAL_PRESETS.white_latex;
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
      side: THREE.DoubleSide,
    });
    this.wallMaterials.push(material);
    return material;
  }
  
  private createFloorMaterial(): THREE.MeshStandardMaterial {
    const config = MATERIAL_PRESETS.wood_grain;
    return new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
    });
  }
  
  private createCeilingMaterial(): THREE.MeshStandardMaterial {
    const config = MATERIAL_PRESETS.white_latex;
    return new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
    });
  }
  
  private createFurniture(): void {
    const table = this.createTable();
    table.position.set(0, 0, -1);
    this.scene.add(table);
    this.furniture.push({
      id: generateId(),
      name: '桌子',
      mesh: table,
      position: new THREE.Vector2(0, -1),
    });
    
    const chair1 = this.createChair();
    chair1.position.set(-1.2, 0, -0.5);
    this.scene.add(chair1);
    this.furniture.push({
      id: generateId(),
      name: '椅子1',
      mesh: chair1,
      position: new THREE.Vector2(-1.2, -0.5),
    });
    
    const chair2 = this.createChair();
    chair2.position.set(1.2, 0, -0.5);
    this.scene.add(chair2);
    this.furniture.push({
      id: generateId(),
      name: '椅子2',
      mesh: chair2,
      position: new THREE.Vector2(1.2, -0.5),
    });
    
    const bookshelf = this.createBookshelf();
    bookshelf.position.set(-3.5, 0, 1.5);
    this.scene.add(bookshelf);
    this.furniture.push({
      id: generateId(),
      name: '书柜',
      mesh: bookshelf,
      position: new THREE.Vector2(-3.5, 1.5),
    });
  }
  
  private createTable(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Table';
    
    const topGeo = new THREE.BoxGeometry(2, 0.08, 1);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
    
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.7 });
    
    const legPositions = [
      [-0.9, 0.375, -0.4],
      [0.9, 0.375, -0.4],
      [-0.9, 0.375, 0.4],
      [0.9, 0.375, 0.4],
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });
    
    return group;
  }
  
  private createChair(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Chair';
    
    const seatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.5);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);
    
    const backGeo = new THREE.BoxGeometry(0.5, 0.4, 0.05);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, 0.7, -0.225);
    back.castShadow = true;
    group.add(back);
    
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
    
    const legPositions = [
      [-0.2, 0.225, -0.2],
      [0.2, 0.225, -0.2],
      [-0.2, 0.225, 0.2],
      [0.2, 0.225, 0.2],
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });
    
    return group;
  }
  
  private createBookshelf(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Bookshelf';
    
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.6 });
    const sideGeo = new THREE.BoxGeometry(0.05, 1.8, 0.4);
    const shelfGeo = new THREE.BoxGeometry(0.8, 0.03, 0.38);
    
    const leftSide = new THREE.Mesh(sideGeo, shelfMat);
    leftSide.position.set(-0.4, 0.9, 0);
    leftSide.castShadow = true;
    group.add(leftSide);
    
    const rightSide = new THREE.Mesh(sideGeo, shelfMat);
    rightSide.position.set(0.4, 0.9, 0);
    rightSide.castShadow = true;
    group.add(rightSide);
    
    for (let i = 0; i < 5; i++) {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, 0.1 + i * 0.4, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }
    
    const bookColors = [0x8b0000, 0x006400, 0x00008b, 0x8b8b00, 0x4b0082, 0x8b4513];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const bookGeo = new THREE.BoxGeometry(0.08, 0.25, 0.2);
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookColors[Math.floor(Math.random() * bookColors.length)],
          roughness: 0.8,
        });
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(-0.25 + col * 0.12, 0.3 + row * 0.4, 0.05);
        book.castShadow = true;
        group.add(book);
      }
    }
    
    return group;
  }
  
  private updateRoomSize(size: RoomSize): void {
    const startTime = performance.now();
    
    this.roomSize = { ...size };
    const { width, depth, height } = size;
    
    const backWall = this.walls[0];
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.scale.set(width, height, 0.1);
    
    const leftWall = this.walls[1];
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.scale.set(0.1, height, depth);
    
    const rightWall = this.walls[2];
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.scale.set(0.1, height, depth);
    
    this.floor.geometry.dispose();
    this.floor.geometry = new THREE.PlaneGeometry(width, depth);
    
    this.ceiling.geometry.dispose();
    this.ceiling.geometry = new THREE.PlaneGeometry(width, depth);
    this.ceiling.position.y = height;
    
    const endTime = performance.now();
    const meshUpdateTime = endTime - startTime;
    
    eventBus.emit(Events.SCENE_UPDATED, { meshUpdateTime });
    eventBus.emit(Events.RENDER);
  }
  
  private updateMaterial(surface: 'walls' | 'floor' | 'ceiling', preset: MaterialPreset): void {
    const config = MATERIAL_PRESETS[preset];
    let materials: THREE.MeshStandardMaterial[] = [];
    
    if (surface === 'walls') {
      materials = this.wallMaterials;
    } else if (surface === 'floor') {
      materials = [this.floorMaterial];
    } else if (surface === 'ceiling') {
      materials = [this.ceilingMaterial];
    }
    
    materials.forEach(material => {
      const currentColor = material.color.getHex();
      this.materialTransitions.set(material, {
        startColor: currentColor,
        targetColor: config.color,
        progress: 0,
        startRoughness: material.roughness,
        targetRoughness: config.roughness,
        startMetalness: material.metalness,
        targetMetalness: config.metalness,
      });
    });
    
    eventBus.emit(Events.RENDER);
  }
  
  public moveFurniture(itemId: string, position: THREE.Vector2): void {
    const item = this.furniture.find(f => f.id === itemId);
    if (!item) return;
    
    const halfWidth = this.roomSize.width / 2 - 0.5;
    const halfDepth = this.roomSize.depth / 2 - 0.5;
    
    position.x = clamp(position.x, -halfWidth, halfWidth);
    position.y = clamp(position.y, -halfDepth, halfDepth);
    
    item.mesh.position.x = position.x;
    item.mesh.position.z = position.y;
    item.position.copy(position);
    
    eventBus.emit(Events.FURNITURE_MOVED, { id: itemId, position });
    eventBus.emit(Events.RENDER);
  }
  
  public getFurnitureAtPosition(x: number, z: number): FurnitureItem | null {
    for (const item of this.furniture) {
      const box = new THREE.Box3().setFromObject(item.mesh);
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
        return item;
      }
    }
    return null;
  }
  
  public update(dt: number, lights: LightState[]): void {
    this.updateMaterialTransitions(dt);
    this.updateLightHelpers(lights, dt);
  }
  
  private updateMaterialTransitions(dt: number): void {
    const completed: THREE.MeshStandardMaterial[] = [];
    
    this.materialTransitions.forEach((transition, material) => {
      transition.progress += dt / this.TRANSITION_DURATION;
      
      if (transition.progress >= 1) {
        transition.progress = 1;
        completed.push(material);
      }
      
      const t = transition.progress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const color = new THREE.Color(transition.startColor);
      color.lerp(new THREE.Color(transition.targetColor), easeT);
      material.color.copy(color);
      
      material.roughness = damp(
        transition.startRoughness,
        transition.targetRoughness,
        10,
        dt
      );
      
      material.metalness = damp(
        transition.startMetalness,
        transition.targetMetalness,
        10,
        dt
      );
    });
    
    completed.forEach(material => this.materialTransitions.delete(material));
    
    if (this.materialTransitions.size > 0) {
      eventBus.emit(Events.RENDER);
    }
  }
  
  private updateLightHelpers(lights: LightState[], dt: number): void {
    lights.forEach(lightState => {
      if (lightState.helperObject && lightState.targetPosition) {
        const smoothedPos = dampVector3(
          lightState.helperObject.position,
          lightState.targetPosition,
          10,
          dt
        );
        lightState.helperObject.position.copy(smoothedPos);
        
        if (lightState.lightObject) {
          lightState.lightObject.position.copy(smoothedPos);
        }
      }
      
      if (lightState.lightObject) {
        const currentIntensity = lightState.lightObject.intensity;
        const targetIntensity = lightState.targetIntensity;
        lightState.lightObject.intensity = damp(currentIntensity, targetIntensity, 8, dt);
      }
    });
  }
  
  public getFurniture(): FurnitureItem[] {
    return this.furniture;
  }
  
  public getFloorWorldPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 0.01, 0);
  }
  
  public dispose(): void {
    this.walls.forEach(wall => {
      wall.geometry.dispose();
      (wall.material as THREE.Material).dispose();
    });
    
    this.floor.geometry.dispose();
    this.floorMaterial.dispose();
    
    this.ceiling.geometry.dispose();
    this.ceilingMaterial.dispose();
    
    this.furniture.forEach(item => {
      item.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });
    
    eventBus.off(Events.ROOM_SIZE_CHANGED, () => {});
    eventBus.off(Events.ROOM_MATERIAL_CHANGED, () => {});
  }
}
