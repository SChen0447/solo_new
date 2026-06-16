import * as THREE from 'three';
import { PollutionSimulator } from './PollutionSimulator';
import { TerrainBuilder } from './TerrainBuilder';

export interface WallConfig {
  enabled: boolean;
  x: number;
  height: number;
}

export interface AbsorbentConfig {
  enabled: boolean;
  z: number;
  thickness: number;
  efficiency: number;
}

export class InterventionHandler {
  private scene: THREE.Scene;
  private terrain: TerrainBuilder;
  private simulator: PollutionSimulator;
  private interventionGroup: THREE.Group;

  private wallMesh: THREE.Mesh | null = null;
  private wallConfig: WallConfig;

  private absorbentMesh: THREE.Mesh | null = null;
  private absorbentConfig: AbsorbentConfig;
  private absorbentSaturation: number = 0;

  constructor(scene: THREE.Scene, terrain: TerrainBuilder, simulator: PollutionSimulator) {
    this.scene = scene;
    this.terrain = terrain;
    this.simulator = simulator;

    this.interventionGroup = new THREE.Group();
    this.interventionGroup.name = 'interventions';
    this.scene.add(this.interventionGroup);

    this.wallConfig = {
      enabled: false,
      x: 30,
      height: 15,
    };

    this.absorbentConfig = {
      enabled: false,
      z: 15,
      thickness: 2,
      efficiency: 0.8,
    };
  }

  public updateWall(config: Partial<WallConfig>): void {
    this.wallConfig = { ...this.wallConfig, ...config };

    if (this.wallConfig.enabled) {
      this.createWall();
    } else {
      this.removeWall();
    }

    this.updateSimulatorWall();
  }

  private createWall(): void {
    this.removeWall();

    const width = 0.5;
    const depth = this.terrain.getDepth();
    const height = this.wallConfig.height;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
      color: 0x546E7A,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    this.wallMesh = new THREE.Mesh(geometry, material);
    this.wallMesh.position.set(
      this.wallConfig.x - this.terrain.getWidth() / 2,
      height / 2 - this.terrain.getTotalHeight() / 2 + this.terrain.getTotalHeight() / 2,
      0
    );
    this.wallMesh.name = 'isolationWall';
    this.wallMesh.userData = { type: 'wall' };

    this.interventionGroup.add(this.wallMesh);
  }

  private removeWall(): void {
    if (this.wallMesh) {
      this.interventionGroup.remove(this.wallMesh);
      this.wallMesh.geometry.dispose();
      (this.wallMesh.material as THREE.Material).dispose();
      this.wallMesh = null;
    }
  }

  private updateSimulatorWall(): void {
    if (this.wallConfig.enabled) {
      this.simulator.setWall(this.wallConfig.x, this.wallConfig.height);
    } else {
      this.simulator.setWall(null, 0);
    }
  }

  public updateAbsorbent(config: Partial<AbsorbentConfig>): void {
    this.absorbentConfig = { ...this.absorbentConfig, ...config };

    if (this.absorbentConfig.enabled) {
      this.createAbsorbent();
    } else {
      this.removeAbsorbent();
    }

    this.updateSimulatorAbsorbent();
  }

  private createAbsorbent(): void {
    this.removeAbsorbent();

    const width = this.terrain.getWidth();
    const depth = this.terrain.getDepth();
    const thickness = this.absorbentConfig.thickness;

    const geometry = new THREE.BoxGeometry(width, thickness, depth);
    const material = new THREE.MeshPhongMaterial({
      color: 0x263238,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    this.absorbentMesh = new THREE.Mesh(geometry, material);
    this.absorbentMesh.position.set(
      0,
      this.absorbentConfig.z - this.terrain.getTotalHeight() / 2 + this.terrain.getTotalHeight() / 2,
      0
    );
    this.absorbentMesh.name = 'absorbentLayer';
    this.absorbentMesh.userData = { type: 'absorbent' };

    this.interventionGroup.add(this.absorbentMesh);
    this.absorbentSaturation = 0;
  }

  private removeAbsorbent(): void {
    if (this.absorbentMesh) {
      this.interventionGroup.remove(this.absorbentMesh);
      this.absorbentMesh.geometry.dispose();
      (this.absorbentMesh.material as THREE.Material).dispose();
      this.absorbentMesh = null;
    }
  }

  private updateSimulatorAbsorbent(): void {
    if (this.absorbentConfig.enabled) {
      this.simulator.setAbsorbent(
        this.absorbentConfig.z,
        this.absorbentConfig.thickness,
        this.absorbentConfig.efficiency * 0.75
      );
    } else {
      this.simulator.setAbsorbent(null, 0, 0);
    }
  }

  public update(dt: number): void {
    if (this.absorbentConfig.enabled && this.absorbentMesh) {
      if (this.simulator.isSimulationRunning()) {
        this.absorbentSaturation = Math.min(1, this.absorbentSaturation + dt * 0.02);
      }

      const material = this.absorbentMesh.material as THREE.MeshPhongMaterial;
      const baseColor = new THREE.Color(0x263238);
      const saturatedColor = new THREE.Color(0x5D4037);
      material.color.copy(baseColor.clone().lerp(saturatedColor, this.absorbentSaturation));
    }
  }

  public getWallConfig(): WallConfig {
    return { ...this.wallConfig };
  }

  public getAbsorbentConfig(): AbsorbentConfig {
    return { ...this.absorbentConfig };
  }

  public getInterventionGroup(): THREE.Group {
    return this.interventionGroup;
  }

  public reset(): void {
    this.absorbentSaturation = 0;
    if (this.absorbentMesh) {
      const material = this.absorbentMesh.material as THREE.MeshPhongMaterial;
      material.color.setHex(0x263238);
    }
  }

  public dispose(): void {
    this.removeWall();
    this.removeAbsorbent();
    this.scene.remove(this.interventionGroup);
  }
}
