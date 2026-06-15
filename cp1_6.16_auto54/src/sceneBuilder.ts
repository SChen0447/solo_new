import * as THREE from 'three';
import { eventBus } from './eventBus';
import { latLngToPosition } from './dataParser';
import type { DataSnapshot, BuildingData, SharedScene } from './types';

const COLOR_LIGHT = new THREE.Color(0xD3D3D3);
const COLOR_DARK = new THREE.Color(0x696969);
const GROUND_SIZE = 250;
const GRID_DIVISIONS = 50;

export class SceneBuilder {
  private sharedScene: SharedScene;
  private buildingsGroup: THREE.Group;
  private heatmapGroup: THREE.Group;
  private particlesGroup: THREE.Group;
  private buildingMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.buildingsGroup = new THREE.Group();
    this.buildingsGroup.name = 'buildingsGroup';
    
    this.heatmapGroup = new THREE.Group();
    this.heatmapGroup.name = 'heatmapGroup';
    
    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = 'particlesGroup';

    this.sharedScene = {
      scene,
      camera,
      renderer,
      buildingsGroup: this.buildingsGroup,
      heatmapGroup: this.heatmapGroup,
      particlesGroup: this.particlesGroup
    };

    this.createGround();
    this.createSky();
    this.setupLighting();
    
    scene.add(this.buildingsGroup);
    scene.add(this.heatmapGroup);
    scene.add(this.particlesGroup);

    eventBus.on('data-ready', this.handleDataReady.bind(this));
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.sharedScene.scene.add(ground);

    const gridHelper = new THREE.GridHelper(GROUND_SIZE, GRID_DIVISIONS, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.name = 'gridHelper';
    this.sharedScene.scene.add(gridHelper);
  }

  private createSky(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1a2e) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'sky';
    this.sharedScene.scene.add(sky);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    ambientLight.name = 'ambientLight';
    this.sharedScene.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    directionalLight.name = 'directionalLight';
    this.sharedScene.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x606080, 0x202030, 0.4);
    hemisphereLight.name = 'hemisphereLight';
    this.sharedScene.scene.add(hemisphereLight);
  }

  private createBuildingTexture(color: THREE.Color): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, 64, 64);
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const size = Math.random() * 2 + 1;
      const brightness = Math.random() * 0.15;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private getRandomBuildingColor(): THREE.Color {
    const t = Math.random();
    const color = COLOR_LIGHT.clone().lerp(COLOR_DARK, t);
    return color;
  }

  private createBuilding(building: BuildingData): THREE.Mesh {
    const { x, z } = latLngToPosition(building.lat, building.lng);
    
    const width = 3 + Math.random() * 4;
    const depth = 3 + Math.random() * 4;
    const height = building.height;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const color = this.getRandomBuildingColor();
    const texture = this.createBuildingTexture(color);
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      map: texture,
      roughness: 0.7,
      metalness: 0.1
    });
    this.buildingMaterials.push(material);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { buildingId: building.id };
    
    return mesh;
  }

  private clearBuildings(): void {
    while (this.buildingsGroup.children.length > 0) {
      const child = this.buildingsGroup.children[0] as THREE.Mesh;
      this.buildingsGroup.remove(child);
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.buildingMaterials = [];
  }

  private buildScene(snapshot: DataSnapshot): void {
    this.clearBuildings();
    
    for (const building of snapshot.buildings) {
      const buildingMesh = this.createBuilding(building);
      this.buildingsGroup.add(buildingMesh);
    }

    this.sharedScene.camera.position.set(80, 80, 80);
    this.sharedScene.camera.lookAt(0, 10, 0);
  }

  private handleDataReady(snapshot: DataSnapshot): void {
    this.buildScene(snapshot);
    eventBus.emit('scene-ready', this.sharedScene);
  }

  public getSharedScene(): SharedScene {
    return this.sharedScene;
  }

  public dispose(): void {
    this.clearBuildings();
  }
}
