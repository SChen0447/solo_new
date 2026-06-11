import * as THREE from 'three';
import type { Building, CityConfig } from './types';
import { buildingHeightToColor, randomRange, randomInt } from './utils';

export class City {
  public buildings: Building[] = [];
  public config: CityConfig;
  public group: THREE.Group = new THREE.Group();
  public buildingMeshes: Map<string, THREE.Mesh> = new Map();
  private minHeight: number = 0;
  private maxHeight: number = 0;

  constructor(config?: Partial<CityConfig>) {
    this.config = {
      gridSize: 8,
      cellSize: 12,
      minFloors: 5,
      maxFloors: 20,
      floorHeight: 3,
      minBuildingsPerCell: 1,
      maxBuildingsPerCell: 3,
      ...config,
    };
  }

  generate(): void {
    this.buildings = [];
    this.group.clear();
    this.buildingMeshes.clear();

    const { gridSize, cellSize, minFloors, maxFloors, floorHeight, minBuildingsPerCell, maxBuildingsPerCell } =
      this.config;

    const totalSize = gridSize * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const buildingCount = randomInt(minBuildingsPerCell, maxBuildingsPerCell);

        for (let i = 0; i < buildingCount; i++) {
          const floors = randomInt(minFloors, maxFloors);
          const height = floors * floorHeight;

          const buildingWidth = randomRange(cellSize * 0.25, cellSize * 0.45);
          const buildingDepth = randomRange(cellSize * 0.25, cellSize * 0.45);

          const cellCenterX = offset + gx * cellSize;
          const cellCenterZ = offset + gz * cellSize;

          const offsetX = randomRange(-cellSize * 0.3, cellSize * 0.3);
          const offsetZ = randomRange(-cellSize * 0.3, cellSize * 0.3);

          const posX = cellCenterX + offsetX;
          const posZ = cellCenterZ + offsetZ;

          const building: Building = {
            id: `building-${gx}-${gz}-${i}`,
            gridX: gx,
            gridZ: gz,
            position: { x: posX, y: height / 2, z: posZ },
            width: buildingWidth,
            depth: buildingDepth,
            height: height,
            floors: floors,
            color: '#666666',
            frontPressure: 0,
            backPressure: 0,
            pressureDiff: 0,
          };

          this.buildings.push(building);
        }
      }
    }

    this.minHeight = Math.min(...this.buildings.map((b) => b.height));
    this.maxHeight = Math.max(...this.buildings.map((b) => b.height));

    for (const building of this.buildings) {
      building.color = buildingHeightToColor(building.height, this.minHeight, this.maxHeight);
    }

    this.createMeshes();
  }

  private createMeshes(): void {
    const groundGeometry = new THREE.PlaneGeometry(
      this.config.gridSize * this.config.cellSize * 1.5,
      this.config.gridSize * this.config.cellSize * 1.5
    );
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.group.add(ground);

    const gridHelper = new THREE.GridHelper(
      this.config.gridSize * this.config.cellSize,
      this.config.gridSize,
      0x333355,
      0x222244
    );
    gridHelper.position.y = 0.01;
    this.group.add(gridHelper);

    for (const building of this.buildings) {
      const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(building.color),
        roughness: 0.5,
        metalness: 0.3,
        transparent: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(building.position.x, building.position.y, building.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { buildingId: building.id };

      this.group.add(mesh);
      this.buildingMeshes.set(building.id, mesh);
    }
  }

  getBuildingById(id: string): Building | undefined {
    return this.buildings.find((b) => b.id === id);
  }

  getBuildings(): Building[] {
    return this.buildings;
  }

  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number; maxHeight: number } {
    const totalSize = this.config.gridSize * this.config.cellSize;
    return {
      minX: -totalSize / 2,
      maxX: totalSize / 2,
      minZ: -totalSize / 2,
      maxZ: totalSize / 2,
      maxHeight: this.maxHeight,
    };
  }

  getMinHeight(): number {
    return this.minHeight;
  }

  getMaxHeight(): number {
    return this.maxHeight;
  }

  isPointInsideBuilding(x: number, y: number, z: number): boolean {
    for (const building of this.buildings) {
      const halfW = building.width / 2;
      const halfD = building.depth / 2;

      if (
        x >= building.position.x - halfW &&
        x <= building.position.x + halfW &&
        z >= building.position.z - halfD &&
        z <= building.position.z + halfD &&
        y <= building.height
      ) {
        return true;
      }
    }
    return false;
  }

  getBuildingAtPoint(x: number, z: number): Building | null {
    for (const building of this.buildings) {
      const halfW = building.width / 2;
      const halfD = building.depth / 2;

      if (
        x >= building.position.x - halfW &&
        x <= building.position.x + halfW &&
        z >= building.position.z - halfD &&
        z <= building.position.z + halfD
      ) {
        return building;
      }
    }
    return null;
  }
}
