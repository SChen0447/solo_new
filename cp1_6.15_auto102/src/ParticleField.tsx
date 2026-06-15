import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { ParticleSystem } from './ParticleSystem';
import { useStore } from './store';
import { ParticleType, BOUNDS, DEFAULTS } from './types';

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float size;
  attribute float opacity;
  attribute float rotation;
  attribute float particleType;
  varying float vOpacity;
  varying float vParticleType;
  varying float vRotation;
  varying vec2 vPointCoord;

  void main() {
    vOpacity = opacity;
    vParticleType = particleType;
    vRotation = rotation;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float psize = size * 300.0 / -mvPosition.z;
    if (particleType < 0.5) psize *= 1.2;
    else if (particleType < 1.5) psize *= 0.6;
    else psize *= 1.6;
    gl_PointSize = psize;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 highlightColor;
  uniform float highlightIndex;
  uniform float highlightScale;

  varying float vOpacity;
  varying float vParticleType;
  varying float vRotation;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float rot = vRotation;
    mat2 rm = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    vec2 ruv = rm * uv;

    float alpha = 0.0;
    if (vParticleType < 0.5) {
      float bar = 1.0 - smoothstep(0.0, 0.06, abs(ruv.x)) *
                         smoothstep(0.0, 0.45, abs(ruv.y));
      alpha = clamp(bar, 0.0, 1.0) * vOpacity * 0.85;
    } else if (vParticleType < 1.5) {
      float d = length(uv);
      float c = 1.0 - smoothstep(0.0, 0.48, d);
      alpha = clamp(c, 0.0, 1.0) * vOpacity;
    } else {
      float d = length(ruv * 1.4);
      float blob = 1.0 - smoothstep(0.0, 0.55, d);
      blob *= 0.6 + 0.4 * sin(ruv.x * 10.0) * cos(ruv.y * 10.0);
      alpha = clamp(blob, 0.0, 1.0) * vOpacity * 0.75;
    }

    vec3 col = color;
    if (highlightScale > 0.01) {
      col = mix(col, highlightColor, highlightScale);
    }
    gl_FragColor = vec4(col, alpha);
    if (alpha < 0.02) discard;
  }
`;

const MAX_POOL = 2000;

export default function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const systemRef = useRef<ParticleSystem | null>(null);
  const hoveredIndexRef = useRef<number>(-1);
  const hoverScaleRef = useRef<Float32Array>(new Float32Array(MAX_POOL));
  const { camera, size, gl } = useThree();

  const climate = useStore((s) => s.climate);
  const terrain = useStore((s) => s.terrain);
  const setHover = useStore((s) => s.setHover);
  const setParticleCounts = useStore((s) => s.setParticleCounts);
  const climateRef = useRef(climate);
  climateRef.current = climate;

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseVec = useMemo(() => new THREE.Vector2(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);

  const hoverFadeRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      highlightColor: { value: new THREE.Color(0xffffff) },
      highlightIndex: { value: -1.0 },
      highlightScale: { value: new Float32Array(MAX_POOL) }
    }),
    []
  );

  useEffect(() => {
    const sys = new ParticleSystem({ ...DEFAULTS });
    systemRef.current = sys;
    if (terrain) sys.setTerrain(terrain);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sys.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(sys.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sys.sizes, 1));
    geo.setAttribute('opacity', new THREE.BufferAttribute(sys.opacities, 1));
    geo.setAttribute('rotation', new THREE.BufferAttribute(sys.rotations, 1));
    geo.setAttribute(
      'particleType',
      new THREE.BufferAttribute(sys.typesArr, 1)
    );
    geometryRef.current = geo;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER
    });
    materialRef.current = mat;

    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [uniforms]);

  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setClimateParams(climate);
    }
  }, [climate]);

  useEffect(() => {
    if (systemRef.current && terrain) {
      systemRef.current.setTerrain(terrain);
    }
  }, [terrain]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let countTimer = 0;

    const onPointerMove = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      mouseVec.set(x, y);

      if (!pointsRef.current || !systemRef.current) return;
      raycaster.setFromCamera(mouseVec, camera);
      raycaster.params.Points = { threshold: 0.18 };

      const intersects = raycaster.intersectObject(pointsRef.current, false);
      if (intersects.length > 0) {
        const idx = intersects[0].index ?? -1;
        const p = systemRef.current.getParticleAt(idx);
        if (p && p.active) {
          hoveredIndexRef.current = idx;
          hoverFadeRef.current = 1;
          worldPos.copy(p.position);
          projected.copy(worldPos).project(camera);
          const sx = ((projected.x + 1) / 2) * size.width;
          const sy = ((-projected.y + 1) / 2) * size.height;
          setHover({
            type: p.type,
            index: idx,
            screenX: sx,
            screenY: sy
          });
        } else {
          hoveredIndexRef.current = -1;
          setHover({ type: null, index: -1, screenX: 0, screenY: 0 });
        }
      } else {
        hoveredIndexRef.current = -1;
        setHover({ type: null, index: -1, screenX: 0, screenY: 0 });
      }
    };

    const onPointerLeave = () => {
      hoveredIndexRef.current = -1;
      setHover({ type: null, index: -1, screenX: 0, screenY: 0 });
    };

    gl.domElement.addEventListener('pointermove', onPointerMove);
    gl.domElement.addEventListener('pointerleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [camera, gl, mouseVec, raycaster, setHover, size.height, size.width]);

  useFrame((_, delta) => {
    const sys = systemRef.current;
    const geo = geometryRef.current;
    if (!sys || !geo) return;

    const clampedDelta = Math.min(delta, 0.05);
    sys.update(clampedDelta);

    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.rotation as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.particleType as THREE.BufferAttribute).needsUpdate = true;

    const hoverIdx = hoveredIndexRef.current;
    for (let i = 0; i < MAX_POOL; i++) {
      if (i === hoverIdx && sys.activeFlags[i]) {
        hoverScaleRef.current[i] = Math.min(1, hoverScaleRef.current[i] + delta * 8);
      } else {
        hoverScaleRef.current[i] = Math.max(0, hoverScaleRef.current[i] - delta * 6);
      }
      if (hoverScaleRef.current[i] > 0.05 && sys.activeFlags[i]) {
        const baseSize = sys.sizes[i];
        (geo.attributes.size as THREE.BufferAttribute).array[i] =
          baseSize * (1 + hoverScaleRef.current[i] * 0.5);
      }
    }
    (geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    countTimer += delta;
    if (countTimer >= 0.25) {
      countTimer = 0;
      setParticleCounts(sys.getCounts());
    }
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometryRef.current as THREE.BufferGeometry} material={materialRef.current}>
      </points>

      <lineSegments position={[0, BOUNDS.height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(BOUNDS.width, BOUNDS.height, BOUNDS.depth)]} />
        <lineBasicMaterial color={0x444466} transparent opacity={0.25} />
      </lineSegments>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.05}
        zoomSpeed={0.9}
        minDistance={2}
        maxDistance={15}
        minPolarAngle={Math.PI / 2 - (Math.PI / 180) * 60}
        maxPolarAngle={Math.PI / 2 + (Math.PI / 180) * 30}
      />
    </>
  );
}
