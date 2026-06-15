import * as THREE from 'three';
import { SceneRenderer } from './sceneRenderer';
import { InteractionController } from './interactionController';
import { eventBus } from './eventBus';
import { initFileUpload } from './dataParser';
import type { MoleculeData } from './dataParser';

function setupUI(): void {
  eventBus.on('molecule-parsed', (data) => {
    const mol = data as MoleculeData;
    const info = document.getElementById('mol-info');
    if (info) {
      info.textContent = `${mol.name} | ${mol.atoms.length} atoms`;
      info.style.display = 'block';
    }
    const dropZone = document.getElementById('drop-zone')!;
    dropZone.style.display = 'none';
    const loading = document.getElementById('loading-overlay')!;
    loading.style.display = 'none';
  });

  eventBus.on('parse-progress', (data) => {
    const d = data as { percent: number };
    const progressBar = document.getElementById('progress-bar')!;
    const progressText = document.getElementById('progress-text')!;
    progressBar.style.width = `${d.percent}%`;
    progressText.textContent = `${d.percent}%`;
    const loading = document.getElementById('loading-overlay')!;
    loading.style.display = 'flex';
  });

  eventBus.on('parse-error', (data) => {
    const d = data as { message: string };
    const errorEl = document.getElementById('error-message')!;
    errorEl.textContent = d.message;
    errorEl.style.display = 'block';
    const loading = document.getElementById('loading-overlay')!;
    loading.style.display = 'none';
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  });

  eventBus.on('atom-selected', (data) => {
    const d = data as {
      element: string;
      index: number;
      position: { x: string; y: string; z: string };
      connections: number;
    };
    const panel = document.getElementById('atom-info-panel')!;
    panel.style.display = 'block';
    document.getElementById('atom-element')!.textContent = d.element;
    document.getElementById('atom-index')!.textContent = String(d.index + 1);
    document.getElementById('atom-coords')!.textContent = `(${d.position.x}, ${d.position.y}, ${d.position.z})`;
    document.getElementById('atom-connections')!.textContent = String(d.connections);
  });

  eventBus.on('atom-deselected', () => {
    const panel = document.getElementById('atom-info-panel')!;
    panel.style.display = 'none';
  });

  const mobileToggle = document.getElementById('mobile-panel-toggle');
  const infoPanel = document.getElementById('info-panel');
  if (mobileToggle && infoPanel) {
    mobileToggle.addEventListener('click', () => {
      infoPanel.classList.toggle('mobile-open');
      mobileToggle.classList.toggle('active');
    });
  }
}

async function main(): Promise<void> {
  const canvas = document.getElementById('mol-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const scene = new THREE.Scene();

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 0, 20);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
  directionalLight.position.set(10, 15, 10);
  scene.add(directionalLight);

  const directionalLight2 = new THREE.DirectionalLight(0x8080ff, 0.5);
  directionalLight2.position.set(-10, -5, -10);
  scene.add(directionalLight2);

  const sceneRenderer = new SceneRenderer(scene);
  const interactionController = new InteractionController(camera, canvas, sceneRenderer, canvas);

  setupUI();
  initFileUpload();

  function onResize(): void {
    const container = document.getElementById('viewport-container');
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', onResize);
  onResize();

  function animate(time: number): void {
    requestAnimationFrame(animate);
    interactionController.update();
    sceneRenderer.updateStarField(time);
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

main().catch(console.error);
