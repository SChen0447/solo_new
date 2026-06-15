import * as THREE from 'three';
import { SceneBuilder } from './sceneBuilder';
import { HeatmapRenderer } from './heatmapRenderer';
import { UIController } from './uiController';
import { parseData } from './dataParser';
import { eventBus } from './eventBus';
import type { RawDataset, TimePeriod } from './types';
import { generateMockData } from './mockData';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let heatmapRenderer: HeatmapRenderer;
let uiController: UIController;
let rawData: RawDataset;
let currentPeriod: TimePeriod = 'morning';
let clock: THREE.Clock;

function init(): void {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  clock = new THREE.Clock();

  new SceneBuilder(scene, camera, renderer);
  heatmapRenderer = new HeatmapRenderer();
  uiController = new UIController();

  eventBus.on('time-changed', handleTimeChanged);

  window.addEventListener('resize', onWindowResize);

  loadData();
}

function loadData(): void {
  rawData = generateMockData();
  
  setTimeout(() => {
    const snapshot = parseData(rawData, currentPeriod);
    eventBus.emit('data-ready', snapshot);
    
    setTimeout(() => {
      hideLoadingScreen();
    }, 300);
  }, 500);
}

function handleTimeChanged(period: TimePeriod): void {
  currentPeriod = period;
  const snapshot = parseData(rawData, period);
  eventBus.emit('data-ready', snapshot);
}

function hideLoadingScreen(): void {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      if (loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
      }
    }, 500);
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  uiController.update();
  heatmapRenderer.update(deltaTime);

  renderer.render(scene, camera);
}

init();
animate();
