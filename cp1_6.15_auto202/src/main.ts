import * as THREE from 'three';
import { createCrystalTower, CrystalTower, MetricType } from './crystalTower';
import { startDataCollection, updateData, getCurrentData, PerformanceData, isUpdatePaused } from './dataManager';
import { createUI } from './ui';

const METRIC_TYPES: MetricType[] = ['fps', 'cpu', 'memory', 'network', 'frameTime', 'gpu'];

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let container: HTMLElement;
let towers: CrystalTower[] = [];
let baseRing: THREE.Mesh;
let stars: THREE.Points;
let ui: ReturnType<typeof createUI>;
let baseRotation = 0;

function init(): void {
  container = document.getElementById('canvas-container') as HTMLElement;
  
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 2, 0);
  
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a1a, 1);
  container.appendChild(renderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
  pointLight.position.set(5, 10, 5);
  scene.add(pointLight);
  
  createBaseRing();
  createStars();
  createTowers();
  
  startDataCollection();
  
  ui = createUI({
    camera,
    towers,
    container
  });
  
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('snapshotUpdate', onSnapshotUpdate as EventListener);
  
  animate();
}

function createBaseRing(): void {
  const ringGeometry = new THREE.RingGeometry(2.8, 3.2, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.03,
    side: THREE.DoubleSide
  });
  baseRing = new THREE.Mesh(ringGeometry, ringMaterial);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.01;
  scene.add(baseRing);
}

function createStars(): void {
  const starCount = 200;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount; i++) {
    const radius = 15 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 5;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    
    const brightness = 0.3 + Math.random() * 0.7;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }
  
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const starMaterial = new THREE.PointsMaterial({
    size: 0.08,
    transparent: true,
    opacity: 0.8,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

function getTowerSpacing(): number {
  return window.innerWidth < 768 ? 2 : 3;
}

function createTowers(): void {
  const spacing = getTowerSpacing();
  const radius = spacing * 0.8;
  
  METRIC_TYPES.forEach((metric, index) => {
    const angle = (index / METRIC_TYPES.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    const initialValues: Record<MetricType, number> = {
      fps: 60,
      cpu: 30,
      memory: 40,
      network: 80,
      frameTime: 16,
      gpu: 35
    };
    
    const tower = createCrystalTower(metric, initialValues[metric]);
    tower.mesh.position.set(x, 0, z);
    towers.push(tower);
    scene.add(tower.mesh);
  });
}

function updateTowerPositions(): void {
  const spacing = getTowerSpacing();
  const radius = spacing * 0.8;
  
  towers.forEach((tower, index) => {
    const angle = (index / METRIC_TYPES.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    tower.mesh.position.x = x;
    tower.mesh.position.z = z;
  });
}

function updateTowers(data: PerformanceData, isSnapshot: boolean = false): void {
  towers.forEach(tower => {
    const value = data[tower.metric];
    tower.update(value, isSnapshot);
  });
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateTowerPositions();
}

function onSnapshotUpdate(event: CustomEvent<{ data: PerformanceData }>): void {
  const { data } = event.detail;
  updateTowers(data, true);
  ui.updateFPS(data.fps);
}

function animate(): void {
  requestAnimationFrame(animate);
  
  const frameStart = performance.now();
  
  let data: PerformanceData;
  if (!isUpdatePaused()) {
    data = updateData();
    updateTowers(data, false);
    ui.updateFPS(data.fps);
  } else {
    data = getCurrentData();
  }
  
  baseRotation += 0.001;
  baseRing.rotation.z = baseRotation;
  stars.rotation.y += 0.0003;
  
  ui.update();
  
  renderer.render(scene, camera);
  
  const frameTime = performance.now() - frameStart;
  if (frameTime > 8) {
    console.warn(`Frame exceeded budget: ${frameTime.toFixed(2)}ms`);
  }
}

init();
