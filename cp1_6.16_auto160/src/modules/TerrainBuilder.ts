import * as THREE from 'three';

export interface MaterialLayer {
  id: string;
  name: string;
  thickness: number;
  permeability: number;
  porosity: number;
  color: number;
}

export const MATERIAL_TYPES: Omit<MaterialLayer, 'thickness'>[] = [
  { id: 'sand', name: '砂土', permeability: 1.0, porosity: 0.4, color: 0xD4A574 },
  { id: 'clay', name: '黏土', permeability: 0.01, porosity: 0.35, color: 0x8B6914 },
  { id: 'gravel', name: '砾石', permeability: 5.0, porosity: 0.3, color: 0x9E9E9E },
  { id: 'bedrock', name: '基岩', permeability: 0.001, porosity: 0.1, color: 0x5D4037 },
];

export interface TerrainConfig {
  width: number;
  depth: number;
  height: number;
  layers: MaterialLayer[];
}

export class TerrainBuilder {
  private scene: THREE.Scene;
  private config: TerrainConfig;
  private terrainGroup: THREE.Group;
  private layerMeshes: THREE.Mesh[] = [];
  private raycaster: THREE.Raycaster;
  private onLayerClick?: (layer: MaterialLayer | null) => void;

  constructor(scene: THREE.Scene, config: TerrainConfig) {
    this.scene = scene;
    this.config = config;
    this.terrainGroup = new THREE.Group();
    this.terrainGroup.name = 'terrain';
    this.raycaster = new THREE.Raycaster();
    this.buildTerrain();
  }

  private buildTerrain(): void {
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0];
      this.terrainGroup.remove(child);
    }
    this.layerMeshes = [];

    const { width, depth, height, layers } = this.config;
    let currentZ = 0;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerThickness = Math.min(layer.thickness, height - currentZ);
      if (layerThickness <= 0) break;

      const geometry = new THREE.BoxGeometry(width, layerThickness, depth);
      const material = new THREE.MeshPhongMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        shininess: 20,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, currentZ + layerThickness / 2 - height / 2, 0);
      mesh.userData = { layerIndex: i, layer: layer, type: 'terrainLayer' };
      mesh.name = `layer_${layer.id}`;

      this.terrainGroup.add(mesh);
      this.layerMeshes.push(mesh);

      currentZ += layerThickness;
    }

    const wireframeGeo = new THREE.BoxGeometry(width, height, depth);
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x667EEA, transparent: true, opacity: 0.3 });
    const edges = new THREE.EdgesGeometry(wireframeGeo);
    const wireframe = new THREE.LineSegments(edges, wireframeMat);
    wireframe.name = 'terrainWireframe';
    this.terrainGroup.add(wireframe);

    this.terrainGroup.position.y = height / 2;
  }

  public updateConfig(config: Partial<TerrainConfig>): void {
    this.config = { ...this.config, ...config };
    this.buildTerrain();
  }

  public getTerrainGroup(): THREE.Group {
    return this.terrainGroup;
  }

  public getLayerMeshes(): THREE.Mesh[] {
    return this.layerMeshes;
  }

  public setOnLayerClick(callback: (layer: MaterialLayer | null) => void): void {
    this.onLayerClick = callback;
  }

  public handleClick(event: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(this.layerMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const layer = mesh.userData.layer as MaterialLayer;
      this.highlightLayer(mesh.userData.layerIndex);
      if (this.onLayerClick) {
        this.onLayerClick(layer);
      }
    } else {
      this.clearHighlight();
      if (this.onLayerClick) {
        this.onLayerClick(null);
      }
    }
  }

  private highlightLayer(index: number): void {
    this.layerMeshes.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      if (i === index) {
        mat.opacity = 0.85;
        mat.emissive = new THREE.Color(0x667EEA);
        mat.emissiveIntensity = 0.2;
      } else {
        mat.opacity = 0.4;
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  public clearHighlight(): void {
    this.layerMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.opacity = 0.6;
      mat.emissive = new THREE.Color(0x000000);
      mat.emissiveIntensity = 0;
    });
  }

  public getPermeabilityAt(x: number, y: number, z: number): number {
    const { height, layers } = this.config;
    const relZ = z + height / 2;

    let currentZ = 0;
    for (const layer of layers) {
      if (relZ >= currentZ && relZ < currentZ + layer.thickness) {
        return layer.permeability;
      }
      currentZ += layer.thickness;
    }

    return layers[layers.length - 1]?.permeability || 0.01;
  }

  public getLayerAtDepth(depth: number): MaterialLayer | null {
    const { layers } = this.config;
    let currentZ = 0;

    for (const layer of layers) {
      if (depth >= currentZ && depth < currentZ + layer.thickness) {
        return layer;
      }
      currentZ += layer.thickness;
    }

    return layers[layers.length - 1] || null;
  }

  public getTotalHeight(): number {
    return this.config.height;
  }

  public getWidth(): number {
    return this.config.width;
  }

  public getDepth(): number {
    return this.config.depth;
  }

  public dispose(): void {
    this.layerMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }
}
