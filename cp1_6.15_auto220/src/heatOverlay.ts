import * as THREE from 'three';
import { PointCloudManager, TEMP_MIN, TEMP_MAX, COORD_RANGE } from './pointCloud';

export class HeatOverlayManager {
  mesh: THREE.Mesh;
  private pointCloud: PointCloudManager;
  private gridRes = 64;
  private texture: THREE.DataTexture;
  private heightOffset = 10;
  overlayOpacity: number = 0.6;
  private tooltipEl: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private updateTimer: number = 0;
  private updateInterval: number = 0.25;

  constructor(scene: THREE.Scene, pointCloud: PointCloudManager, camera: THREE.Camera) {
    this.pointCloud = pointCloud;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltipEl = document.getElementById('tooltip')!;

    const size = this.gridRes;
    const data = new Uint8Array(size * size * 4);
    this.texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(COORD_RANGE * 2, COORD_RANGE * 2);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: this.overlayOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = this.heightOffset;
    scene.add(this.mesh);
  }

  private computeHeatmap() {
    const size = this.gridRes;
    const data = this.texture.image.data as Uint8Array;
    const kernelRadius = 20;
    const sigma = kernelRadius / 3;
    const sigma2 = 2 * sigma * sigma;
    const pixelRadius = Math.ceil(kernelRadius / (2 * COORD_RANGE) * size);

    const gridTemps = new Float32Array(size * size);
    const gridWeights = new Float32Array(size * size);

    for (let i = 0; i < this.pointCloud.points.length; i++) {
      const p = this.pointCloud.points[i];
      const currentTemp = p.transitionProgress < 1
        ? p.temperature + (p.targetTemperature - p.temperature) * p.transitionProgress
        : p.temperature;

      const gx = ((p.x + COORD_RANGE) / (2 * COORD_RANGE)) * size;
      const gz = ((p.z + COORD_RANGE) / (2 * COORD_RANGE)) * size;

      const gi = Math.floor(gx);
      const gj = Math.floor(gz);

      const minPx = Math.max(0, gi - pixelRadius);
      const maxPx = Math.min(size - 1, gi + pixelRadius);
      const minPy = Math.max(0, gj - pixelRadius);
      const maxPy = Math.min(size - 1, gj + pixelRadius);

      for (let py = minPy; py <= maxPy; py++) {
        const worldDy = (py - gz) / size * 2 * COORD_RANGE;
        const dy2 = worldDy * worldDy;
        for (let px = minPx; px <= maxPx; px++) {
          const worldDx = (px - gx) / size * 2 * COORD_RANGE;
          const d2 = worldDx * worldDx + dy2;
          if (d2 > kernelRadius * kernelRadius) continue;

          const w = Math.exp(-d2 / sigma2);
          const idx = py * size + px;
          gridTemps[idx] += currentTemp * w;
          gridWeights[idx] += w;
        }
      }
    }

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const idx = j * size + i;
        const pidx = idx * 4;
        const temp = gridWeights[idx] > 0 ? gridTemps[idx] / gridWeights[idx] : TEMP_MIN;
        const norm = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
        const clamped = Math.max(0, Math.min(1, norm));
        const alpha = 0.1 + clamped * 0.7;

        let r = 0, g = 0, b = 0;
        if (clamped < 0.33) {
          const f = clamped / 0.33;
          r = 0; g = f * 255; b = 255 * (1 - f);
        } else if (clamped < 0.66) {
          const f = (clamped - 0.33) / 0.33;
          r = f * 255; g = 255; b = 0;
        } else {
          const f = (clamped - 0.66) / 0.34;
          r = 255; g = 255 * (1 - f); b = 0;
        }

        data[pidx] = r;
        data[pidx + 1] = g;
        data[pidx + 2] = b;
        data[pidx + 3] = Math.floor(alpha * 255);
      }
    }

    this.texture.needsUpdate = true;
  }

  update(dt: number) {
    this.updateTimer += dt;
    if (this.updateTimer >= this.updateInterval) {
      this.updateTimer = 0;
      this.computeHeatmap();
    }
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = this.overlayOpacity;
  }

  setOpacity(val: number) {
    this.overlayOpacity = val;
  }

  handleMouseMove(event: MouseEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const nearestIdx = this.pointCloud.findNearestPoint(point, 10);
      if (nearestIdx >= 0) {
        const p = this.pointCloud.getPointAt(nearestIdx);
        const currentTemp = p.transitionProgress < 1
          ? p.temperature + (p.targetTemperature - p.temperature) * p.transitionProgress
          : p.temperature;
        this.tooltipEl.style.display = 'block';
        this.tooltipEl.style.left = (event.clientX + 12) + 'px';
        this.tooltipEl.style.top = (event.clientY - 20) + 'px';
        this.tooltipEl.textContent = currentTemp.toFixed(1) + '°C';
      } else {
        this.tooltipEl.style.display = 'none';
      }
    } else {
      this.tooltipEl.style.display = 'none';
    }
  }

  hideTooltip() {
    this.tooltipEl.style.display = 'none';
  }
}
