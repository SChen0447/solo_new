import * as THREE from 'three';
import { eventBus, Events } from '../core/EventBus';
import {
  LightType,
  LightState,
  LightParams,
  HeatmapData,
  RoomSize,
  LIGHT_LIMITS,
  GroupLightChange,
} from '../core/Types';
import { generateId, degreesToRadians, gridToWorld, clamp } from '../utils/MathUtils';

export class LightEngine {
  private scene: THREE.Scene;
  private lights: Map<string, LightState> = new Map();
  private roomSize: RoomSize;
  
  private readonly HEATMAP_GRID_SIZE = 20;
  private heatmapData: HeatmapData | null = null;
  private lastHeatmapUpdate = 0;
  private readonly HEATMAP_UPDATE_INTERVAL = 1000 / 30;
  
  private raycaster: THREE.Raycaster;
  private samplePoints: THREE.Vector3[][] = [];
  
  constructor(scene: THREE.Scene, roomSize: RoomSize) {
    this.scene = scene;
    this.roomSize = roomSize;
    this.raycaster = new THREE.Raycaster();
    this.generateSamplePoints();
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    eventBus.on<LightType>(Events.LIGHT_ADDED, (type) => this.addLight(type));
    eventBus.on<string>(Events.LIGHT_REMOVED, (id) => this.removeLight(id));
    eventBus.on<LightParams>(Events.LIGHT_PARAMS_CHANGED, (params) => this.updateLight(params));
    eventBus.on<GroupLightChange>(Events.LIGHTS_GROUP_CHANGED, (change) => this.updateGroupLights(change));
    eventBus.on<RoomSize>(Events.ROOM_SIZE_CHANGED, (size) => this.updateRoomSize(size));
  }
  
  private generateSamplePoints(): void {
    this.samplePoints = [];
    for (let x = 0; x < this.HEATMAP_GRID_SIZE; x++) {
      this.samplePoints[x] = [];
      for (let z = 0; z < this.HEATMAP_GRID_SIZE; z++) {
        const worldPos = gridToWorld(
          x, z,
          this.roomSize.width, this.roomSize.depth,
          this.HEATMAP_GRID_SIZE
        );
        worldPos.y = 0.05;
        this.samplePoints[x][z] = worldPos;
      }
    }
  }
  
  private updateRoomSize(size: RoomSize): void {
    this.roomSize = { ...size };
    this.generateSamplePoints();
  }
  
  public addLight(type: LightType): LightState | null {
    const typeCount = this.countLightsByType(type);
    const totalCount = this.lights.size;
    
    if (totalCount >= LIGHT_LIMITS.total) {
      eventBus.emit(Events.PERFORMANCE_WARNING, {
        message: `光源数量已达上限 (${LIGHT_LIMITS.total})`,
        type: 'light_limit'
      });
      return null;
    }
    
    if (typeCount >= LIGHT_LIMITS[type]) {
      eventBus.emit(Events.PERFORMANCE_WARNING, {
        message: `${this.getLightTypeName(type)}已达上限 (${LIGHT_LIMITS[type]})`,
        type: 'light_type_limit'
      });
      return null;
    }
    
    const id = generateId();
    const lightState = this.createLightState(id, type);
    
    this.lights.set(id, lightState);
    this.attachToScene(lightState);
    
    eventBus.emit(Events.SCENE_UPDATED, {});
    eventBus.emit(Events.RENDER);
    
    this.checkPerformance();
    
    return lightState;
  }
  
  private createLightState(id: string, type: LightType): LightState {
    const defaultPosition = new THREE.Vector3(
      (Math.random() - 0.5) * (this.roomSize.width - 2),
      this.roomSize.height * 0.8,
      (Math.random() - 0.5) * (this.roomSize.depth - 2)
    );
    
    const baseState: Omit<LightState, 'lightObject' | 'helperObject'> = {
      id,
      type,
      position: defaultPosition.clone(),
      targetPosition: defaultPosition.clone(),
      color: 0xffee88,
      intensity: 2,
      targetIntensity: 2,
      distance: 10,
      angle: 45,
      penumbra: 0.3,
      decay: 1,
      castShadow: false,
      shadowMapSize: 1024,
    };
    
    const lightState = baseState as LightState;
    lightState.lightObject = this.createThreeLight(lightState);
    lightState.helperObject = this.createHelper(lightState);
    
    return lightState;
  }
  
  private createThreeLight(state: LightState): THREE.Light {
    let light: THREE.Light;
    
    switch (state.type) {
      case 'point':
        light = new THREE.PointLight(state.color, state.intensity, state.distance, state.decay);
        break;
      case 'spot':
        light = new THREE.SpotLight(
          state.color, state.intensity, state.distance,
          degreesToRadians(state.angle), state.penumbra, state.decay
        );
        (light as THREE.SpotLight).target.position.set(0, 0, -1);
        break;
      case 'directional':
        light = new THREE.DirectionalLight(state.color, state.intensity);
        (light as THREE.DirectionalLight).target.position.set(0, 0, 0);
        break;
      case 'ambient':
        light = new THREE.AmbientLight(state.color, state.intensity * 0.3);
        break;
      default:
        light = new THREE.PointLight(state.color, state.intensity);
    }
    
    light.position.copy(state.position);
    light.castShadow = state.castShadow;
    
    if (light.shadow) {
      light.shadow.mapSize.set(state.shadowMapSize, state.shadowMapSize);
      const shadowCamera = light.shadow.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      shadowCamera.near = 0.1;
      shadowCamera.far = 50;
      light.shadow.bias = -0.0001;
    }
    
    return light;
  }
  
  private createHelper(state: LightState): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `LightHelper_${state.id}`;
    group.position.copy(state.position);
    (group as any).lightId = state.id;
    
    switch (state.type) {
      case 'point': {
        const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);
        break;
      }
      case 'spot': {
        const coneGeo = new THREE.ConeGeometry(0.1, 0.2, 8);
        const coneMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.rotation.x = Math.PI;
        cone.position.y = 0.1;
        group.add(cone);
        
        const sphereGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);
        break;
      }
      case 'directional': {
        const dir = new THREE.Vector3(0, -1, 0);
        const arrowHelper = new THREE.ArrowHelper(
          dir, new THREE.Vector3(0, 0, 0), 0.5, 0xffff00, 0.15, 0.1
        );
        group.add(arrowHelper);
        break;
      }
      case 'ambient': {
        const boxGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0x88ccff });
        const box = new THREE.Mesh(boxGeo, boxMat);
        group.add(box);
        break;
      }
    }
    
    return group;
  }
  
  private attachToScene(state: LightState): void {
    if (state.lightObject) {
      this.scene.add(state.lightObject);
      
      if (state.type === 'spot' && (state.lightObject as THREE.SpotLight).target) {
        this.scene.add((state.lightObject as THREE.SpotLight).target);
      }
      if (state.type === 'directional' && (state.lightObject as THREE.DirectionalLight).target) {
        this.scene.add((state.lightObject as THREE.DirectionalLight).target);
      }
    }
    
    if (state.helperObject) {
      this.scene.add(state.helperObject);
    }
  }
  
  public removeLight(id: string): void {
    const state = this.lights.get(id);
    if (!state) return;
    
    if (state.lightObject) {
      if (state.type === 'spot' && (state.lightObject as THREE.SpotLight).target) {
        this.scene.remove((state.lightObject as THREE.SpotLight).target);
      }
      if (state.type === 'directional' && (state.lightObject as THREE.DirectionalLight).target) {
        this.scene.remove((state.lightObject as THREE.DirectionalLight).target);
      }
      this.scene.remove(state.lightObject);
      state.lightObject.dispose();
      if (state.lightObject.shadow) {
        state.lightObject.shadow.map?.dispose();
      }
    }
    
    if (state.helperObject) {
      this.scene.remove(state.helperObject);
      state.helperObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
    
    this.lights.delete(id);
    
    eventBus.emit(Events.SCENE_UPDATED, {});
    eventBus.emit(Events.RENDER);
  }
  
  public updateLight(params: Partial<LightParams> & { id: string }): void {
    const state = this.lights.get(params.id);
    if (!state) return;
    
    Object.assign(state, params);
    
    if (params.position && !params.targetPosition) {
      state.targetPosition = params.position.clone();
    }
    
    if (params.targetPosition) {
      state.targetPosition = params.targetPosition.clone();
    }
    
    if (params.intensity !== undefined) {
      state.targetIntensity = params.intensity;
    }
    
    this.applyLightParams(state);
    
    eventBus.emit(Events.RENDER);
  }
  
  public updateGroupLights(change: GroupLightChange): void {
    change.lightIds.forEach(id => {
      const state = this.lights.get(id);
      if (state) {
        Object.assign(state, change.params);
        
        if (change.params.intensity !== undefined) {
          state.targetIntensity = change.params.intensity;
        }
        if (change.params.position) {
          state.targetPosition = change.params.position.clone();
        }
        
        this.applyLightParams(state);
      }
    });
    
    eventBus.emit(Events.RENDER);
  }
  
  private applyLightParams(state: LightState): void {
    const light = state.lightObject;
    if (!light) return;
    
    light.color.setHex(state.color);
    light.intensity = state.intensity;
    
    if (light instanceof THREE.PointLight) {
      light.distance = state.distance;
      light.decay = state.decay;
    } else if (light instanceof THREE.SpotLight) {
      light.distance = state.distance;
      light.angle = degreesToRadians(state.angle);
      light.penumbra = state.penumbra;
      light.decay = state.decay;
    }
    
    light.castShadow = state.castShadow;
    
    if (light.shadow && state.castShadow) {
      light.shadow.mapSize.set(state.shadowMapSize, state.shadowMapSize);
      light.shadow.needsUpdate = true;
    }
    
    if (state.helperObject) {
      state.helperObject.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          if (state.type === 'point' || state.type === 'spot') {
            child.material.color.setHex(0xffff00);
          }
        }
      });
    }
  }
  
  private countLightsByType(type: LightType): number {
    let count = 0;
    this.lights.forEach(light => {
      if (light.type === type) count++;
    });
    return count;
  }
  
  private getLightTypeName(type: LightType): string {
    const names: Record<LightType, string> = {
      point: '点光源',
      spot: '聚光灯',
      directional: '方向光',
      ambient: '环境光',
    };
    return names[type];
  }
  
  private checkPerformance(): void {
    const totalCount = this.lights.size;
    
    if (totalCount > 12) {
      this.lights.forEach(light => {
        if (light.castShadow && light.shadowMapSize > 512) {
          light.shadowMapSize = 512;
          this.applyLightParams(light);
        }
      });
      
      eventBus.emit(Events.PERFORMANCE_WARNING, {
        message: '光源过多，已自动降低阴影贴图分辨率至512px',
        type: 'shadow_downgrade'
      });
    }
  }
  
  public update(timestamp: number): void {
    if (timestamp - this.lastHeatmapUpdate >= this.HEATMAP_UPDATE_INTERVAL) {
      this.updateHeatmap();
      this.lastHeatmapUpdate = timestamp;
    }
  }
  
  private updateHeatmap(): void {
    const startTime = performance.now();
    
    const values: number[][] = [];
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (let x = 0; x < this.HEATMAP_GRID_SIZE; x++) {
      values[x] = [];
      for (let z = 0; z < this.HEATMAP_GRID_SIZE; z++) {
        const intensity = this.calculateIntensityAt(this.samplePoints[x][z]);
        values[x][z] = intensity;
        minValue = Math.min(minValue, intensity);
        maxValue = Math.max(maxValue, intensity);
      }
    }
    
    this.heatmapData = {
      gridSize: this.HEATMAP_GRID_SIZE,
      values,
      minValue,
      maxValue,
      roomWidth: this.roomSize.width,
      roomDepth: this.roomSize.depth,
    };
    
    eventBus.emit(Events.HEATMAP_DATA_UPDATED, {
      data: this.heatmapData,
      updateTime: performance.now() - startTime
    });
  }
  
  private calculateIntensityAt(point: THREE.Vector3): number {
    let totalIntensity = 0;
    
    this.lights.forEach((state) => {
      if (state.type === 'ambient') {
        totalIntensity += state.intensity * 0.3;
        return;
      }
      
      const lightPos = state.targetPosition;
      const distance = point.distanceTo(lightPos);
      
      if (state.distance > 0 && distance > state.distance) return;
      
      if (state.type === 'spot') {
        const light = state.lightObject as THREE.SpotLight;
        if (light && light.target) {
          const toTarget = new THREE.Vector3()
            .subVectors(light.target.position, lightPos)
            .normalize();
          const toPoint = new THREE.Vector3()
            .subVectors(point, lightPos)
            .normalize();
          
          const angle = Math.acos(clamp(toTarget.dot(toPoint), -1, 1));
          const halfAngle = degreesToRadians(state.angle) / 2;
          
          if (angle > halfAngle) return;
          
          const spotFactor = 1 - (angle / halfAngle);
          totalIntensity += this.calculateFalloff(state, distance) * spotFactor;
          return;
        }
      }
      
      if (state.type === 'directional') {
        const dirLight = state.lightObject as THREE.DirectionalLight;
        if (dirLight && dirLight.target) {
          const lightDir = new THREE.Vector3()
            .subVectors(dirLight.target.position, lightPos)
            .normalize();
          
          const toPoint = new THREE.Vector3()
            .subVectors(point, lightPos)
            .normalize();
          
          const dot = lightDir.dot(toPoint);
          if (dot > 0.3) {
            totalIntensity += state.intensity * dot;
          }
          return;
        }
      }
      
      totalIntensity += this.calculateFalloff(state, distance);
    });
    
    return totalIntensity;
  }
  
  private calculateFalloff(state: LightState, distance: number): number {
    if (state.distance <= 0) return state.intensity;
    
    const normalizedDist = distance / state.distance;
    if (normalizedDist >= 1) return 0;
    
    const factor = Math.pow(1 - normalizedDist, state.decay + 1);
    return state.intensity * factor;
  }
  
  public getLights(): LightState[] {
    return Array.from(this.lights.values());
  }
  
  public getLight(id: string): LightState | undefined {
    return this.lights.get(id);
  }
  
  public getHeatmapData(): HeatmapData | null {
    return this.heatmapData;
  }
  
  public getSelectedLights(ids: string[]): LightState[] {
    return ids.map(id => this.lights.get(id)).filter(Boolean) as LightState[];
  }
  
  public getTotalShadowMapSize(): number {
    let total = 0;
    this.lights.forEach(light => {
      if (light.castShadow) {
        total += light.shadowMapSize * light.shadowMapSize;
      }
    });
    return total;
  }
  
  public getLightByHelper(helper: THREE.Object3D): LightState | null {
    const lightId = (helper as any).lightId;
    if (lightId && this.lights.has(lightId)) {
      return this.lights.get(lightId)!;
    }
    return null;
  }
  
  public dispose(): void {
    this.lights.forEach((state) => {
      if (state.lightObject) {
        this.scene.remove(state.lightObject);
        state.lightObject.dispose();
        if (state.lightObject.shadow) {
          state.lightObject.shadow.map?.dispose();
        }
      }
      if (state.helperObject) {
        this.scene.remove(state.helperObject);
      }
    });
    
    this.lights.clear();
    eventBus.off(Events.LIGHT_ADDED, () => {});
    eventBus.off(Events.LIGHT_REMOVED, () => {});
    eventBus.off(Events.LIGHT_PARAMS_CHANGED, () => {});
    eventBus.off(Events.LIGHTS_GROUP_CHANGED, () => {});
    eventBus.off(Events.ROOM_SIZE_CHANGED, () => {});
  }
}
