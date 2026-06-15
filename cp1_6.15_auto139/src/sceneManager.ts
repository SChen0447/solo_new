import * as THREE from 'three';
import type { CelestialBody } from './types';
import { getStoreState } from './dataStore';

interface BodyRenderObject {
  bodyId: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  halo: THREE.Points;
  baseMaterial: THREE.MeshStandardMaterial;
  haloMaterial: THREE.PointsMaterial;
  currentOpacity: number;
  targetOpacity: number;
  highlightScale: number;
}

interface GravityLineData {
  line: THREE.Line;
  fromId: string;
  toId: string;
}

interface CameraLerpState {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
}

export interface SceneManagerCallbacks {
  onBodyClick: (bodyId: string | null) => void;
  onBodyHover: (bodyId: string | null) => void;
  onBodyDoubleClick: (bodyId: string) => void;
}

const DEFAULT_CAM_POS = new THREE.Vector3(0, 0, 15);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0, 0);
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 30;

export class SceneManager {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraTarget: THREE.Vector3;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private clock: THREE.Clock;

  private bodyMap: Map<string, BodyRenderObject> = new Map();
  private gravityLines: GravityLineData[] = [];
  private gravityLinesGroup: THREE.Group;
  private starfield: THREE.Points | null = null;

  private renderObjects: { mesh: THREE.Mesh; bodyId: string }[] = [];

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 2;
  private cameraDistance = 15;
  private lastClickTime = 0;

  private lerpState: CameraLerpState = {
    active: false,
    startTime: 0,
    duration: 500,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3()
  };

  private callbacks: SceneManagerCallbacks;
  private disposers: Array<() => void> = [];
  private animationFrameId: number | null = null;
  private prevHoveredId: string | null = null;
  private prevSelectedId: string | null = null;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, callbacks: SceneManagerCallbacks) {
    this.container = container;
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a1a, 40, 80);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(DEFAULT_CAM_POS);
    this.cameraTarget = DEFAULT_CAM_TARGET.clone();
    this.camera.lookAt(this.cameraTarget);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.3 };
    this.pointer = new THREE.Vector2(-10, -10);
    this.clock = new THREE.Clock();

    this.gravityLinesGroup = new THREE.Group();
    this.scene.add(this.gravityLinesGroup);

    this.setupLights();
    this.setupStarfield();
    this.setupEventListeners();
    this.onResize();

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x222244, 0.8);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.1);
    directional.position.set(5, 8, 10);
    this.scene.add(directional);

    const point1 = new THREE.PointLight(0x8899ff, 0.6, 60);
    point1.position.set(-10, 5, -8);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xff7788, 0.4, 50);
    point2.position.set(8, -5, -6);
    this.scene.add(point2);
  }

  private setupStarfield(): void {
    const STAR_COUNT = 2000;
    const SHELL_RADIUS = 200;

    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = SHELL_RADIUS * (0.85 + Math.random() * 0.15);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 1 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  private setupEventListeners(): void {
    const canvas = this.canvas;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        this.cameraTheta -= (dx * 0.5 * Math.PI) / 180;
        this.cameraPhi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, this.cameraPhi - (dy * 0.5 * Math.PI) / 180)
        );
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.cancelLerp();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDragging = this.isDragging;
      this.isDragging = false;
      canvas.releasePointerCapture?.(e.pointerId);

      const dx = Math.abs(e.clientX - this.dragStartX);
      const dy = Math.abs(e.clientY - this.dragStartY);
      if (wasDragging && dx < 4 && dy < 4) {
        this.handleClick();
      } else if (!wasDragging) {
        this.handleClick();
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      this.cameraDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.cameraDistance + delta * 10));
      this.cancelLerp();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        this.resetCamera();
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
      this.pointer.set(-10, -10);
      if (this.prevHoveredId !== null) {
        this.prevHoveredId = null;
        this.callbacks.onBodyHover(null);
        this.updateGravityLines(null);
      }
    });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('contextmenu', onContextMenu);

    this.disposers.push(
      () => canvas.removeEventListener('pointerdown', onPointerDown),
      () => canvas.removeEventListener('pointermove', onPointerMove),
      () => canvas.removeEventListener('pointerup', onPointerUp),
      () => canvas.removeEventListener('wheel', onWheel),
      () => window.removeEventListener('keydown', onKeyDown),
      () => canvas.removeEventListener('contextmenu', onContextMenu)
    );
  }

  private handleClick(): void {
    const now = performance.now();
    const hit = this.pickBody();

    if (now - this.lastClickTime < 350 && hit) {
      this.callbacks.onBodyDoubleClick(hit);
      this.focusBody(hit);
      this.lastClickTime = 0;
      return;
    }
    this.lastClickTime = now;

    if (hit) {
      this.callbacks.onBodyClick(hit);
    } else {
      this.callbacks.onBodyClick(null);
    }
  }

  private pickBody(): string | null {
    if (this.renderObjects.length === 0) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.renderObjects.map((r) => r.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;
    const hit = intersects[0].object as THREE.Mesh;
    const obj = this.renderObjects.find((r) => r.mesh === hit);
    return obj ? obj.bodyId : null;
  }

  private hexToRgb(hex: string): THREE.Color {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    return new THREE.Color(r, g, b);
  }

  public renderBodies(bodies: CelestialBody[]): void {
    this.clearBodies();

    for (const body of bodies) {
      this.createBodyMesh(body);
    }

    this.updateVisibilityInstant();
  }

  private createBodyMesh(body: CelestialBody): void {
    const color = this.hexToRgb(body.color);
    const group = new THREE.Group();

    const radius = body.radius;
    const segments = Math.max(16, Math.min(48, Math.round(radius * 24)));
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1,
      emissive: color.clone().multiplyScalar(0.15),
      transparent: true,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    group.add(mesh);

    const haloCount = Math.round(20 + (body.brightness / 100) * 60);
    const halo = this.createHalo(radius, color, haloCount, body.id);
    group.add(halo);

    group.position.set(body.position3D.x, body.position3D.y, body.position3D.z);
    this.scene.add(group);

    this.bodyMap.set(body.id, {
      bodyId: body.id,
      group,
      mesh,
      halo,
      baseMaterial: material,
      haloMaterial: halo.material as THREE.PointsMaterial,
      currentOpacity: 1,
      targetOpacity: 1,
      highlightScale: 1
    });

    this.renderObjects.push({ mesh, bodyId: body.id });
  }

  private createHalo(radius: number, color: THREE.Color, count: number, _bodyId: string): THREE.Points {
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (1 + Math.random() * 1.2);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      alphas[i] = 0.3 + Math.random() * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 2 + Math.random() * 4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = true;
    return points;
  }

  public focusBody(bodyId: string): void {
    const obj = this.bodyMap.get(bodyId);
    if (!obj) return;

    const target = obj.group.position.clone();
    const offsetDir = new THREE.Vector3().subVectors(this.camera.position, this.cameraTarget).normalize();
    const desiredDistance = Math.max(5, obj.mesh.geometry.boundingSphere
      ? obj.mesh.geometry.boundingSphere.radius * 6
      : 8);

    const endPos = target.clone().add(offsetDir.multiplyScalar(desiredDistance));

    this.lerpState = {
      active: true,
      startTime: performance.now(),
      duration: 500,
      startPos: this.camera.position.clone(),
      endPos,
      startTarget: this.cameraTarget.clone(),
      endTarget: target
    };
  }

  public resetCamera(): void {
    this.lerpState = {
      active: true,
      startTime: performance.now(),
      duration: 500,
      startPos: this.camera.position.clone(),
      endPos: DEFAULT_CAM_POS.clone(),
      startTarget: this.cameraTarget.clone(),
      endTarget: DEFAULT_CAM_TARGET.clone()
    };
    this.cameraDistance = 15;
    this.cameraTheta = 0;
    this.cameraPhi = Math.PI / 2;
  }

  private cancelLerp(): void {
    this.lerpState.active = false;
  }

  public updateVisibility(): void {
    const state = getStoreState();
    for (const [id, obj] of this.bodyMap) {
      obj.targetOpacity = state.visibleIds.has(id) ? 1.0 : 0.0;
    }
    this.updateGravityLines(state.hoveredId || state.selectedId);
  }

  private updateVisibilityInstant(): void {
    const state = getStoreState();
    for (const [id, obj] of this.bodyMap) {
      const visible = state.visibleIds.has(id);
      obj.targetOpacity = visible ? 1.0 : 0.0;
      obj.currentOpacity = visible ? 1.0 : 0.0;
      obj.baseMaterial.opacity = visible ? 1.0 : 0.0;
      obj.haloMaterial.opacity = visible ? 0.5 : 0.0;
      obj.group.visible = visible;
    }
    this.updateGravityLines(state.hoveredId || state.selectedId);
  }

  public updateGravityLines(hoveredOrSelectedId: string | null): void {
    for (const line of this.gravityLines) {
      this.gravityLinesGroup.remove(line.line);
      (line.line.geometry as THREE.BufferGeometry).dispose();
      (line.line.material as THREE.LineBasicMaterial).dispose();
    }
    this.gravityLines = [];

    if (!hoveredOrSelectedId) return;

    const mainObj = this.bodyMap.get(hoveredOrSelectedId);
    if (!mainObj) return;

    const state = getStoreState();
    const mainPos = mainObj.group.position;
    const nearBodies = state.bodies
      .filter((b) => b.id !== hoveredOrSelectedId && state.visibleIds.has(b.id))
      .map((b) => {
        const obj = this.bodyMap.get(b.id);
        if (!obj) return { b, dist: Infinity };
        return { b, dist: mainPos.distanceTo(obj.group.position) };
      })
      .filter((x) => isFinite(x.dist))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, Math.min(6, state.bodies.length - 1));

    for (const { b } of nearBodies) {
      const otherObj = this.bodyMap.get(b.id);
      if (!otherObj) continue;

      const geom = new THREE.BufferGeometry().setFromPoints([mainPos, otherObj.group.position]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x4a4a8a,
        transparent: true,
        opacity: 0.15,
        depthWrite: false
      });
      const line = new THREE.Line(geom, mat);
      this.gravityLinesGroup.add(line);
      this.gravityLines.push({ line, fromId: hoveredOrSelectedId, toId: b.id });
    }
  }

  private updateCameraFromSpherical(): void {
    if (this.lerpState.active) return;
    const sinPhi = Math.sin(this.cameraPhi);
    const x = this.cameraTarget.x + this.cameraDistance * sinPhi * Math.cos(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraDistance * sinPhi * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private updateLerp(now: number): void {
    if (!this.lerpState.active) return;
    const t = Math.min(1, (now - this.lerpState.startTime) / this.lerpState.duration);
    const ease = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(this.lerpState.startPos, this.lerpState.endPos, ease);
    this.cameraTarget.lerpVectors(this.lerpState.startTarget, this.lerpState.endTarget, ease);
    this.camera.lookAt(this.cameraTarget);

    if (t >= 1) {
      this.lerpState.active = false;
      const dx = this.camera.position.x - this.cameraTarget.x;
      const dy = this.camera.position.y - this.cameraTarget.y;
      const dz = this.camera.position.z - this.cameraTarget.z;
      this.cameraDistance = Math.sqrt(dx * dx + dy * dy + dz);
      this.cameraTheta = Math.atan2(dz, dx);
      this.cameraPhi = Math.acos(dy / Math.max(0.001, this.cameraDistance));
    }
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private hoverTick(): void {
    const state = getStoreState();
    const hovered = this.pickBody();

    if (hovered !== this.prevHoveredId) {
      this.prevHoveredId = hovered;
      state.setHovered(hovered);
      this.callbacks.onBodyHover(hovered);
      this.updateGravityLines(hovered || state.selectedId);
    }
  }

  private selectedTick(): void {
    const state = getStoreState();
    const selected = state.selectedId;
    if (selected === this.prevSelectedId) return;
    this.prevSelectedId = selected;
    this.updateGravityLines(state.hoveredId || selected);

    for (const [id, obj] of this.bodyMap) {
      obj.highlightScale = id === selected ? 1.2 : 1;
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();

    this.hoverTick();
    this.selectedTick();
    this.updateLerp(now);
    this.updateCameraFromSpherical();

    if (this.starfield) {
      this.starfield.rotation.y += 0.0005;
      this.starfield.rotation.x += 0.0001;
    }

    for (const obj of this.bodyMap.values()) {
      obj.currentOpacity += (obj.targetOpacity - obj.currentOpacity) * 0.08;
      const op = obj.currentOpacity;
      obj.baseMaterial.opacity = op;
      obj.haloMaterial.opacity = Math.min(1, op) * 0.5;
      const visible = op > 0.02;
      if (obj.group.visible !== visible) obj.group.visible = visible;

      const currentScale = obj.mesh.scale.x;
      const target = obj.highlightScale;
      const newScale = currentScale + (target - currentScale) * 0.1;
      obj.mesh.scale.setScalar(newScale);

      const haloPulse = 0.85 + Math.sin(elapsed * 2 + obj.mesh.position.x) * 0.15;
      obj.halo.scale.setScalar(haloPulse);
      const haloSizes = obj.halo.geometry.attributes.size as THREE.BufferAttribute | undefined;
      if (haloSizes) {
        for (let i = 0; i < haloSizes.count; i++) {
          const baseSize = (obj.haloMaterial.size || 4);
          haloSizes.setX(i, baseSize * (0.6 + Math.random() * 0.8));
        }
        haloSizes.needsUpdate = true;
      }

      obj.mesh.rotation.y += 0.003;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private clearBodies(): void {
    for (const obj of this.bodyMap.values()) {
      this.scene.remove(obj.group);
      (obj.mesh.geometry as THREE.BufferGeometry).dispose();
      obj.baseMaterial.dispose();
      (obj.halo.geometry as THREE.BufferGeometry).dispose();
      obj.haloMaterial.dispose();
    }
    this.bodyMap.clear();
    this.renderObjects = [];

    for (const line of this.gravityLines) {
      this.gravityLinesGroup.remove(line.line);
      (line.line.geometry as THREE.BufferGeometry).dispose();
      (line.line.material as THREE.LineBasicMaterial).dispose();
    }
    this.gravityLines = [];
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    for (const dispose of this.disposers) dispose();
    this.clearBodies();
    if (this.starfield) {
      this.scene.remove(this.starfield);
      (this.starfield.geometry as THREE.BufferGeometry).dispose();
      (this.starfield.material as THREE.PointsMaterial).dispose();
    }
    this.renderer.dispose();
  }
}
