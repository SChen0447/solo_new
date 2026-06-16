import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { uiStyles } from './uiStyles';
import { SolarSystem, PlanetObject } from './solarSystem';
import { ControlPanel } from './controls';
import { InfoPanel } from './infoPanel';

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = uiStyles;
  document.head.appendChild(style);
}

function createStardust(): void {
  const createSide = (side: 'left' | 'right') => {
    const container = document.createElement('div');
    container.className = `stardust-${side}`;
    const count = 100;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'stardust-particle';
      const size = 1 + Math.random() * 2;
      const opacity = 0.3 + Math.random() * 0.3;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.opacity = opacity.toString();
      particle.style.animationDelay = `${Math.random() * 8}s`;
      particle.style.animationDuration = `${6 + Math.random() * 4}s`;
      container.appendChild(particle);
    }

    document.body.appendChild(container);
  };

  createSide('left');
  createSide('right');
}

function init(): void {
  injectStyles();
  createStardust();

  const appContainer = document.getElementById('app') as HTMLDivElement;
  if (!appContainer) {
    console.error('Root container #app not found');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1b2a);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 40, 70);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  appContainer.appendChild(renderer.domElement);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.minDistance = 10;
  orbitControls.maxDistance = 300;

  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.PointLight(0xffffff, 2, 500);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const solarSystem = new SolarSystem(scene);

  const controlPanel = new ControlPanel({
    solarSystem,
    camera,
    onTimeScaleChange: (scale: number) => {
      solarSystem.timeScale = scale;
    }
  });

  const planetMeshes = solarSystem.planets.map((p: PlanetObject) => p.mesh);
  new InfoPanel(camera, planetMeshes);

  const clock = new THREE.Clock();
  let lastUpdateTime = 0;

  const animate = (): void => {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    if (currentTime - lastUpdateTime >= 16.6) {
      const deltaTime = clock.getDelta();
      solarSystem.update(deltaTime);
      lastUpdateTime = currentTime;
    }

    orbitControls.update();
    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
