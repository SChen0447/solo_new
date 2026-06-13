import * as THREE from 'three';

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
}

const DEFAULT_CONFIG: RoomConfig = {
  width: 8,
  depth: 6,
  height: 3,
};

export class Room {
  group: THREE.Group;
  config: RoomConfig;
  floor: THREE.Mesh;
  walls: THREE.Mesh[];
  ceiling: THREE.Mesh;
  gridHelper: THREE.GridHelper;

  constructor(config: RoomConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = 'room';
    this.walls = [];

    this.floor = this.createFloor();
    this.walls = this.createWalls();
    this.ceiling = this.createCeiling();
    this.gridHelper = this.createGrid();

    this.group.add(this.floor, ...this.walls, this.ceiling, this.gridHelper);
  }

  private createFloor(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(this.config.width, this.config.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8d7b68,
      roughness: 0.8,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.name = 'floor';
    return mesh;
  }

  private createWalls(): THREE.Mesh[] {
    const { width, depth, height } = this.config;
    const wallColor = 0xd4cfc4;
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const meshes: THREE.Mesh[] = [];

    const backGeo = new THREE.PlaneGeometry(width, height);
    const back = new THREE.Mesh(backGeo, wallMat.clone());
    back.position.set(0, height / 2, -depth / 2);
    back.receiveShadow = true;
    back.name = 'wall-back';
    meshes.push(back);

    const frontGeo = new THREE.PlaneGeometry(width, height);
    const front = new THREE.Mesh(frontGeo, wallMat.clone());
    front.position.set(0, height / 2, depth / 2);
    front.rotation.y = Math.PI;
    front.receiveShadow = true;
    front.name = 'wall-front';
    meshes.push(front);

    const leftGeo = new THREE.PlaneGeometry(depth, height);
    const left = new THREE.Mesh(leftGeo, wallMat.clone());
    left.position.set(-width / 2, height / 2, 0);
    left.rotation.y = Math.PI / 2;
    left.receiveShadow = true;
    left.name = 'wall-left';
    meshes.push(left);

    const rightGeo = new THREE.PlaneGeometry(depth, height);
    const right = new THREE.Mesh(rightGeo, wallMat.clone());
    right.position.set(width / 2, height / 2, 0);
    right.rotation.y = -Math.PI / 2;
    right.receiveShadow = true;
    right.name = 'wall-right';
    meshes.push(right);

    return meshes;
  }

  private createCeiling(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(this.config.width, this.config.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf0ece4,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = this.config.height;
    mesh.name = 'ceiling';
    return mesh;
  }

  private createGrid(): THREE.GridHelper {
    const gridSize = Math.max(this.config.width, this.config.depth);
    const divisions = Math.round(gridSize / 0.5);
    const grid = new THREE.GridHelper(gridSize, divisions, 0x444466, 0x2a2a40);
    grid.position.y = 0.002;
    grid.name = 'grid';
    return grid;
  }

  updateConfig(config: Partial<RoomConfig>): void {
    this.config = { ...this.config, ...config };
    this.group.remove(this.floor, ...this.walls, this.ceiling, this.gridHelper);
    this.floor.geometry.dispose();
    this.walls.forEach(w => w.geometry.dispose());
    this.ceiling.geometry.dispose();

    this.floor = this.createFloor();
    this.walls = this.createWalls();
    this.ceiling = this.createCeiling();
    this.gridHelper = this.createGrid();
    this.group.add(this.floor, ...this.walls, this.ceiling, this.gridHelper);
  }
}
