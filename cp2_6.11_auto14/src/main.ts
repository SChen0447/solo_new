import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioManager } from './visualizer/AudioManager';
import { ParticleSystem } from './visualizer/ParticleSystem';
import { ControlsPanel } from './ui/ControlsPanel';
import { createBloomComposer } from './utils/postProcessing';
import { ParticleMode } from './types';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

function main(): void {
  const container = document.getElementById('app') as HTMLElement;
  if (!container) {
    console.error('Container #app not found');
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0e27, 0.02);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1;
  controls.maxDistance = 15;
  controls.enablePan = false;

  const starsGeo = new THREE.BufferGeometry();
  const starCount = 800;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 30 + Math.random() * 30;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMat = new THREE.PointsMaterial({
    color: 0xccccff,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  const particleSystem = new ParticleSystem();
  particleSystem.init(scene);

  const composer: EffectComposer = createBloomComposer(renderer, scene, camera);

  const audioManager = new AudioManager(1024);
  const freqBuffer = new Uint8Array(512);

  let currentMode = ParticleMode.SPHERE;

  const controlsPanel = new ControlsPanel({
    onFileSelected: async (file: File) => {
      try {
        await audioManager.loadFile(file);
        particleSystem.setStatic();
      } catch (err) {
        controlsPanel.showError((err as Error).message);
      }
    },
    onPlayPause: () => {
      const state = audioManager.getState();
      if (!state.isLoaded) return;
      if (state.isPlaying) {
        audioManager.pause();
      } else {
        audioManager.play();
      }
    },
    onVolumeChange: (v: number) => {
      audioManager.setVolume(v);
    },
    onSeek: (time: number) => {
      audioManager.seek(time);
    },
    onModeToggle: () => {
      currentMode = currentMode === ParticleMode.SPHERE ? ParticleMode.BAR : ParticleMode.SPHERE;
      particleSystem.setMode(currentMode);
      controlsPanel.setMode(currentMode);
    }
  });
  controlsPanel.attach(container);
  controlsPanel.setMode(currentMode);

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    audioManager.getFrequencyData(freqBuffer);
    const state = audioManager.getState();

    if (state.isLoaded && state.isPlaying) {
      particleSystem.update(freqBuffer, dt);
    } else {
      particleSystem.setStatic();
    }

    stars.rotation.y += dt * 0.01;

    controls.update();
    composer.render();
    controlsPanel.setAudioState(state);
  }

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  window.addEventListener('beforeunload', () => {
    audioManager.dispose();
    particleSystem.dispose();
    renderer.dispose();
  });

  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
