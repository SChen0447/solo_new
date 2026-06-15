import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantSculpture } from './plant-sculpture';
import { DataProbe } from './data-probe';
import { HistoryPanel } from './history-panel';
import { PlantDataPoint } from './utils';
import './styles.css';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let plantSculpture: PlantSculpture;
let dataProbe: DataProbe;
let historyPanel: HistoryPanel;
let ws: WebSocket;
let lastTime = 0;
let currentData: PlantDataPoint | null = null;

const clock = new THREE.Clock();

function initScene(): void {
  const container = document.getElementById('scene-container') as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d1a);
  scene.fog = new THREE.Fog(0x0d0d1a, 8, 20);

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(4, 3, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 + 0.3;
  controls.target.set(0, 1.5, 0);

  setupLights();

  plantSculpture = new PlantSculpture(scene);
  dataProbe = new DataProbe(renderer, camera, plantSculpture);
  historyPanel = new HistoryPanel();

  window.addEventListener('resize', onWindowResize);
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0x1a1a4e, 0.4);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
  pointLight.position.set(-5, 6, 4);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 1024;
  pointLight.shadow.mapSize.height = 1024;
  pointLight.shadow.camera.near = 0.5;
  pointLight.shadow.camera.far = 20;
  pointLight.shadow.bias = -0.001;
  scene.add(pointLight);

  const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.3);
  fillLight.position.set(3, 2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x7c3aed, 0.2);
  rimLight.position.set(0, 3, -5);
  scene.add(rimLight);
}

function onWindowResize(): void {
  const container = document.getElementById('scene-container') as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function initWebSocket(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data: PlantDataPoint = JSON.parse(event.data);
      currentData = data;
      handleNewData(data);
    } catch (error) {
      console.error('Failed to parse WebSocket data:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, retrying...');
    setTimeout(initWebSocket, 2000);
  };
}

function handleNewData(data: PlantDataPoint): void {
  historyPanel.addDataPoint(data);
  dataProbe.updateData(data);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (currentData) {
    plantSculpture.update(currentData, deltaTime);
  }

  controls.update();
  renderer.render(scene, camera);
}

function setupSidebarToggle(): void {
  const sidebar = document.getElementById('sidebar') as HTMLElement;
  const toggleBtn = document.getElementById('toggle-sidebar') as HTMLElement;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

function setupMobileDrag(): void {
  const sidebar = document.getElementById('sidebar') as HTMLElement;
  const handle = document.querySelector('.mobile-handle') as HTMLElement;

  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  const isMobile = window.innerWidth <= 768;

  if (!isMobile) return;

  sidebar.classList.add('collapsed');

  handle.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    const rect = sidebar.getBoundingClientRect();
    startTop = rect.top;
    sidebar.style.transition = 'none';
  });

  handle.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaY = e.touches[0].clientY - startY;
    const newTop = Math.min(window.innerHeight - 24, Math.max(0, startTop + deltaY));

    sidebar.style.transform = `translateY(${newTop - window.innerHeight + sidebar.offsetHeight}px)`;
  });

  handle.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;

    sidebar.style.transition = '';

    const rect = sidebar.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const sidebarHeight = sidebar.offsetHeight;

    if (rect.top < viewportHeight / 2) {
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('expanded');
      sidebar.style.transform = '';
    } else {
      sidebar.classList.add('collapsed');
      sidebar.classList.remove('expanded');
      sidebar.style.transform = '';
    }
  });
}

function init(): void {
  initScene();
  initWebSocket();
  setupSidebarToggle();
  setupMobileDrag();
  animate();
}

document.addEventListener('DOMContentLoaded', init);
