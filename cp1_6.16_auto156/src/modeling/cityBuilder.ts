import * as THREE from 'three';
import { SceneManager } from '../core/scene';
import {
  SurfaceType,
  SURFACE_MATERIALS,
  GRID_SIZE,
  CELL_SIZE,
  PLOT_SIZE,
  Building,
  GridCell,
  CityConfig,
} from '../utils/types';

export class CityBuilder {
  private sceneManager: SceneManager;
  private grid: GridCell[][] = [];
  private buildings: Building[] = [];
  private cityGroup: THREE.Group = new THREE.Group();
  private heatmapPlane: THREE.Mesh | null = null;
  private gridLines: THREE.Group | null = null;
  private config: CityConfig = {
    buildingCount: 6,
    roadWidth: 10,
    roadMaterial: 'asphalt',
    grassRatio: 50,
  };

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.sceneManager.scene.add(this.cityGroup);
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = {
          row: r,
          col: c,
          surfaceType: SurfaceType.Grass,
          temperature: 0,
          buildingId: null,
          isWaterBody: false,
          effectiveAbsorption: SURFACE_MATERIALS[SurfaceType.Grass].absorptionRate,
          effectiveHeatCapacity: SURFACE_MATERIALS[SurfaceType.Grass].heatCapacity,
        };
      }
    }
  }

  getConfig(): CityConfig {
    return { ...this.config };
  }

  updateConfig(cfg: Partial<CityConfig>): void {
    this.config = { ...this.config, ...cfg };
  }

  getGrid(): GridCell[][] {
    return this.grid;
  }

  getBuildings(): Building[] {
    return this.buildings;
  }

  generateCity(): void {
    this.clearCity();
    this.initGrid();
    this.generateBuildings();
    this.generateRoads();
    this.fillRemaining();
    this.buildGeometry();
  }

  private clearCity(): void {
    while (this.cityGroup.children.length > 0) {
      const child = this.cityGroup.children[0];
      this.cityGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.buildings = [];
    this.heatmapPlane = null;
    this.gridLines = null;
  }

  private generateBuildings(): void {
    const count = this.config.buildingCount;
    const occupied = new Set<string>();

    for (let i = 0; i < count; i++) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 200) {
        attempts++;
        const wCells = Math.floor(Math.random() * 3) + 1;
        const dCells = Math.floor(Math.random() * 3) + 1;
        const row = Math.floor(Math.random() * (GRID_SIZE - dCells - 2)) + 1;
        const col = Math.floor(Math.random() * (GRID_SIZE - wCells - 2)) + 1;

        let canPlace = true;
        for (let r = row - 1; r <= row + dCells; r++) {
          for (let c = col - 1; c <= col + wCells; c++) {
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
              canPlace = false;
              break;
            }
            if (occupied.has(`${r},${c}`)) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (canPlace) {
          const height = Math.floor(Math.random() * 11) + 1;
          const realHeight = height * 5 + 5;
          const id = `bld_${i}`;
          const building: Building = {
            id,
            gridRow: row,
            gridCol: col,
            widthCells: wCells,
            depthCells: dCells,
            height: Math.min(realHeight, 60),
            hasGreenRoof: false,
            meshId: `mesh_${id}`,
          };

          for (let r = row; r < row + dCells; r++) {
            for (let c = col; c < col + wCells; c++) {
              this.grid[r][c].surfaceType = SurfaceType.BuildingRoof;
              this.grid[r][c].buildingId = id;
              this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.BuildingRoof].absorptionRate;
              this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.BuildingRoof].heatCapacity;
              occupied.add(`${r},${c}`);
            }
          }

          for (let r = row - 1; r <= row + dCells; r++) {
            for (let c = col - 1; c <= col + wCells; c++) {
              if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                occupied.add(`${r},${c}`);
              }
            }
          }

          this.buildings.push(building);
          placed = true;
        }
      }
    }
  }

  private generateRoads(): void {
    const roadType = this.config.roadMaterial === 'asphalt' ? SurfaceType.Asphalt : SurfaceType.Concrete;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].surfaceType !== SurfaceType.Grass) continue;
        const nearBuilding = this.isAdjacentToBuilding(r, c);
        if (nearBuilding) {
          this.grid[r][c].surfaceType = roadType;
          this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
          this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
        }
      }
    }

    const mid = Math.floor(GRID_SIZE / 2);
    for (let c = 0; c < GRID_SIZE; c++) {
      if (this.grid[mid][c].surfaceType === SurfaceType.Grass) {
        this.grid[mid][c].surfaceType = roadType;
        this.grid[mid][c].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
        this.grid[mid][c].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
      }
      if (this.grid[mid - 1] && this.grid[mid - 1][c].surfaceType === SurfaceType.Grass) {
        this.grid[mid - 1][c].surfaceType = roadType;
        this.grid[mid - 1][c].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
        this.grid[mid - 1][c].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
      }
    }
    for (let r = 0; r < GRID_SIZE; r++) {
      if (this.grid[r][mid].surfaceType === SurfaceType.Grass) {
        this.grid[r][mid].surfaceType = roadType;
        this.grid[r][mid].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
        this.grid[r][mid].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
      }
      if (this.grid[r][mid - 1] && this.grid[r][mid - 1].surfaceType === SurfaceType.Grass) {
        this.grid[r][mid - 1].surfaceType = roadType;
        this.grid[r][mid - 1].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
        this.grid[r][mid - 1].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
      }
    }
  }

  private isAdjacentToBuilding(row: number, col: number): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (this.grid[nr][nc].surfaceType === SurfaceType.BuildingRoof) return true;
      }
    }
    return false;
  }

  private fillRemaining(): void {
    const grassRatio = this.config.grassRatio / 100;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].surfaceType === SurfaceType.Grass) {
          const isGrass = Math.random() < grassRatio;
          if (isGrass) {
            this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.Grass].absorptionRate;
            this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.Grass].heatCapacity;
          } else {
            this.grid[r][c].surfaceType = SurfaceType.Pavement;
            this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.Pavement].absorptionRate;
            this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.Pavement].heatCapacity;
          }
        }
      }
    }
  }

  private buildGeometry(): void {
    this.buildGroundTiles();
    this.buildBuildingMeshes();
    this.buildGridLines();
  }

  private buildGroundTiles(): void {
    const halfPlot = PLOT_SIZE / 2;
    const tileGroup = new THREE.Group();
    tileGroup.name = 'groundTiles';

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        const mat = SURFACE_MATERIALS[cell.surfaceType];
        const color = new THREE.Color(mat.color);
        const geo = new THREE.PlaneGeometry(CELL_SIZE - 0.1, CELL_SIZE - 0.1);
        const meshMat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, meshMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
          -halfPlot + c * CELL_SIZE + CELL_SIZE / 2,
          0.01,
          -halfPlot + r * CELL_SIZE + CELL_SIZE / 2
        );
        mesh.receiveShadow = true;
        mesh.userData = { gridRow: r, gridCol: c };
        tileGroup.add(mesh);
      }
    }
    this.cityGroup.add(tileGroup);
  }

  private buildBuildingMeshes(): void {
    const halfPlot = PLOT_SIZE / 2;
    const buildingGroup = new THREE.Group();
    buildingGroup.name = 'buildings';

    for (const bld of this.buildings) {
      const w = bld.widthCells * CELL_SIZE;
      const d = bld.depthCells * CELL_SIZE;
      const h = bld.height;

      const group = new THREE.Group();

      const wallGeo = new THREE.BoxGeometry(w, h, d);
      const wallMat = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      group.add(wallMesh);

      const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5);
      const roofColor = bld.hasGreenRoof ? 0x66BB6A : 0x616161;
      const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.y = h / 2 + 0.25;
      roofMesh.castShadow = true;
      group.add(roofMesh);

      group.position.set(
        -halfPlot + bld.gridCol * CELL_SIZE + (bld.widthCells * CELL_SIZE) / 2,
        h / 2,
        -halfPlot + bld.gridRow * CELL_SIZE + (bld.depthCells * CELL_SIZE) / 2
      );

      group.userData = { buildingId: bld.id };
      buildingGroup.add(group);
    }
    this.cityGroup.add(buildingGroup);
  }

  private buildGridLines(): void {
    const halfPlot = PLOT_SIZE / 2;
    this.gridLines = new THREE.Group();
    this.gridLines.name = 'gridLines';
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x90A4AE,
      transparent: true,
      opacity: 0.3,
    });

    for (let i = 0; i <= GRID_SIZE; i++) {
      const points1 = [
        new THREE.Vector3(-halfPlot, 0.02, -halfPlot + i * CELL_SIZE),
        new THREE.Vector3(halfPlot, 0.02, -halfPlot + i * CELL_SIZE),
      ];
      const geo1 = new THREE.BufferGeometry().setFromPoints(points1);
      this.gridLines.add(new THREE.Line(geo1, lineMat));

      const points2 = [
        new THREE.Vector3(-halfPlot + i * CELL_SIZE, 0.02, -halfPlot),
        new THREE.Vector3(-halfPlot + i * CELL_SIZE, 0.02, halfPlot),
      ];
      const geo2 = new THREE.BufferGeometry().setFromPoints(points2);
      this.gridLines.add(new THREE.Line(geo2, lineMat));
    }
    this.cityGroup.add(this.gridLines);
  }

  setHeatmapTexture(canvas: HTMLCanvasElement): void {
    if (this.heatmapPlane) {
      this.cityGroup.remove(this.heatmapPlane);
      this.heatmapPlane.geometry.dispose();
      if (this.heatmapPlane.material instanceof THREE.Material) {
        this.heatmapPlane.material.dispose();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(PLOT_SIZE, PLOT_SIZE);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.heatmapPlane = new THREE.Mesh(geo, mat);
    this.heatmapPlane.rotation.x = -Math.PI / 2;
    this.heatmapPlane.position.y = 0.03;
    this.cityGroup.add(this.heatmapPlane);
  }

  setHeatmapOpacity(opacity: number): void {
    if (this.heatmapPlane && this.heatmapPlane.material instanceof THREE.Material) {
      (this.heatmapPlane.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  updateBuildingRoof(buildingId: string, greenRoof: boolean): void {
    const bld = this.buildings.find(b => b.id === buildingId);
    if (!bld) return;
    bld.hasGreenRoof = greenRoof;

    const buildingGroup = this.cityGroup.getObjectByName('buildings');
    if (!buildingGroup) return;

    for (const child of buildingGroup.children) {
      if (child.userData.buildingId === buildingId && child instanceof THREE.Group) {
        const roofMesh = child.children[1];
        if (roofMesh instanceof THREE.Mesh) {
          const mat = roofMesh.material as THREE.MeshLambertMaterial;
          mat.color.set(greenRoof ? 0x66BB6A : 0x616161);
        }
      }
    }

    for (let r = bld.gridRow; r < bld.gridRow + bld.depthCells; r++) {
      for (let c = bld.gridCol; c < bld.gridCol + bld.widthCells; c++) {
        if (r < GRID_SIZE && c < GRID_SIZE) {
          if (greenRoof) {
            this.grid[r][c].effectiveAbsorption = 0.5;
            this.grid[r][c].effectiveHeatCapacity = 1.2;
          } else {
            this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.BuildingRoof].absorptionRate;
            this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.BuildingRoof].heatCapacity;
          }
        }
      }
    }
  }

  applyPermeablePaving(enabled: boolean): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        if (cell.surfaceType === SurfaceType.Asphalt || cell.surfaceType === SurfaceType.Pavement) {
          if (enabled) {
            cell.effectiveAbsorption = 0.55;
          } else {
            cell.effectiveAbsorption = SURFACE_MATERIALS[cell.surfaceType].absorptionRate;
          }
        }
      }
    }
  }

  addWaterBody(row: number, col: number, radius: number): string {
    const id = `water_${Date.now()}`;
    const affectedCells: { row: number; col: number }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].surfaceType === SurfaceType.BuildingRoof) continue;
        const dr = r - row;
        const dc = c - col;
        const dist = Math.sqrt(dr * dr + dc * dc);
        if (dist <= radius / CELL_SIZE) {
          this.grid[r][c].surfaceType = SurfaceType.Water;
          this.grid[r][c].isWaterBody = true;
          this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.Water].absorptionRate;
          this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.Water].heatCapacity;
          affectedCells.push({ row: r, col: c });
        }
      }
    }

    this.rebuildGroundTiles();
    return id;
  }

  removeWaterBodies(): void {
    const roadType = this.config.roadMaterial === 'asphalt' ? SurfaceType.Asphalt : SurfaceType.Concrete;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].isWaterBody) {
          this.grid[r][c].isWaterBody = false;
          if (this.isAdjacentToBuilding(r, c)) {
            this.grid[r][c].surfaceType = roadType;
            this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[roadType].absorptionRate;
            this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[roadType].heatCapacity;
          } else {
            const isGrass = Math.random() < this.config.grassRatio / 100;
            if (isGrass) {
              this.grid[r][c].surfaceType = SurfaceType.Grass;
              this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.Grass].absorptionRate;
              this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.Grass].heatCapacity;
            } else {
              this.grid[r][c].surfaceType = SurfaceType.Pavement;
              this.grid[r][c].effectiveAbsorption = SURFACE_MATERIALS[SurfaceType.Pavement].absorptionRate;
              this.grid[r][c].effectiveHeatCapacity = SURFACE_MATERIALS[SurfaceType.Pavement].heatCapacity;
            }
          }
        }
      }
    }
    this.rebuildGroundTiles();
  }

  private rebuildGroundTiles(): void {
    const oldTiles = this.cityGroup.getObjectByName('groundTiles');
    if (oldTiles) {
      this.cityGroup.remove(oldTiles);
      oldTiles.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }
    this.buildGroundTiles();

    const oldLines = this.cityGroup.getObjectByName('gridLines');
    if (oldLines) {
      this.cityGroup.remove(oldLines);
    }
    this.buildGridLines();

    if (this.heatmapPlane) {
      this.cityGroup.remove(this.heatmapPlane);
      this.cityGroup.add(this.heatmapPlane);
    }
  }

  getGridCellAt(worldX: number, worldZ: number): GridCell | null {
    const halfPlot = PLOT_SIZE / 2;
    const col = Math.floor((worldX + halfPlot) / CELL_SIZE);
    const row = Math.floor((worldZ + halfPlot) / CELL_SIZE);
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return this.grid[row][col];
    }
    return null;
  }

  getWorldPosition(row: number, col: number): { x: number; z: number } {
    const halfPlot = PLOT_SIZE / 2;
    return {
      x: -halfPlot + col * CELL_SIZE + CELL_SIZE / 2,
      z: -halfPlot + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }
}
