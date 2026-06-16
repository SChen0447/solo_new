import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class TerrainRenderer {
  private scene: THREE.Scene;
  private terrainMesh: THREE.Mesh;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private hoverMarker: THREE.Group;
  private hoverLineX: THREE.Line;
  private hoverLineZ: THREE.Line;

  constructor(scene: THREE.Scene, terrainGenerator: TerrainGenerator) {
    this.scene = scene;

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 10,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(terrainGenerator.getGeometry(), material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a2f0b, 0.6);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.scene.add(this.directionalLight);

    const fogColor = new THREE.Color(0x1A1A1A);
    scene.fog = new THREE.FogExp2(fogColor, 0.04);
    scene.background = fogColor;

    this.hoverMarker = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
    const lineGeomX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0.5, 0, 0),
    ]);
    const lineGeomZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -0.5),
      new THREE.Vector3(0, 0, 0.5),
    ]);
    this.hoverLineX = new THREE.Line(lineGeomX, lineMat);
    this.hoverLineZ = new THREE.Line(lineGeomZ, lineMat);
    this.hoverMarker.add(this.hoverLineX);
    this.hoverMarker.add(this.hoverLineZ);
    this.hoverMarker.visible = false;
    this.scene.add(this.hoverMarker);
  }

  updateLightDirection(plateDirection: number): void {
    const rad = (plateDirection * Math.PI) / 180;
    const lightDist = 12;
    this.directionalLight.position.set(
      Math.sin(rad) * lightDist,
      10,
      Math.cos(rad) * lightDist
    );
    this.directionalLight.target.position.set(0, 0, 0);
  }

  showHoverMarker(worldX: number, worldY: number, worldZ: number): void {
    this.hoverMarker.position.set(worldX, worldY + 0.1, worldZ);
    this.hoverMarker.visible = true;
  }

  hideHoverMarker(): void {
    this.hoverMarker.visible = false;
  }

  getTerrainMesh(): THREE.Mesh {
    return this.terrainMesh;
  }

  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  dispose(): void {
    this.terrainMesh.geometry.dispose();
    (this.terrainMesh.material as THREE.Material).dispose();
    this.hoverLineX.geometry.dispose();
    (this.hoverLineX.material as THREE.Material).dispose();
    this.hoverLineZ.geometry.dispose();
    (this.hoverLineZ.material as THREE.Material).dispose();
  }
}
