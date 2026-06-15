import * as THREE from 'three';

export interface LightParams {
  hue: number;
  saturation: number;
  lightness: number;
  theta: number;
  phi: number;
  height: number;
  intensity: number;
  enabled: boolean;
}

interface LightData {
  spotLight: THREE.SpotLight;
  beamMesh: THREE.Mesh;
  target: THREE.Object3D;
  params: LightParams;
  fadeTarget: number;
  currentFade: number;
}

export class LightController {
  private scene: THREE.Scene;
  private lights: LightData[] = [];
  public readonly lightCount = 8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createLights();
  }

  private createLights() {
    const defaultColors = [
      { h: 0, s: 100, l: 63 },
      { h: 30, s: 100, l: 60 },
      { h: 60, s: 100, l: 60 },
      { h: 120, s: 100, l: 63 },
      { h: 180, s: 100, l: 63 },
      { h: 210, s: 100, l: 63 },
      { h: 270, s: 100, l: 63 },
      { h: 330, s: 100, l: 63 }
    ];

    for (let i = 0; i < this.lightCount; i++) {
      const angle = (i / this.lightCount) * Math.PI * 2;
      const color = defaultColors[i];

      const params: LightParams = {
        hue: color.h,
        saturation: color.s,
        lightness: color.l,
        theta: angle * THREE.MathUtils.RAD2DEG,
        phi: 45,
        height: 10,
        intensity: 150,
        enabled: true
      };

      this.createLight(i, params);
    }
  }

  private createLight(index: number, params: LightParams) {
    const color = new THREE.Color().setHSL(
      params.hue / 360,
      params.saturation / 100,
      params.lightness / 100
    );

    const target = new THREE.Object3D();
    target.position.set(0, 0.5, 0);
    this.scene.add(target);

    const spotLight = new THREE.SpotLight(color, params.intensity);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.3;
    spotLight.decay = 2;
    spotLight.distance = 40;
    spotLight.target = target;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 512;
    spotLight.shadow.mapSize.height = 512;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 50;
    this.scene.add(spotLight);

    this.updateLightPosition(spotLight, params);

    const beamLength = 15;
    const beamRadius = Math.tan(spotLight.angle) * beamLength;
    const beamGeo = new THREE.ConeGeometry(beamRadius, beamLength, 16, 1, true);
    beamGeo.translate(0, -beamLength / 2, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.updateBeamPosition(beamMesh, spotLight, target);
    this.scene.add(beamMesh);

    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.copy(spotLight.position);
    this.scene.add(bulb);

    const lightData: LightData = {
      spotLight,
      beamMesh,
      target,
      params: { ...params },
      fadeTarget: 1,
      currentFade: 1
    };

    (beamMesh as any).userData = { bulb };
    this.lights[index] = lightData;
  }

  private updateLightPosition(light: THREE.SpotLight, params: LightParams) {
    const thetaRad = (params.theta * Math.PI) / 180;
    const phiRad = (params.phi * Math.PI) / 180;
    const radius = params.height / Math.cos(phiRad);

    light.position.x = radius * Math.sin(phiRad) * Math.cos(thetaRad);
    light.position.y = params.height;
    light.position.z = radius * Math.sin(phiRad) * Math.sin(thetaRad);
  }

  private updateBeamPosition(
    beam: THREE.Mesh,
    light: THREE.SpotLight,
    target: THREE.Object3D
  ) {
    const direction = new THREE.Vector3()
      .subVectors(target.position, light.position)
      .normalize();
    const length = target.position.distanceTo(light.position);

    beam.position.copy(light.position);
    beam.scale.y = Math.min(length / 15, 1.5);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      up,
      direction
    );
    beam.quaternion.copy(quaternion);

    const bulb = (beam as any).userData.bulb as THREE.Mesh;
    if (bulb) {
      bulb.position.copy(light.position);
    }
  }

  getLightParams(index: number): LightParams {
    return { ...this.lights[index].params };
  }

  setLightParams(index: number, newParams: Partial<LightParams>) {
    const data = this.lights[index];
    Object.assign(data.params, newParams);

    const color = new THREE.Color().setHSL(
      data.params.hue / 360,
      data.params.saturation / 100,
      data.params.lightness / 100
    );

    data.spotLight.color.copy(color);
    data.spotLight.intensity = data.params.enabled
      ? data.params.intensity * data.currentFade
      : 0;

    const beamMat = data.beamMesh.material as THREE.MeshBasicMaterial;
    beamMat.color.copy(color);
    beamMat.opacity = data.params.enabled ? 0.12 * data.currentFade : 0;

    const bulb = (data.beamMesh as any).userData.bulb as THREE.Mesh;
    if (bulb) {
      const bulbMat = bulb.material as THREE.MeshBasicMaterial;
      bulbMat.color.copy(color);
      bulbMat.opacity = data.params.enabled ? 0.9 * data.currentFade : 0;
    }

    this.updateLightPosition(data.spotLight, data.params);
    this.updateBeamPosition(data.beamMesh, data.spotLight, data.target);
  }

  setLightTarget(index: number, x: number, y: number, z: number) {
    const data = this.lights[index];
    data.target.position.set(x, y, z);
    this.updateBeamPosition(data.beamMesh, data.spotLight, data.target);
  }

  fadeIn(index: number, duration: number = 0.5) {
    this.lights[index].fadeTarget = 1;
  }

  fadeOut(index: number, duration: number = 0.5) {
    this.lights[index].fadeTarget = 0;
  }

  fadeAllIn(duration: number = 0.5) {
    for (let i = 0; i < this.lightCount; i++) {
      this.fadeIn(i, duration);
    }
  }

  fadeAllOut(duration: number = 0.5) {
    for (let i = 0; i < this.lightCount; i++) {
      this.fadeOut(i, duration);
    }
  }

  private runLightShow(elapsedTime: number) {
    for (let i = 0; i < this.lightCount; i++) {
      const data = this.lights[i];
      const phase = (i / this.lightCount) * Math.PI * 2;
      const breathe = 0.5 + 0.5 * Math.sin(elapsedTime * 2 + phase);
      const hueShift = (data.params.hue + elapsedTime * 10 + i * 20) % 360;

      this.setLightParams(i, {
        hue: hueShift,
        intensity: 100 + breathe * 100
      });
    }
  }

  private lightShowActive = false;

  toggleLightShow() {
    this.lightShowActive = !this.lightShowActive;
    return this.lightShowActive;
  }

  isLightShowActive(): boolean {
    return this.lightShowActive;
  }

  update(deltaTime: number, elapsedTime: number) {
    if (this.lightShowActive) {
      this.runLightShow(elapsedTime);
    }

    for (const data of this.lights) {
      const fadeSpeed = 2;
      if (data.currentFade < data.fadeTarget) {
        data.currentFade = Math.min(
          data.currentFade + deltaTime * fadeSpeed,
          data.fadeTarget
        );
      } else if (data.currentFade > data.fadeTarget) {
        data.currentFade = Math.max(
          data.currentFade - deltaTime * fadeSpeed,
          data.fadeTarget
        );
      }

      if (data.params.enabled) {
        data.spotLight.intensity = data.params.intensity * data.currentFade;
      }

      const beamMat = data.beamMesh.material as THREE.MeshBasicMaterial;
      beamMat.opacity = data.params.enabled ? 0.12 * data.currentFade : 0;

      const bulb = (data.beamMesh as any).userData.bulb as THREE.Mesh;
      if (bulb) {
        const bulbMat = bulb.material as THREE.MeshBasicMaterial;
        bulbMat.opacity = data.params.enabled ? 0.9 * data.currentFade : 0;
      }

      this.updateBeamPosition(data.beamMesh, data.spotLight, data.target);
    }
  }
}
