import * as THREE from 'three';

export interface LightConfig {
  azimuth: number;
  elevation: number;
  intensity: number;
  shadowSoftness: number;
  colorTemp: number;
}

const DEFAULT_CONFIG: LightConfig = {
  azimuth: 45,
  elevation: 45,
  intensity: 1.5,
  shadowSoftness: 50,
  colorTemp: 5500,
};

const SHADOW_MAP_SIZE = 2048;
const LIGHT_DISTANCE = 10;

export class LightManager {
  group: THREE.Group;
  config: LightConfig;

  ambientLight: THREE.AmbientLight;
  hemisphereLight: THREE.HemisphereLight;
  directionalLight: THREE.DirectionalLight;

  private shadowDirty = false;
  private lastShadowUpdate = 0;
  private readonly SHADOW_UPDATE_INTERVAL = 1000 / 33;

  constructor(config: Partial<LightConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = 'lights';

    this.ambientLight = this.createAmbientLight();
    this.hemisphereLight = this.createHemisphereLight();
    this.directionalLight = this.createDirectionalLight();

    this.group.add(this.ambientLight, this.hemisphereLight, this.directionalLight);
    this.updateDirectionalLight();
  }

  private createAmbientLight(): THREE.AmbientLight {
    const light = new THREE.AmbientLight(0x404060, 0.4);
    light.name = 'ambient';
    return light;
  }

  private createHemisphereLight(): THREE.HemisphereLight {
    const light = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.5);
    light.name = 'hemisphere';
    return light;
  }

  private createDirectionalLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xfff5e6, this.config.intensity);
    light.name = 'directional';
    light.castShadow = true;

    light.shadow.mapSize.width = SHADOW_MAP_SIZE;
    light.shadow.mapSize.height = SHADOW_MAP_SIZE;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 30;
    light.shadow.camera.left = -8;
    light.shadow.camera.right = 8;
    light.shadow.camera.top = 6;
    light.shadow.camera.bottom = -6;
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.02;

    this.applyShadowSoftness(light, this.config.shadowSoftness);

    return light;
  }

  private applyShadowSoftness(light: THREE.DirectionalLight, softness: number): void {
    const t = softness / 100;
    light.shadow.radius = t * 8;
    light.shadow.blurSamples = Math.round(4 + t * 28);

    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
    this.shadowDirty = true;
  }

  updateDirectionalLight(): void {
    const azimuthRad = (this.config.azimuth * Math.PI) / 180;
    const elevationRad = (this.config.elevation * Math.PI) / 180;

    const x = LIGHT_DISTANCE * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = LIGHT_DISTANCE * Math.sin(elevationRad);
    const z = LIGHT_DISTANCE * Math.cos(elevationRad) * Math.cos(azimuthRad);

    this.directionalLight.position.set(x, Math.max(y, 0.5), z);
    this.directionalLight.target.position.set(0, 0, 0);

    this.directionalLight.intensity = this.config.intensity;

    this.applyColorTemp(this.config.colorTemp);
    this.shadowDirty = true;
  }

  private applyColorTemp(kelvin: number): void {
    const t = kelvin / 100;
    let r: number, g: number, b: number;

    if (t <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(t) - 161.1195681661;
      b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    } else {
      r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
      b = 255;
    }

    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    this.directionalLight.color.setRGB(r / 255, g / 255, b / 255);
  }

  setAzimuth(degrees: number): void {
    this.config.azimuth = Math.max(0, Math.min(360, degrees));
    this.updateDirectionalLight();
  }

  setElevation(degrees: number): void {
    this.config.elevation = Math.max(0, Math.min(90, degrees));
    this.updateDirectionalLight();
  }

  setIntensity(value: number): void {
    this.config.intensity = Math.max(0, Math.min(3, value));
    this.directionalLight.intensity = this.config.intensity;
  }

  setShadowSoftness(value: number): void {
    this.config.shadowSoftness = Math.max(0, Math.min(100, value));
    this.applyShadowSoftness(this.directionalLight, this.config.shadowSoftness);
  }

  setColorTemp(kelvin: number): void {
    this.config.colorTemp = Math.max(2700, Math.min(6500, kelvin));
    this.applyColorTemp(this.config.colorTemp);
  }

  updateShadowIfNeeded(now: number): void {
    if (this.shadowDirty && now - this.lastShadowUpdate > this.SHADOW_UPDATE_INTERVAL) {
      if (this.directionalLight.shadow.map) {
        this.directionalLight.shadow.map.dispose();
        this.directionalLight.shadow.map = null;
      }
      this.shadowDirty = false;
      this.lastShadowUpdate = now;
    }
  }

  forceShadowUpdate(): void {
    this.shadowDirty = true;
  }

  getShadowMetrics(): { isDirty: boolean; lastUpdate: number } {
    return {
      isDirty: this.shadowDirty,
      lastUpdate: this.lastShadowUpdate,
    };
  }
}
