import * as THREE from 'three';
import { AudioData } from './audioAnalyzer';

export type VisualStyle = 'galaxy' | 'fire' | 'water';

export interface ParticleScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  particles: THREE.Points;
  velocities: Float32Array;
  basePositions: Float32Array;
  particleCount: number;
  style: VisualStyle;
  rotationSpeed: number;
  hueOffset: number;
  startTime: number;
}

const PARTICLE_COUNT = 2000;
const SPHERE_RADIUS = 8;
const DAMPING = 0.95;

function hslToRgb(h: number, s: number, l: number): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(h, s, l);
  return color;
}

function getStyleColors(style: VisualStyle, t: number, frequency: number): THREE.Color {
  const hue = ((t * 36) % 360) / 360;
  
  switch (style) {
    case 'galaxy': {
      const baseHue = (hue * 0.3 + 0.7) % 1;
      return hslToRgb(baseHue, 0.8, 0.5 + frequency * 0.3);
    }
    case 'fire': {
      const fireHue = 0.08 + Math.sin(hue * Math.PI * 2) * 0.05;
      return hslToRgb(fireHue, 1, 0.4 + frequency * 0.4);
    }
    case 'water': {
      const waterHue = 0.5 + Math.sin(hue * Math.PI * 2) * 0.1;
      return hslToRgb(waterHue, 0.7, 0.4 + frequency * 0.3);
    }
    default:
      return hslToRgb(hue, 0.8, 0.5);
  }
}

function getForceDirection(
  style: VisualStyle,
  position: THREE.Vector3,
  lowFreq: number,
  midFreq: number,
  highFreq: number
): THREE.Vector3 {
  const dir = position.clone().normalize();
  const dist = position.length();
  
  switch (style) {
    case 'galaxy': {
      const outward = lowFreq * 2.5;
      const inward = highFreq * 1.5;
      const spiral = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.5).normalize();
      return dir.multiplyScalar(outward - inward).add(spiral.multiplyScalar(midFreq * 0.5));
    }
    case 'fire': {
      const upward = new THREE.Vector3(0, 1, 0);
      const outwardForce = dir.multiplyScalar(lowFreq * 1.5);
      const upwardForce = upward.multiplyScalar(midFreq * 3 + highFreq * 2);
      const turbulence = new THREE.Vector3(
        (Math.random() - 0.5) * highFreq * 2,
        (Math.random() - 0.5) * highFreq,
        (Math.random() - 0.5) * highFreq * 2
      );
      return outwardForce.add(upwardForce).add(turbulence);
    }
    case 'water': {
      const waveForce = new THREE.Vector3(
        Math.sin(dist * 2 + Date.now() * 0.002) * midFreq,
        Math.cos(dist * 1.5 + Date.now() * 0.003) * lowFreq * 0.5,
        Math.sin(dist * 2.5 + Date.now() * 0.0025) * midFreq
      );
      const centerPull = dir.multiplyScalar(-highFreq * 2);
      return waveForce.add(centerPull);
    }
    default:
      return dir.multiplyScalar(lowFreq - highFreq);
  }
}

export function createParticleScene(container: HTMLElement, style: VisualStyle = 'galaxy'): ParticleScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 15;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const particleCount = PARTICLE_COUNT;
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * SPHERE_RADIUS;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;

    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;

    const color = hslToRgb(Math.random(), 0.8, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 2 + Math.random() * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const handleResize = () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    particles,
    velocities,
    basePositions,
    particleCount,
    style,
    rotationSpeed: 0.002,
    hueOffset: 0,
    startTime: Date.now()
  };
}

export function updateParticles(
  particleScene: ParticleScene,
  audioData: AudioData,
  deltaTime: number
): void {
  const { particles, velocities, basePositions, particleCount, style } = particleScene;
  const positionAttribute = particles.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colorAttribute = particles.geometry.getAttribute('color') as THREE.BufferAttribute;
  const sizeAttribute = particles.geometry.getAttribute('size') as THREE.BufferAttribute;
  const positions = positionAttribute.array as Float32Array;
  const colors = colorAttribute.array as Float32Array;
  const sizes = sizeAttribute.array as Float32Array;

  const elapsed = (Date.now() - particleScene.startTime) / 1000;
  particleScene.hueOffset = (elapsed / 10) % 1;

  const { lowFrequency, midFrequency, highFrequency, volume } = audioData;
  const overallEnergy = (lowFrequency + midFrequency + highFrequency) / 3;

  particles.rotation.y += particleScene.rotationSpeed * (1 + overallEnergy * 0.5);
  particles.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

  const tempPos = new THREE.Vector3();
  const tempForce = new THREE.Vector3();

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    tempPos.set(
      positions[i3],
      positions[i3 + 1],
      positions[i3 + 2]
    );

    const basePos = new THREE.Vector3(
      basePositions[i3],
      basePositions[i3 + 1],
      basePositions[i3 + 2]
    );

    const toBase = basePos.clone().sub(tempPos);
    const springForce = toBase.multiplyScalar(0.02);

    const audioForce = getForceDirection(style, tempPos, lowFrequency, midFrequency, highFrequency);
    tempForce.copy(springForce).add(audioForce);

    velocities[i3] = (velocities[i3] + tempForce.x * deltaTime * 60) * DAMPING;
    velocities[i3 + 1] = (velocities[i3 + 1] + tempForce.y * deltaTime * 60) * DAMPING;
    velocities[i3 + 2] = (velocities[i3 + 2] + tempForce.z * deltaTime * 60) * DAMPING;

    positions[i3] += velocities[i3] * deltaTime * 60;
    positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 60;
    positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 60;

    const dist = tempPos.length();
    const freqIndex = Math.floor((dist / SPHERE_RADIUS) * audioData.frequencyData.length * 0.3);
    const particleFreq = freqIndex < audioData.frequencyData.length 
      ? Math.max(0, Math.min(1, (audioData.frequencyData[freqIndex] + 100) / 90))
      : 0;

    const particleHue = (particleScene.hueOffset + (i / particleCount)) % 1;
    const color = getStyleColors(style, particleHue, particleFreq);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    const baseSize = 2;
    const sizeVariation = (lowFrequency * 4) - (highFrequency * 2);
    sizes[i] = Math.max(1, Math.min(6, baseSize + sizeVariation + particleFreq * 2));
  }

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  sizeAttribute.needsUpdate = true;

  (particles.material as THREE.PointsMaterial).size = 3 + volume * 3;

  particleScene.renderer.render(particleScene.scene, particleScene.camera);
}

export function resetParticles(particleScene: ParticleScene, newStyle: VisualStyle): void {
  particleScene.style = newStyle;
  const positions = particleScene.particles.geometry.getAttribute('position').array as Float32Array;

  for (let i = 0; i < particleScene.particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * SPHERE_RADIUS;

    const i3 = i * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    particleScene.basePositions[i3] = positions[i3];
    particleScene.basePositions[i3 + 1] = positions[i3 + 1];
    particleScene.basePositions[i3 + 2] = positions[i3 + 2];

    particleScene.velocities[i3] = 0;
    particleScene.velocities[i3 + 1] = 0;
    particleScene.velocities[i3 + 2] = 0;
  }

  (particleScene.particles.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  particleScene.startTime = Date.now();
}

export function destroyParticleScene(particleScene: ParticleScene): void {
  particleScene.renderer.dispose();
  particleScene.particles.geometry.dispose();
  (particleScene.particles.material as THREE.Material).dispose();
  if (particleScene.renderer.domElement.parentNode) {
    particleScene.renderer.domElement.parentNode.removeChild(particleScene.renderer.domElement);
  }
}
