import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBrainWaveStore } from '../stores/brainWaveStore';
import {
  generateParticleData,
  frequencyToRadiusScale,
  PARTICLE_CONFIG
} from '../utils/particleUtils';

const { PARTICLE_COUNT, PULSE_AMPLITUDE, COLOR_TRANSITION_DURATION } = PARTICLE_CONFIG;

function ParticleCloud() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particleData = useMemo(() => generateParticleData(), []);
  const currentColor = useRef(new THREE.Color(0x4a90d9));
  const targetColor = useRef(new THREE.Color(0x4a90d9));
  const currentOpacity = useRef(0.45);
  const targetOpacity = useRef(0.45);
  const currentFrequency = useRef(10);
  const targetFrequency = useRef(10);

  const {
    frequency,
    particleColor,
    opacity,
    zoom,
    rotationY,
    rotationX,
    setZoom,
    setRotation
  } = useBrainWaveStore();

  const { camera, gl } = useThree();

  useEffect(() => {
    targetColor.current.setRGB(
      particleColor.r / 255,
      particleColor.g / 255,
      particleColor.b / 255
    );
    targetOpacity.current = opacity;
    targetFrequency.current = frequency;
  }, [particleColor, opacity, frequency]);

  useEffect(() => {
    camera.position.z = 8 / zoom;
  }, [zoom, camera]);

  useEffect(() => {
    const radY = (rotationY * Math.PI) / 180;
    const radX = (rotationX * Math.PI) / 180;
    const distance = 8 / zoom;
    camera.position.x = Math.sin(radY) * Math.cos(radX) * distance;
    camera.position.y = Math.sin(radX) * distance;
    camera.position.z = Math.cos(radY) * Math.cos(radX) * distance;
    camera.lookAt(0, 0, 0);
  }, [rotationY, rotationX, zoom, camera]);

  useEffect(() => {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let accumulatedY = rotationY;
    let accumulatedX = rotationX;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      accumulatedY += (deltaX / 10) * 8;
      accumulatedX -= (deltaY / 10) * 8;
      accumulatedX = Math.max(-25, Math.min(25, accumulatedX));
      setRotation(accumulatedY, accumulatedX);
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, setRotation, setZoom, zoom, rotationY, rotationX]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    currentColor.current.lerp(targetColor.current, delta / COLOR_TRANSITION_DURATION);
    currentOpacity.current += (targetOpacity.current - currentOpacity.current) * Math.min(delta / 2, 1);
    currentFrequency.current += (targetFrequency.current - currentFrequency.current) * Math.min(delta * 3, 1);

    const radiusScale = frequencyToRadiusScale(currentFrequency.current);
    const freq = currentFrequency.current;

    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.color.copy(currentColor.current);
      meshRef.current.material.opacity = currentOpacity.current;
    }

    const time = performance.now() * 0.001;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseRadius = particleData.baseRadii[i] * radiusScale;
      const pulsePhase = freq * time * Math.PI * 2 + particleData.randomOffsets[i];
      const pulse = 1 + Math.sin(pulsePhase) * PULSE_AMPLITUDE;
      const scaledRadius = baseRadius * pulse;

      dummy.position.set(
        particleData.positions[i * 3],
        particleData.positions[i * 3 + 1],
        particleData.positions[i * 3 + 2]
      );
      dummy.scale.setScalar(scaledRadius);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x4a90d9,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, PARTICLE_COUNT]}
      frustumCulled={false}
    />
  );
}

function ParticleScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0b0b1a', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <ParticleCloud />
    </Canvas>
  );
}

export default ParticleScene;
