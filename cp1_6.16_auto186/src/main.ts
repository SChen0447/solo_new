import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadModel } from './modelLoader';
import { AnnotationSystem, showInfoCard, hideInfoCard } from './annotationSystem';

const container = document.getElementById('canvas-container')!;
const loadingBar = document.getElementById('loading-bar')!;
const btnAutoRotate = document.getElementById('btn-autorotate')!;
const btnReset = document.getElementById('btn-reset')!;
const cardClose = document.getElementById('card-close')!;

const scene = new THREE.Scene();

const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d')!;
const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#1a1a2e');
gradient.addColorStop(1, '#16213e');
bgCtx.fillStyle = gradient;
bgCtx.fillRect(0, 0, 2, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const initialCameraPos = new THREE.Vector3(6, 4, 6);
const initialCameraTarget = new THREE.Vector3(0, 1, 0);
camera.position.copy(initialCameraPos);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

const backLight = new THREE.DirectionalLight(0x6688cc, 0.2);
backLight.position.set(-3, 4, -5);
scene.add(backLight);

const gridHelper = new THREE.GridHelper(20, 40, 0x888888, 0x888888);
const gridMat = gridHelper.material as THREE.Material;
gridMat.transparent = true;
gridMat.opacity = 0.3;
gridHelper.position.y = -4;
scene.add(gridHelper);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;
controls.minDistance = 0.5;
controls.maxDistance = 5;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;
controls.target.copy(initialCameraTarget);
controls.enablePan = false;

let annotationSystem: AnnotationSystem | null = null;
let modelGroup: THREE.Group | null = null;
let isIntroAnimating = false;
let introStartTime = 0;
const introDuration = 2.0;

let autoRotateEnabled = true;
let lastInteractionTime = 0;
const autoRotateDelay = 5000;

let isResettingCamera = false;
let resetStartTime = 0;
const resetDuration = 0.5;
let resetFromPos = new THREE.Vector3();
let resetFromTarget = new THREE.Vector3();

controls.addEventListener('start', () => {
  lastInteractionTime = performance.now();
  if (autoRotateEnabled && !isIntroAnimating) {
    controls.autoRotate = false;
  }
});

controls.addEventListener('end', () => {
  lastInteractionTime = performance.now();
});

btnAutoRotate.addEventListener('click', () => {
  autoRotateEnabled = !autoRotateEnabled;
  btnAutoRotate.classList.toggle('active', autoRotateEnabled);
  controls.autoRotate = autoRotateEnabled;
});

btnReset.addEventListener('click', () => {
  isResettingCamera = true;
  resetStartTime = performance.now() / 1000;
  resetFromPos.copy(camera.position);
  resetFromTarget.copy(controls.target);
  controls.autoRotate = false;
});

cardClose.addEventListener('click', () => {
  hideInfoCard();
});

function animateIntro(now: number): void {
  if (!modelGroup || !isIntroAnimating) return;

  const elapsed = now - introStartTime;
  const t = Math.min(elapsed / introDuration, 1);

  const eased = 1 - Math.pow(1 - t, 3);
  modelGroup.rotation.y = eased * Math.PI * 2;

  if (t >= 1) {
    isIntroAnimating = false;
    modelGroup.rotation.y = 0;
    controls.autoRotate = autoRotateEnabled;
  }
}

function animateReset(now: number): void {
  if (!isResettingCamera) return;

  const elapsed = now - resetStartTime;
  const t = Math.min(elapsed / resetDuration, 1);

  const eased = 1 - Math.pow(1 - t, 3);

  camera.position.lerpVectors(resetFromPos, initialCameraPos, eased);
  controls.target.lerpVectors(resetFromTarget, initialCameraTarget, eased);

  if (t >= 1) {
    isResettingCamera = false;
    controls.autoRotate = autoRotateEnabled;
  }
}

function checkAutoRotate(): void {
  if (!autoRotateEnabled || isIntroAnimating || isResettingCamera) return;

  const timeSinceInteraction = performance.now() - lastInteractionTime;
  if (timeSinceInteraction > autoRotateDelay && !controls.autoRotate) {
    controls.autoRotate = true;
  }
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const now = clock.getElapsedTime();

  animateIntro(now);
  animateReset(now);
  checkAutoRotate();

  if (annotationSystem) {
    annotationSystem.update();
  }

  controls.update();
  renderer.render(scene, camera);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

loadModel((percent) => {
  loadingBar.style.width = `${percent}%`;
}).then(({ scene: model, annotations }) => {
  modelGroup = model;
  scene.add(model);

  loadingBar.style.width = '100%';
  setTimeout(() => {
    loadingBar.classList.add('done');
  }, 300);

  annotationSystem = new AnnotationSystem(scene, camera);
  annotationSystem.initAnnotations(model, annotations);
  annotationSystem.setOnAnnotationClick((data) => {
    showInfoCard(data);
  });

  isIntroAnimating = true;
  introStartTime = clock.getElapsedTime();
  controls.autoRotate = false;

  animate();
});
