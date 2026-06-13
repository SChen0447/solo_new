import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { Exhibit, LightConfig, LabelConfig } from './Store';

const ROOM_WIDTH = 24;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 5.5;
const GRID_SIZE = 1;
const DAMPING = 0.08;
const MOVE_SPEED = 4.5;
const ANIM_DURATION = 0.6;

function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function createWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = Math.random() * 0.04;
    ctx.fillStyle = `rgba(180,170,155,${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const v = 240 + Math.random() * 12;
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
      ctx.fillRect(x, y, 64, 64);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ROOM_WIDTH / 4, ROOM_HEIGHT / 4);
  return tex;
}

function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#E8E4DE';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#CFC9C0';
  ctx.lineWidth = 1;
  const step = 512 / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(512, i * step);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ROOM_WIDTH / 2, ROOM_DEPTH / 2);
  return tex;
}

function buildVeil(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xE8D5C4, metalness: 0.05, roughness: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8 + i * 0.35, 0, 0),
      new THREE.Vector3(-0.6 + i * 0.3, 0.6, Math.sin(i * 0.8) * 0.3),
      new THREE.Vector3(-0.4 + i * 0.25, 1.2, Math.cos(i * 0.6) * 0.25),
      new THREE.Vector3(-0.2 + i * 0.2, 1.8, Math.sin(i * 0.5 + 1) * 0.2),
      new THREE.Vector3(i * 0.15, 2.2, Math.cos(i * 0.4) * 0.15),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.04 + i * 0.008, 8, false);
    const mesh = new THREE.Mesh(tubeGeo, mat);
    g.add(mesh);
  }
  const ribbonPts: THREE.Vector3[] = [];
  for (let t = 0; t <= 1; t += 0.02) {
    ribbonPts.push(new THREE.Vector3(
      Math.sin(t * Math.PI * 2) * 0.7,
      t * 2.3,
      Math.cos(t * Math.PI * 3) * 0.4
    ));
  }
  const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPts);
  const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 64, 0.02, 6, false);
  g.add(new THREE.Mesh(ribbonGeo, mat));
  g.position.y = 0.05;
  return g;
}

function buildHorizon(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xD4AF7B, metalness: 0.75, roughness: 0.18 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 16, 48), mat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.8;
  g.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 16, 48), mat);
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.z = Math.PI / 6;
  ring2.position.y = 1.2;
  g.add(ring2);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 16, 48), mat);
  ring3.rotation.x = -Math.PI / 4;
  ring3.rotation.z = -Math.PI / 5;
  ring3.position.y = 1.5;
  g.add(ring3);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.15, 32), mat);
  base.position.y = 0.075;
  g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), mat);
  stem.position.y = 0.45;
  g.add(stem);
  return g;
}

function buildTower(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xB8A998, metalness: 0, roughness: 0.88 });
  const sizes = [0.5, 0.42, 0.36, 0.3, 0.24, 0.18, 0.13];
  let yOff = 0;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    const geo = new THREE.BoxGeometry(s, s * 0.35, s);
    const mesh = new THREE.Mesh(geo, mat);
    const rotY = (i % 2 === 0 ? 1 : -1) * (0.08 + i * 0.04);
    mesh.rotation.y = rotY;
    yOff += s * 0.35 / 2 + (i > 0 ? sizes[i - 1] * 0.35 / 2 : 0);
    mesh.position.y = yOff;
    g.add(mesh);
  }
  g.position.y = 0.05;
  return g;
}

function buildBloom(): THREE.Group {
  const g = new THREE.Group();
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xE8978E, metalness: 0.12, roughness: 0.42, side: THREE.DoubleSide });
  const petalCount = 8;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.12, 0.2, 0.08, 0.5, 0, 0.6);
    shape.bezierCurveTo(-0.08, 0.5, -0.12, 0.2, 0, 0);
    const geo = new THREE.ShapeGeometry(shape);
    const petal = new THREE.Mesh(geo, petalMat);
    petal.rotation.y = angle;
    petal.rotation.x = -0.3;
    petal.position.set(
      Math.cos(angle) * 0.15,
      0.6 + Math.sin(i * 0.5) * 0.05,
      Math.sin(angle) * 0.15
    );
    g.add(petal);
  }
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xF0D4A0, metalness: 0.05, roughness: 0.6 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), centerMat);
  center.position.y = 0.65;
  g.add(center);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x8A9A6C, metalness: 0, roughness: 0.7 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 8), stemMat);
  stem.position.y = 0.3;
  g.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.06, 16), stemMat);
  base.position.y = 0.03;
  g.add(base);
  return g;
}

function buildPaintingLandscape(colors: string[], frameColor: string): THREE.Group {
  const g = new THREE.Group();
  const w = 1.6, h = 1.0, d = 0.05;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 320, Math.random() * 20, Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const paintingMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  const painting = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paintingMat);
  painting.position.y = h / 2 + 0.1;
  g.add(painting);
  const fMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(frameColor), roughness: 0.6, metalness: 0.3 });
  const ft = 0.06;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  top.position.set(0, h + ft / 2 + 0.1, 0);
  g.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  bot.position.set(0, ft / 2 + 0.1, 0);
  g.add(bot);
  const left = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  left.position.set(-(w / 2 + ft / 2), h / 2 + 0.1, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  right.position.set(w / 2 + ft / 2, h / 2 + 0.1, 0);
  g.add(right);
  return g;
}

function buildPaintingPortrait(colors: string[], frameColor: string): THREE.Group {
  const g = new THREE.Group();
  const w = 0.9, h = 1.3, d = 0.05;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 320, 480);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 480);
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 320, Math.random() * 480, Math.random() * 15 + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  const paintingMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  const painting = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paintingMat);
  painting.position.y = h / 2 + 0.1;
  g.add(painting);
  const fMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(frameColor), roughness: 0.6, metalness: 0.3 });
  const ft = 0.055;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  top.position.set(0, h + ft / 2 + 0.1, 0);
  g.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  bot.position.set(0, ft / 2 + 0.1, 0);
  g.add(bot);
  const left = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  left.position.set(-(w / 2 + ft / 2), h / 2 + 0.1, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  right.position.set(w / 2 + ft / 2, h / 2 + 0.1, 0);
  g.add(right);
  return g;
}

function buildPaintingSquare(colors: string[], frameColor: string): THREE.Group {
  const g = new THREE.Group();
  const w = 1.2, h = 1.2, d = 0.05;
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, (i / colors.length) * 400, 400, 400 / colors.length + 1);
  });
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 400, Math.random() * 400, Math.random() * 8, Math.random() * 40);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const paintingMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  const painting = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paintingMat);
  painting.position.y = h / 2 + 0.1;
  g.add(painting);
  const fMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(frameColor), roughness: 0.6, metalness: 0.3 });
  const ft = 0.06;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  top.position.set(0, h + ft / 2 + 0.1, 0);
  g.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w + ft * 2, ft, d + 0.04), fMat);
  bot.position.set(0, ft / 2 + 0.1, 0);
  g.add(bot);
  const left = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  left.position.set(-(w / 2 + ft / 2), h / 2 + 0.1, 0);
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(ft, h, d + 0.04), fMat);
  right.position.set(w / 2 + ft / 2, h / 2 + 0.1, 0);
  g.add(right);
  return g;
}

function buildExhibitModel(exhibit: Exhibit): THREE.Group {
  let model: THREE.Group;
  switch (exhibit.geometry) {
    case 'veil': model = buildVeil(); break;
    case 'horizon': model = buildHorizon(); break;
    case 'tower': model = buildTower(); break;
    case 'bloom': model = buildBloom(); break;
    case 'paintingLandscape':
      model = buildPaintingLandscape(exhibit.canvasColors || ['#ddd', '#bbb', '#999', '#777'], exhibit.frameColor || '#333');
      break;
    case 'paintingPortrait':
      model = buildPaintingPortrait(exhibit.canvasColors || ['#ddd', '#bbb', '#999', '#777'], exhibit.frameColor || '#333');
      break;
    case 'paintingSquare':
      model = buildPaintingSquare(exhibit.canvasColors || ['#ddd', '#bbb', '#999', '#777'], exhibit.frameColor || '#333');
      break;
    default: {
      model = new THREE.Group();
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      m.position.y = 0.5;
      model.add(m);
    }
  }
  model.scale.setScalar(exhibit.scale);
  model.rotation.y = exhibit.rotation;
  return model;
}

interface SceneObjectEntry {
  exhibitId: string;
  group: THREE.Group;
  model: THREE.Group;
  spotlight: THREE.SpotLight;
  spotlightTarget: THREE.Object3D;
  halo: THREE.Mesh;
  labelMesh: THREE.Sprite | null;
  animStart: number;
  animating: boolean;
}

export interface TextGallerySceneHandle {
  addExhibit: (exhibit: Exhibit) => void;
  removeExhibit: (exhibitId: string) => void;
  updateExhibitLight: (exhibitId: string, light: LightConfig) => void;
  updateExhibitLabel: (exhibitId: string, label: LabelConfig) => void;
  highlightExhibit: (exhibitId: string | null) => void;
  getRaycastGroundPosition: (screenX: number, screenY: number) => { x: number; z: number } | null;
  setExhibitPreview: (presetId: string | null, screenX: number, screenY: number) => void;
}

interface SceneProps {
  exhibits: Exhibit[];
  selectedExhibitId: string | null;
  onSelectExhibit: (id: string | null) => void;
  isCurationMode: boolean;
  onExhibitDropped: (presetId: string, x: number, z: number) => void;
  onLoadingProgress: (progress: number) => void;
  onLoadingComplete: () => void;
  onFpsUpdate: (fps: number) => void;
}

const TextGalleryScene = forwardRef<TextGallerySceneHandle, SceneProps>(({
  exhibits,
  selectedExhibitId,
  onSelectExhibit,
  isCurationMode,
  onExhibitDropped,
  onLoadingProgress,
  onLoadingComplete,
  onFpsUpdate,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneDataRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    groundPlane: THREE.Mesh;
    sceneObjects: Map<string, SceneObjectEntry>;
    animationId: number;
    keys: { w: boolean; a: boolean; s: boolean; d: boolean };
    velocity: THREE.Vector3;
    yaw: number;
    pitch: number;
    isPointerLocked: boolean;
    isDragging: boolean;
    dragStart: { x: number; y: number };
    lastMouse: { x: number; y: number };
    previewGroup: THREE.Group | null;
    previewPresetId: string | null;
    fpsFrames: number[];
    targetYaw: number;
    targetPitch: number;
    initialized: boolean;
  } | null>(null);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F0E8);
    scene.fog = new THREE.Fog(0xF5F0E8, 15, 45);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 1.7, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xF8F5F0, 0xD4CCC0, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xFFF7E8, 0.8);
    dirLight.position.set(-5, 10, -7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.radius = 4;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xFFF7E8, 0.3);
    scene.add(ambLight);

    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0 });

    const floorTex = createFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'ground';
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(Math.max(ROOM_WIDTH, ROOM_DEPTH), Math.max(ROOM_WIDTH, ROOM_DEPTH), 0xCFC9C0, 0xDDD8D0);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    const hw = ROOM_WIDTH / 2;
    const hd = ROOM_DEPTH / 2;

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT), wallMat);
    backWall.position.set(0, ROOM_HEIGHT / 2, -hd);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT), wallMat.clone());
    frontWall.position.set(0, ROOM_HEIGHT / 2, hd);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), wallMat.clone());
    leftWall.position.set(-hw, ROOM_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), wallMat.clone());
    rightWall.position.set(hw, ROOM_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0xF0ECE6, roughness: 1, metalness: 0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    scene.add(ceiling);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0xD4CCC0, roughness: 0.8, metalness: 0 });
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH + 0.1, 0.12, 0.08), baseMat);
    baseTrim.position.set(0, 0.06, -hd + 0.04);
    scene.add(baseTrim);

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();

    const data = {
      scene,
      camera,
      renderer,
      clock,
      raycaster,
      groundPlane: floor,
      sceneObjects: new Map<string, SceneObjectEntry>(),
      animationId: 0,
      keys: { w: false, a: false, s: false, d: false },
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      isPointerLocked: false,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      lastMouse: { x: 0, y: 0 },
      previewGroup: null as THREE.Group | null,
      previewPresetId: null as string | null,
      fpsFrames: [],
      targetYaw: 0,
      targetPitch: 0,
      initialized: true,
    };

    sceneDataRef.current = data;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in data.keys) (data.keys as any)[k] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in data.keys) (data.keys as any)[k] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !data.isPointerLocked && isCurationMode) {
        data.isDragging = true;
        data.dragStart = { x: e.clientX, y: e.clientY };
        data.lastMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (data.isDragging && !data.isPointerLocked) {
        const dx = e.clientX - data.lastMouse.x;
        const dy = e.clientY - data.lastMouse.y;
        data.targetYaw -= dx * 0.003;
        data.targetPitch -= dy * 0.003;
        data.targetPitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, data.targetPitch));
        data.lastMouse = { x: e.clientX, y: e.clientY };
      }
      if (data.isPointerLocked) {
        data.targetYaw -= e.movementX * 0.002;
        data.targetPitch -= e.movementY * 0.002;
        data.targetPitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, data.targetPitch));
      }
      if (data.previewGroup) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        data.raycaster.setFromCamera(mouse, data.camera);
        const intersects = data.raycaster.intersectObject(data.groundPlane);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          data.previewGroup.position.set(snapToGrid(pt.x), 0.02, snapToGrid(pt.z));
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        data.isDragging = false;
      }
    };

    const onPointerLockChange = () => {
      data.isPointerLocked = document.pointerLockElement === renderer.domElement;
    };

    const onClick = (e: MouseEvent) => {
      if (data.isPointerLocked || data.previewGroup) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      data.raycaster.setFromCamera(mouse, data.camera);
      const allMeshes: THREE.Object3D[] = [];
      data.sceneObjects.forEach(entry => {
        entry.group.traverse(child => {
          if (child instanceof THREE.Mesh) allMeshes.push(child);
        });
      });
      const intersects = data.raycaster.intersectObjects(allMeshes, false);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.exhibitId) obj = obj.parent;
        if (obj && obj.userData.exhibitId) {
          onSelectExhibit(obj.userData.exhibitId);
          return;
        }
      }
      onSelectExhibit(null);
    };

    const onDblClick = () => {
      if (!data.isPointerLocked && !isCurationMode) {
        renderer.domElement.requestPointerLock();
      }
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDblClick);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const presetId = e.dataTransfer?.getData('text/preset-id');
      if (!presetId) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      data.raycaster.setFromCamera(mouse, data.camera);
      const intersects = data.raycaster.intersectObject(data.groundPlane);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        onExhibitDropped(presetId, snapToGrid(pt.x), snapToGrid(pt.z));
      }
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      const presetId = e.dataTransfer?.types.includes('text/preset-id');
    };

    container.addEventListener('drop', onDrop);
    container.addEventListener('dragover', onDragOver);
    container.addEventListener('dragenter', onDragEnter);

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      data.camera.aspect = w / h;
      data.camera.updateProjectionMatrix();
      data.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    onLoadingProgress(30);

    const animate = () => {
      data.animationId = requestAnimationFrame(animate);
      const delta = Math.min(data.clock.getDelta(), 0.1);
      const now = performance.now();

      const direction = new THREE.Vector3();
      if (data.keys.w) direction.z -= 1;
      if (data.keys.s) direction.z += 1;
      if (data.keys.a) direction.x -= 1;
      if (data.keys.d) direction.x += 1;
      direction.normalize();

      data.yaw += (data.targetYaw - data.yaw) * (1 - Math.pow(1 - DAMPING, delta * 60));
      data.pitch += (data.targetPitch - data.pitch) * (1 - Math.pow(1 - DAMPING, delta * 60));

      const euler = new THREE.Euler(data.pitch, data.yaw, 0, 'YXZ');
      data.camera.quaternion.setFromEuler(euler);

      if (direction.length() > 0) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.yaw));
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), data.yaw));
        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, -direction.z);
        moveDir.addScaledVector(right, direction.x);
        moveDir.normalize();
        data.velocity.lerp(moveDir.multiplyScalar(MOVE_SPEED), 1 - Math.pow(1 - DAMPING, delta * 60));
      } else {
        data.velocity.lerp(new THREE.Vector3(), 1 - Math.pow(0.01, delta));
      }

      data.camera.position.add(data.velocity.clone().multiplyScalar(delta));
      data.camera.position.y = 1.7;

      const hw2 = ROOM_WIDTH / 2 - 0.5;
      const hd2 = ROOM_DEPTH / 2 - 0.5;
      data.camera.position.x = Math.max(-hw2, Math.min(hw2, data.camera.position.x));
      data.camera.position.z = Math.max(-hd2, Math.min(hd2, data.camera.position.z));

      if (data.previewGroup) {
        const s = 0.95 + 0.05 * Math.sin(now * 0.005);
        data.previewGroup.scale.setScalar(s);
      }

      data.sceneObjects.forEach((entry, id) => {
        if (entry.animating) {
          const elapsed = (now - entry.animStart) / 1000;
          const t = Math.min(elapsed / ANIM_DURATION, 1);
          const eased = easeOutElastic(t);
          entry.group.position.y = eased * entry.model.position.y * 0 + 0;
          const modelBaseY = entry.model.userData.baseY ?? 0;
          entry.model.position.y = modelBaseY * eased;
          if (t >= 1) entry.animating = false;
        }
      });

      data.renderer.render(data.scene, data.camera);

      data.fpsFrames.push(now);
      while (data.fpsFrames.length > 0 && data.fpsFrames[0] < now - 1000) data.fpsFrames.shift();
      if (data.fpsFrames.length > 0 && data.fpsFrames.length % 30 === 0) {
        onFpsUpdate(data.fpsFrames.length);
      }
    };

    onLoadingProgress(80);
    setTimeout(() => {
      onLoadingProgress(100);
      setTimeout(() => onLoadingComplete(), 300);
    }, 400);

    animate();

    return () => {
      cancelAnimationFrame(data.animationId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.dispose();
    };
  }, [isCurationMode, onExhibitDropped, onLoadingProgress, onLoadingComplete, onSelectExhibit, onFpsUpdate]);

  useEffect(() => {
    const cleanup = initScene();
    return () => { cleanup?.(); };
  }, [initScene]);

  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;
    const existingIds = new Set(data.sceneObjects.keys());
    exhibits.forEach(exhibit => {
      if (!existingIds.has(exhibit.id)) {
        internalAddExhibit(exhibit);
      } else {
        const entry = data.sceneObjects.get(exhibit.id)!;
        if (entry.group.userData.selected !== (exhibit.id === selectedExhibitId)) {
          entry.group.userData.selected = exhibit.id === selectedExhibitId;
          entry.group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (exhibit.id === selectedExhibitId) {
                mat.emissive = new THREE.Color(0xD4AF7B);
                mat.emissiveIntensity = 0.15;
              } else {
                mat.emissive = new THREE.Color(0x000000);
                mat.emissiveIntensity = 0;
              }
            }
          });
        }
      }
      existingIds.delete(exhibit.id);
    });
    existingIds.forEach(id => internalRemoveExhibit(id));
  }, [exhibits, selectedExhibitId]);

  function internalAddExhibit(exhibit: Exhibit) {
    const data = sceneDataRef.current;
    if (!data) return;

    const group = new THREE.Group();
    group.position.set(exhibit.position.x, 0, exhibit.position.z);
    group.userData.exhibitId = exhibit.id;

    const model = buildExhibitModel(exhibit);
    model.userData.baseY = model.position.y;
    model.position.y = 0;
    group.add(model);

    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(exhibit.position.x, 0, exhibit.position.z);
    data.scene.add(spotTarget);

    const spotlight = new THREE.SpotLight(
      new THREE.Color(exhibit.light.color),
      exhibit.light.intensity,
      8,
      0.5,
      0.5,
      1
    );
    spotlight.position.set(exhibit.position.x, 3.5, exhibit.position.z);
    spotlight.target = spotTarget;
    spotlight.castShadow = data.sceneObjects.size < 8;
    if (spotlight.castShadow) {
      spotlight.shadow.mapSize.set(512, 512);
      spotlight.shadow.bias = -0.002;
      spotlight.shadow.radius = 4;
    }
    data.scene.add(spotlight);

    const haloGeo = new THREE.CircleGeometry(0.9, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(exhibit.light.color),
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(exhibit.position.x, 0.01, exhibit.position.z);
    data.scene.add(halo);

    data.scene.add(group);

    const entry: SceneObjectEntry = {
      exhibitId: exhibit.id,
      group,
      model,
      spotlight,
      spotlightTarget: spotTarget,
      halo,
      labelMesh: null,
      animStart: performance.now(),
      animating: exhibit.animating,
    };

    data.sceneObjects.set(exhibit.id, entry);
  }

  function internalRemoveExhibit(exhibitId: string) {
    const data = sceneDataRef.current;
    if (!data) return;
    const entry = data.sceneObjects.get(exhibitId);
    if (!entry) return;
    data.scene.remove(entry.group);
    data.scene.remove(entry.spotlight);
    data.scene.remove(entry.spotlightTarget);
    data.scene.remove(entry.halo);
    if (entry.labelMesh) data.scene.remove(entry.labelMesh);
    entry.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
    data.sceneObjects.delete(exhibitId);
  }

  useImperativeHandle(ref, () => ({
    addExhibit: (exhibit: Exhibit) => internalAddExhibit(exhibit),
    removeExhibit: (exhibitId: string) => internalRemoveExhibit(exhibitId),
    updateExhibitLight: (exhibitId: string, light: LightConfig) => {
      const data = sceneDataRef.current;
      if (!data) return;
      const entry = data.sceneObjects.get(exhibitId);
      if (!entry) return;
      entry.spotlight.color.set(light.color);
      entry.spotlight.intensity = light.intensity;
      (entry.halo.material as THREE.MeshBasicMaterial).color.set(light.color);
      (entry.halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + light.intensity * 0.04;
    },
    updateExhibitLabel: (exhibitId: string, label: LabelConfig) => {
      const data = sceneDataRef.current;
      if (!data) return;
      const entry = data.sceneObjects.get(exhibitId);
      if (!entry) return;
      if (entry.labelMesh) {
        data.scene.remove(entry.labelMesh);
        entry.labelMesh.material.map?.dispose();
        entry.labelMesh.material.dispose();
        entry.labelMesh = null;
      }
      if (!label.visible || !label.text) return;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = label.backgroundColor;
      const r = 16;
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 256, r);
      ctx.fill();
      ctx.fillStyle = label.textColor;
      ctx.font = 'bold 36px "Noto Sans SC", sans-serif';
      const lines = label.text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 24, 50 + i * 48);
      });
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.6, 0.8, 1);
      const exhibit = exhibits.find(e => e.id === exhibitId);
      const baseX = exhibit?.position.x ?? 0;
      const baseZ = exhibit?.position.z ?? 0;
      sprite.position.set(baseX + label.offsetX, 2.5, baseZ + label.offsetZ);
      data.scene.add(sprite);
      entry.labelMesh = sprite;
    },
    highlightExhibit: (exhibitId: string | null) => {
      const data = sceneDataRef.current;
      if (!data) return;
      data.sceneObjects.forEach((entry, id) => {
        entry.group.traverse(child => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (id === exhibitId) {
              mat.emissive = new THREE.Color(0xD4AF7B);
              mat.emissiveIntensity = 0.15;
            } else {
              mat.emissive = new THREE.Color(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        });
      });
    },
    getRaycastGroundPosition: (screenX: number, screenY: number) => {
      const data = sceneDataRef.current;
      if (!data || !containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1
      );
      data.raycaster.setFromCamera(mouse, data.camera);
      const intersects = data.raycaster.intersectObject(data.groundPlane);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        return { x: snapToGrid(pt.x), z: snapToGrid(pt.z) };
      }
      return null;
    },
    setExhibitPreview: (presetId: string | null, screenX: number, screenY: number) => {
      const data = sceneDataRef.current;
      if (!data) return;
      if (data.previewGroup) {
        data.scene.remove(data.previewGroup);
        data.previewGroup.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) child.material.dispose();
          }
        });
        data.previewGroup = null;
        data.previewPresetId = null;
      }
      if (!presetId) return;
      const presets = (require('./data/presets.json') as any[]);
      const preset = presets.find((p: any) => p.id === presetId);
      if (!preset) return;
      const dummyExhibit: Exhibit = {
        id: 'preview',
        presetId,
        type: preset.type,
        name: '',
        geometry: preset.geometry,
        color: preset.color,
        metalness: preset.metalness ?? 0.1,
        roughness: preset.roughness ?? 0.5,
        frameColor: preset.frameColor,
        canvasColors: preset.canvasColors,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        scale: preset.defaultScale ?? 1,
        light: { color: '#FFF7E8', intensity: 1.2 },
        label: null,
        createdAt: 0,
        animating: false,
        animationProgress: 1,
      };
      const model = buildExhibitModel(dummyExhibit);
      model.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
          (child.material as THREE.MeshStandardMaterial).transparent = true;
          (child.material as THREE.MeshStandardMaterial).opacity = 0.5;
        }
      });
      data.previewGroup = model;
      data.previewPresetId = presetId;
      data.scene.add(model);
      const rect = containerRef.current!.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1
      );
      data.raycaster.setFromCamera(mouse, data.camera);
      const intersects = data.raycaster.intersectObject(data.groundPlane);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        model.position.set(snapToGrid(pt.x), 0.02, snapToGrid(pt.z));
      }
    },
  }), [exhibits]);

  const handleExitPointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: isCurationMode ? 'default' : 'crosshair',
      }}
    >
      {sceneDataRef.current?.isPointerLocked && !isCurationMode && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            background: 'rgba(42,39,36,0.8)',
            color: '#F8F5F0',
            borderRadius: 100,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            pointerEvents: 'none',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            letterSpacing: 1,
          }}
        >
          按 ESC 退出漫游 · WASD 移动 · 鼠标旋转视野
        </div>
      )}
    </div>
  );
});

TextGalleryScene.displayName = 'TextGalleryScene';

export default TextGalleryScene;
