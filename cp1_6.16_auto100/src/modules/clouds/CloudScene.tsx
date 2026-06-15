import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { eventBus, CloudData, CloudRarity } from '../../shared/eventBus';

const CLOUD_NAMES_COMMON = [
  '棉花糖云', '绵羊云', '枕头云', '雪球云', '泡泡云',
  '奶油云', '蒲公英云', '霜花云', '月牙云', '薄纱云',
  '羽毛云', '涟漪云', '露珠云', '轻风云', '白烟云',
];
const CLOUD_NAMES_RARE = [
  '金色祥云', '彩虹桥云', '极光云', '星尘云', '琥珀云',
  '紫霞云', '霞光云', '琉璃云', '凤凰云', '龙鳞云',
];
const LOCATIONS = [
  '欢乐云海', '星辉平原', '晨曦峡谷', '彩虹瀑布', '月光湖畔',
  '风语山丘', '梦境森林', '天空之城', '云端花园', '极光之巅',
];

interface CloudObject {
  id: string;
  mesh: THREE.Group;
  data: CloudData;
  velocity: THREE.Vector3;
  particles: THREE.Mesh[];
}

function playChordSound(rare: boolean) {
  try {
    const ctx = new AudioContext();
    if (rare) {
      const freqs = [261.63, 329.63, 392.00];
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {}
}

function createCloudGeometry(size: number, color: string, rarity: CloudRarity): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.92,
    shininess: rarity === 'rare' ? 80 : 20,
  });
  const sphereGeo = new THREE.SphereGeometry(size * 0.4, 12, 12);
  const offsets = [
    [0, 0, 0],
    [size * 0.3, size * 0.15, 0],
    [-size * 0.25, size * 0.1, size * 0.1],
    [size * 0.1, size * 0.25, -size * 0.1],
    [-size * 0.15, -size * 0.05, size * 0.15],
    [size * 0.2, -size * 0.1, -size * 0.15],
    [0, size * 0.05, size * 0.2],
  ];
  offsets.forEach(([ox, oy, oz]) => {
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.set(ox, oy, oz);
    group.add(mesh);
  });
  if (rarity === 'rare') {
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3,
    });
    const glowGeo = new THREE.SphereGeometry(size * 0.55, 8, 8);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);
  }
  return group;
}

function randomCloudColor(rarity: CloudRarity): string {
  if (rarity === 'rare') {
    const rareColors = ['#FFD700', '#FF69B4', '#9370DB', '#00CED1', '#FF6347'];
    return rareColors[Math.floor(Math.random() * rareColors.length)];
  }
  const commonColors = ['#FFFFFF', '#F0F8FF', '#E8E8E8', '#F5F5DC', '#FFF8DC'];
  return commonColors[Math.floor(Math.random() * commonColors.length)];
}

let cloudIdCounter = 0;
function generateCloudData(): CloudData {
  const rarity: CloudRarity = Math.random() < 0.1 ? 'rare' : 'common';
  const names = rarity === 'rare' ? CLOUD_NAMES_RARE : CLOUD_NAMES_COMMON;
  const id = `cloud_${cloudIdCounter++}`;
  return {
    id,
    position: {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 8 + 2,
      z: (Math.random() - 0.5) * 12 - 5,
    },
    size: 0.8 + Math.random() * 0.8,
    speed: 0.2 + Math.random() * 0.5,
    rarity,
    color: randomCloudColor(rarity),
    name: names[Math.floor(Math.random() * names.length)],
  };
}

const CloudScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cloudsRef = useRef<Map<string, CloudObject>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const animFrameRef = useRef<number>(0);
  const [netPressed, setNetPressed] = useState(false);
  const [beamActive, setBeamActive] = useState(false);
  const beamRef = useRef<THREE.Line | null>(null);
  const beamTimerRef = useRef<number>(0);
  const captureParticlesRef = useRef<THREE.Mesh[]>([]);
  const captureTimerRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const spawnCloud = useCallback(() => {
    if (!sceneRef.current) return;
    const data = generateCloudData();
    const group = createCloudGeometry(data.size, data.color, data.rarity);
    group.position.set(data.position.x, data.position.y, data.position.z);
    sceneRef.current.add(group);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.005,
      (Math.random() - 0.5) * 0.005
    );
    const particles: THREE.Mesh[] = [];
    cloudsRef.current.set(data.id, { id: data.id, mesh: group, data, velocity, particles });
    eventBus.emit({ type: 'CLOUD_SPAWNED', cloud: data });
  }, []);

  const removeCloud = useCallback((id: string) => {
    const cloudObj = cloudsRef.current.get(id);
    if (cloudObj && sceneRef.current) {
      sceneRef.current.remove(cloudObj.mesh);
      cloudsRef.current.delete(id);
    }
  }, []);

  const createCaptureBeam = useCallback((from: THREE.Vector3, to: THREE.Vector3) => {
    if (!sceneRef.current) return;
    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    mid.y += 1.5;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(30);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xFFD700, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    sceneRef.current.add(line);
    beamRef.current = line;
    setBeamActive(true);
    beamTimerRef.current = window.setTimeout(() => {
      if (beamRef.current && sceneRef.current) {
        sceneRef.current.remove(beamRef.current);
        beamRef.current = null;
      }
      setBeamActive(false);
    }, 300);
  }, []);

  const createExplosionParticles = useCallback((position: THREE.Vector3, color: string, rarity: CloudRarity) => {
    if (!sceneRef.current) return;
    const existing = captureParticlesRef.current;
    existing.forEach(p => sceneRef.current!.remove(p));
    existing.length = 0;
    const count = rarity === 'rare' ? 30 : 15;
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < count; i++) {
      const particleColor = rarity === 'rare' && Math.random() > 0.5 ? '#FFD700' : color;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(particleColor),
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.05 + Math.random() * 0.08);
      mesh.userData.velocity = dir;
      mesh.userData.life = 0.5;
      sceneRef.current.add(mesh);
      existing.push(mesh);
    }
    captureTimerRef.current = 0.5;
  }, []);

  const handleCloudClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current || cloudsRef.current.size === 0) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect
      ? (containerRef.current?.getBoundingClientRect()!)
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const meshes: THREE.Object3D[] = [];
    cloudsRef.current.forEach(c => {
      c.mesh.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child); });
    });
    const intersects = raycasterRef.current.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let hitCloudObj: CloudObject | null = null;
      for (const [id, co] of cloudsRef.current) {
        let found = false;
        co.mesh.traverse(child => { if (child === intersects[0].object) found = true; });
        if (found) { hitCloudObj = co; break; }
      }
      if (hitCloudObj) {
        const from = new THREE.Vector3(0, -3, 8);
        const to = hitCloudObj.mesh.position.clone();
        createCaptureBeam(from, to);
        createExplosionParticles(to, hitCloudObj.data.color, hitCloudObj.data.rarity);
        playChordSound(hitCloudObj.data.rarity === 'rare');
        const shards = Math.floor(Math.random() * 3) + 1;
        eventBus.emit({ type: 'CLOUD_CAPTURED', cloud: hitCloudObj.data, shards });
        removeCloud(hitCloudObj.id);
        setTimeout(() => spawnCloud(), 1500);
      }
    }
  }, [createCaptureBeam, createExplosionParticles, removeCloud, spawnCloud]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87CEEB, 1);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    const topColor = new THREE.Color('#87CEEB');
    const bottomColor = new THREE.Color('#FFE4B5');
    const skyGeo = new THREE.PlaneGeometry(100, 60);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.z = -20;
    scene.add(sky);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    for (let i = 0; i < 15; i++) {
      spawnCloud();
    }
    container.addEventListener('click', handleCloudClick);
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      cloudsRef.current.forEach((co) => {
        co.mesh.position.add(co.velocity.clone().multiplyScalar(delta * 60));
        co.mesh.position.y += Math.sin(Date.now() * 0.001 * co.data.speed) * 0.002;
        if (co.mesh.position.x > 14) co.velocity.x = -Math.abs(co.velocity.x);
        if (co.mesh.position.x < -14) co.velocity.x = Math.abs(co.velocity.x);
        if (co.mesh.position.y > 8) co.velocity.y = -Math.abs(co.velocity.y);
        if (co.mesh.position.y < -2) co.velocity.y = Math.abs(co.velocity.y);
        if (co.mesh.position.z > 2) co.velocity.z = -Math.abs(co.velocity.z);
        if (co.mesh.position.z < -10) co.velocity.z = Math.abs(co.velocity.z);
      });
      if (captureTimerRef.current > 0) {
        captureTimerRef.current -= delta;
        captureParticlesRef.current.forEach(p => {
          p.position.add(p.userData.velocity);
          p.userData.life -= delta;
          if (p.userData.life > 0) {
            (p.material as THREE.MeshBasicMaterial).opacity = p.userData.life / 0.5;
          }
        });
        if (captureTimerRef.current <= 0) {
          captureParticlesRef.current.forEach(p => scene.remove(p));
          captureParticlesRef.current = [];
        }
      }
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('click', handleCloudClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleNetDown = useCallback(() => {
    setNetPressed(true);
    setTimeout(() => setNetPressed(false), 100);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7B68EE, #87CEEB)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          transform: netPressed ? 'scale(0.85)' : 'scale(1)',
          transition: 'transform 0.1s ease-out',
          fontSize: 28,
          color: '#fff',
          zIndex: 10,
        }}
        onMouseDown={handleNetDown}
        onMouseUp={() => setNetPressed(false)}
      >
        🥅
      </div>
      {beamActive && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#FFD700',
          fontWeight: 'bold',
          fontSize: 14,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          ✨ 捕捉中...
        </div>
      )}
    </div>
  );
};

export default CloudScene;
