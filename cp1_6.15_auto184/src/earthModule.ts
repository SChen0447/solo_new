import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import EventEmitter from 'eventemitter3';
import type { Station, PollutantType, Events, PollutantData } from './types';
import { POLLUTANT_MAX, POLLUTANT_COLORS } from './types';

const EARTH_RADIUS = 1.5;
const MIN_STATION_RADIUS = 0.1;
const MAX_STATION_RADIUS = 0.4;

export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getPollutantColor(value: number, type: PollutantType): THREE.Color {
  const max = POLLUTANT_MAX[type];
  const t = Math.min(value / max, 1);
  if (t < 0.5) {
    return new THREE.Color().lerpColors(
      new THREE.Color(0x00e676),
      new THREE.Color(0xffeb3b),
      t * 2
    );
  } else {
    return new THREE.Color().lerpColors(
      new THREE.Color(0xffeb3b),
      new THREE.Color(0xff1744),
      (t - 0.5) * 2
    );
  }
}

function createRadarCanvas(data: PollutantData, size = 100): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  const pollutants: PollutantType[] = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
  const angles = pollutants.map((_, i) => (i / 6) * Math.PI * 2 - Math.PI / 2);

  ctx.clearRect(0, 0, size, size);

  for (let level = 1; level <= 3; level++) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const idx = i % 6;
      const r = (radius * level) / 3;
      const x = centerX + Math.cos(angles[idx]) * r;
      const y = centerY + Math.sin(angles[idx]) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  pollutants.forEach((pollutant, i) => {
    const angle = angles[i];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.beginPath();
  pollutants.forEach((pollutant, i) => {
    const value = data[pollutant];
    const max = POLLUTANT_MAX[pollutant];
    const t = Math.min(value / max, 1);
    const r = radius * t;
    const angle = angles[i];
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(66, 165, 245, 0.4)';
  ctx.fill();
  ctx.strokeStyle = '#42a5f5';
  ctx.lineWidth = 2;
  ctx.stroke();

  pollutants.forEach((pollutant, i) => {
    const value = data[pollutant];
    const max = POLLUTANT_MAX[pollutant];
    const t = Math.min(value / max, 1);
    const r = radius * t;
    const angle = angles[i];
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = POLLUTANT_COLORS[pollutant];
    ctx.fill();
  });

  return canvas;
}

export class EarthModule {
  private emitter: EventEmitter<Events>;
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private earth: THREE.Mesh | null = null;
  private heatmapOverlay: THREE.Mesh | null = null;
  private stationsMesh: THREE.InstancedMesh | null = null;
  private stations: Station[] = [];
  private hoveredStation: Station | null = null;
  private currentPollutant: PollutantType = 'pm25';
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dummy: THREE.Object3D;
  private radarSprites: Map<string, THREE.Sprite> = new Map();
  private animationFrameId: number | null = null;
  private stars: THREE.Points | null = null;

  constructor(container: HTMLElement, emitter: EventEmitter<Events>) {
    this.container = container;
    this.emitter = emitter;
    this.dummy = new THREE.Object3D();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.95;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 10;
    this.controls.enablePan = false;

    this.initializeScene();
    this.setupEventListeners();
  }

  private initializeScene(): void {
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);

    this.createStars();
    this.createEarth();
    this.createStationsMesh();
  }

  private createStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i] = brightness;
      colors[i + 1] = brightness;
      colors[i + 2] = brightness;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private createEarth(): void {
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 800);
    gradient.addColorStop(0, '#1a4d7a');
    gradient.addColorStop(0.3, '#0d3a5c');
    gradient.addColorStop(0.6, '#0a2a47');
    gradient.addColorStop(1, '#051a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);

    ctx.fillStyle = '#2d5a3d';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 1024;
      const size = 50 + Math.random() * 200;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#3d7a4d';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 1024;
      const size = 20 + Math.random() * 80;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = 512 + (lat / 90) * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = 1024 + (lon / 180) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 10,
      specular: new THREE.Color(0x333333),
    });

    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    this.scene.add(this.earth);

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x42a5f5,
      transparent: true,
      opacity: 0.1,
      side: THREE.FrontSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(atmosphere);

    const glowGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.15, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x42a5f5,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);
  }

  private createStationsMesh(): void {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
    });

    this.stationsMesh = new THREE.InstancedMesh(geometry, material, 50);
    this.stationsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.stationsMesh);
  }

  private setupEventListeners(): void {
    this.emitter.on('AGGREGATE_DATA', this.handleAggregateData.bind(this));
    this.emitter.on('POLLUTANT_SWITCH', this.handlePollutantSwitch.bind(this));
    this.emitter.on('TIME_SCRUB', this.handleTimeScrub.bind(this));
    this.emitter.on('HEATMAP_UPDATED', this.handleHeatmapUpdated.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
  }

  private handleAggregateData(data: { stations: Station[]; timestamp: number }): void {
    this.stations = data.stations;
    this.updateStations();
  }

  private handlePollutantSwitch(pollutant: PollutantType): void {
    this.currentPollutant = pollutant;
    this.updateStations();
  }

  private handleTimeScrub(): void {
    this.updateStations();
  }

  private handleHeatmapUpdated(data: { texture: THREE.CanvasTexture }): void {
    if (!this.earth) return;

    if (!this.heatmapOverlay) {
      const geometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.005, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        map: data.texture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      this.heatmapOverlay = new THREE.Mesh(geometry, material);
      this.scene.add(this.heatmapOverlay);
    } else {
      const material = this.heatmapOverlay.material as THREE.MeshBasicMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.map = data.texture;
      material.needsUpdate = true;
    }
  }

  private updateStations(): void {
    if (!this.stationsMesh) return;

    this.stations.forEach((station, i) => {
      const position = latLonToVector3(station.lat, station.lon, EARTH_RADIUS * 1.01);
      const value = station.current[this.currentPollutant];
      const max = POLLUTANT_MAX[this.currentPollutant];
      const t = Math.min(value / max, 1);
      const radius = MIN_STATION_RADIUS + (MAX_STATION_RADIUS - MIN_STATION_RADIUS) * t;
      const color = getPollutantColor(value, this.currentPollutant);

      const isHovered = this.hoveredStation?.id === station.id;
      const scale = isHovered ? radius * 1.5 : radius;

      this.dummy.position.copy(position);
      this.dummy.position.normalize().multiplyScalar(EARTH_RADIUS * 1.01 + scale * 0.5);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();

      this.stationsMesh!.setMatrixAt(i, this.dummy.matrix);
      this.stationsMesh!.setColorAt(i, color);
    });

    this.stationsMesh.instanceMatrix.needsUpdate = true;
    if (this.stationsMesh.instanceColor) {
      this.stationsMesh.instanceColor.needsUpdate = true;
    }

    this.updateRadarSprites();
  }

  private updateRadarSprites(): void {
    if (!this.hoveredStation) {
      this.radarSprites.forEach((sprite) => this.scene.remove(sprite));
      this.radarSprites.clear();
      return;
    }

    const station = this.hoveredStation;
    let sprite = this.radarSprites.get(station.id);

    if (!sprite) {
      this.radarSprites.forEach((s) => this.scene.remove(s));
      this.radarSprites.clear();

      const canvas = createRadarCanvas(station.current);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
      });

      sprite = new THREE.Sprite(material);
      sprite.scale.set(0.5, 0.5, 1);
      this.radarSprites.set(station.id, sprite);
      this.scene.add(sprite);
    }

    const position = latLonToVector3(station.lat, station.lon, EARTH_RADIUS * 1.01);
    position.normalize().multiplyScalar(EARTH_RADIUS * 1.01 + 0.3);
    sprite.position.copy(position);
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (!this.stationsMesh || this.stations.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.stationsMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const station = this.stations[instanceId];
        if (this.hoveredStation?.id !== station.id) {
          this.hoveredStation = station;
          this.updateStations();
          this.emitter.emit('STATION_HOVER', {
            station,
            screenX: event.clientX,
            screenY: event.clientY,
          });
        } else {
          this.emitter.emit('STATION_HOVER', {
            station,
            screenX: event.clientX,
            screenY: event.clientY,
          });
        }
      }
    } else if (this.hoveredStation) {
      this.hoveredStation = null;
      this.updateStations();
      this.emitter.emit('STATION_HOVER', {
        station: null,
        screenX: event.clientX,
        screenY: event.clientY,
      });
    }
  }

  private handleClick(event: MouseEvent): void {
    if (!this.stationsMesh || this.stations.length === 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.stationsMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const station = this.stations[instanceId];
        this.emitter.emit('STATION_CLICK', station);
      }
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();

      if (this.stars) {
        this.stars.rotation.y += 0.0001;
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('click', this.handleClick.bind(this));
    this.renderer.dispose();
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
