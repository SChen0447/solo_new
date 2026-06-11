import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantManager } from './plant/PlantManager';
import { EnvController, EnvParams } from './env/EnvController';
import {
  smoothDamp,
  clamp,
  lerp,
  easeInOutCubic,
} from './utils/effects';

class GreenhouseApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private plantManager!: PlantManager;
  private envController!: EnvController;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationId: number | null = null;
  private targetCamPos: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private camVelX = { value: 0 };
  private camVelY = { value: 0 };
  private camVelZ = { value: 0 };
  private lookVelX = { value: 0 };
  private lookVelY = { value: 0 };
  private lookVelZ = { value: 0 };
  private isCamTransitioning = false;
  private isPlaying = false;
  private playbackTime = 0;
  private playbackSpeed = 3;
  private savedEnv: EnvParams | null = null;
  private savedPlantState: Record<string, any> | null = null;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(6.5, 6, 9.5);
    this.targetCamPos = this.camera.position.clone();
    this.targetLookAt = new THREE.Vector3(0, 1, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 24;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minPolarAngle = 0.12;
    this.controls.target.copy(this.targetLookAt);
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.7;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.85;

    this.buildScene();
    this.createControlsHint();

    this.envController = new EnvController(this.scene);
    this.plantManager = new PlantManager(
      this.scene,
      this.container,
      this.camera,
      this.envController.getParams()
    );

    this.envController.onChange((params) => {
      if (!this.isPlaying) {
        this.plantManager.updateEnvironment(params);
      }
    });

    this.plantManager.onPlantFocus = (
      camPos: THREE.Vector3,
      lookAt: THREE.Vector3
    ) => {
      this.focusCamera(camPos, lookAt);
    };

    this.setupEvents();
    this.setupPlayback();
    this.animate();
  }

  private buildScene(): void {
    this.buildGreenhouse();
    this.buildGround();
    this.buildDecorations();
  }

  private buildGreenhouse(): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8b9c8e,
      roughness: 0.55,
      metalness: 0.35,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6d0,
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.6,
      thickness: 0.3,
      side: THREE.DoubleSide,
    });

    const frameGroup = new THREE.Group();
    const W = 16, H = 6, D = 12, RH = 2.2;

    const corners: [number, number][] = [
      [-W / 2, -D / 2],
      [W / 2, -D / 2],
      [W / 2, D / 2],
      [-W / 2, D / 2],
    ];
    for (const [x, z] of corners) {
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, H, 0.12),
        frameMat
      );
      pole.position.set(x, H / 2, z);
      pole.castShadow = true;
      frameGroup.add(pole);

      const rp = pole.clone();
      rp.position.set(x * 0.65, H + RH / 2, z);
      rp.rotation.z = x > 0 ? -0.35 : 0.35;
      rp.scale.y = RH / H;
      frameGroup.add(rp);
    }

    const addBar = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
      bar.position.set(x, y, z);
      bar.castShadow = true;
      frameGroup.add(bar);
    };
    addBar(W, 0.08, 0.08, 0, H, -D / 2);
    addBar(W, 0.08, 0.08, 0, H, D / 2);
    addBar(0.08, 0.08, D, -W / 2, H, 0);
    addBar(0.08, 0.08, D, W / 2, H, 0);
    addBar(W * 0.65, 0.08, 0.08, 0, H + RH, -D / 2);
    addBar(W * 0.65, 0.08, 0.08, 0, H + RH, D / 2);
    this.scene.add(frameGroup);

    const glassGroup = new THREE.Group();
    const makeWall = (w: number, h: number, x: number, y: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      glassGroup.add(m);
    };
    makeWall(W * 0.98, H * 0.98, 0, H / 2, D / 2 + 0.01);
    makeWall(W * 0.98, H * 0.98, 0, H / 2, -D / 2 - 0.01, Math.PI);
    makeWall(D * 0.98, H * 0.98, -W / 2 - 0.01, H / 2, 0, Math.PI / 2);
    makeWall(D * 0.98, H * 0.98, W / 2 + 0.01, H / 2, 0, -Math.PI / 2);

    const rw = W * 0.64, rd = D * 1.02;
    const roofGeo = new THREE.PlaneGeometry(rw, rd);
    const rLeft = new THREE.Mesh(roofGeo, glassMat);
    rLeft.position.set(-rw * 0.22, H + RH * 0.5, 0);
    rLeft.rotation.set(-Math.PI / 2 + 0.35, 0, 0.35);
    glassGroup.add(rLeft);
    const rRight = rLeft.clone();
    rRight.position.x = rw * 0.22;
    rRight.rotation.z = -0.35;
    glassGroup.add(rRight);

    this.scene.add(glassGroup);
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x5a4a35,
        roughness: 0.95,
        metalness: 0.03,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 10),
      new THREE.MeshStandardMaterial({
        color: 0x8b7a5a,
        roughness: 0.9,
        metalness: 0.02,
      })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.01;
    path.receiveShadow = true;
    this.scene.add(path);

    const plots: [number, number][] = [
      [-4.2, -3.2],
      [-1.4, -3.6],
      [1.4, -3.4],
      [4.2, -3.0],
      [-2.8, 2.6],
      [2.8, 3.0],
    ];
    for (const [x, z] of plots) {
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 28),
        new THREE.MeshStandardMaterial({
          color: 0x4a3a25,
          roughness: 0.98,
        })
      );
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.015, z);
      p.receiveShadow = true;
      this.scene.add(p);
    }

    const grid = new THREE.GridHelper(18, 36, 0x4a6a4a, 0x3a5a3a);
    (grid.material as THREE.Material).opacity = 0.16;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.005;
    this.scene.add(grid);
  }

  private buildDecorations(): void {
    const boxes: [number, number, number, number][] = [
      [-6.5, 0.4, 4, 0x2e7d32],
      [6.5, 0.4, -4, 0x1565c0],
      [-6.5, 0.4, -4, 0x6d4c41],
    ];
    for (const [x, y, z, color] of boxes) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.8, 0.8),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7,
          metalness: 0.1,
        })
      );
      b.position.set(x, y, z);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
    }

    for (let i = 0; i < 16; i++) {
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.12, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(
            0.08 + Math.random() * 0.06,
            0.15,
            0.32 + Math.random() * 0.1
          ),
          roughness: 0.95,
        })
      );
      const a = (i / 16) * Math.PI * 2;
      const r = 10 + Math.random() * 1.5;
      stone.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r);
      stone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.scene.add(stone);
    }
  }

  private createControlsHint(): void {
    const hint = document.createElement('div');
    hint.className = 'controls-hint';
    hint.innerHTML = `
      <div><kbd>拖动</kbd> 旋转视角 · <kbd>滚轮</kbd> 缩放 · <kbd>右键拖动</kbd> 平移</div>
      <div><kbd>双击植物</kbd> 查看详情 · <kbd>拖动太阳</kbd> 调整光照方向</div>
    `;
    document.getElementById('ui-overlay')?.appendChild(hint);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('dblclick', this.onDoubleClick);

    dom.addEventListener('start', () => {}, { passive: true });
  }

  private setupPlayback(): void {
    const btn = document.getElementById('playback-btn');
    if (btn) {
      btn.addEventListener('click', () => this.togglePlayback());
    }
  }

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    const envHistory = this.envController.getHistory();
    const plantHistory = this.plantManager.getHistory();
    if (envHistory.length < 2 || plantHistory.length < 2) return;

    this.isPlaying = true;
    this.playbackTime = 0;
    this.savedEnv = { ...this.envController.getParams() };

    const state: Record<string, any> = {};
    const allPlants = this.plantManager.getAllPlantPositions();
    for (const p of allPlants) {
      const latest = plantHistory[plantHistory.length - 1].plants[p.id];
      if (latest) state[p.id] = { ...latest };
    }
    this.savedPlantState = state;

    const icon = document.getElementById('play-icon');
    if (icon) icon.textContent = '⏸';

    const timeline = document.getElementById('timeline-container');
    timeline?.classList.remove('timeline-hidden');

    this.updateTimelineMarkers();
  }

  private stopPlayback(): void {
    this.isPlaying = false;

    if (this.savedEnv) {
      this.envController.setParamsFromHistory(this.savedEnv);
      this.plantManager.updateEnvironment(this.savedEnv);
      this.savedEnv = null;
    }

    if (this.savedPlantState) {
      this.plantManager.applyHistoryState(this.savedPlantState);
      this.savedPlantState = null;
    }

    const icon = document.getElementById('play-icon');
    if (icon) icon.textContent = '▶';
  }

  private updateTimelineMarkers(): void {
    const markers = document.getElementById('timeline-markers');
    if (!markers) return;
    markers.innerHTML = '';

    const envHistory = this.envController.getHistory();
    if (envHistory.length < 2) return;

    const t0 = envHistory[0].time;
    const t1 = envHistory[envHistory.length - 1].time;
    const span = Math.max(t1 - t0, 1000);

    for (let i = 1; i < envHistory.length; i++) {
      const prev = envHistory[i - 1].params;
      const curr = envHistory[i].params;
      const changed =
        Math.abs(curr.temperature - prev.temperature) > 2.5 ||
        Math.abs(curr.humidity - prev.humidity) > 8 ||
        Math.abs(curr.lightIntensity - prev.lightIntensity) > 18;
      if (changed) {
        const m = document.createElement('div');
        m.className = 'timeline-marker';
        m.style.left = `${((envHistory[i].time - t0) / span) * 100}%`;
        markers.appendChild(m);
      }
    }
  }

  private updatePlayback(delta: number): void {
    if (!this.isPlaying) return;

    const envHistory = this.envController.getHistory();
    const plantHistory = this.plantManager.getHistory();
    if (envHistory.length < 2 || plantHistory.length < 2) {
      this.stopPlayback();
      return;
    }

    const tStart = Math.min(envHistory[0].time, plantHistory[0].time);
    const tEnd = Math.max(
      envHistory[envHistory.length - 1].time,
      plantHistory[plantHistory.length - 1].time
    );
    const totalMs = tEnd - tStart;

    this.playbackTime += delta * 1000 * this.playbackSpeed;
    const nowT = tStart + this.playbackTime;

    if (this.playbackTime >= totalMs) {
      this.stopPlayback();
      return;
    }

    let eIdx = 0;
    for (let i = 0; i < envHistory.length - 1; i++) {
      if (nowT >= envHistory[i].time && nowT < envHistory[i + 1].time) {
        eIdx = i;
        break;
      }
    }
    const ec = envHistory[eIdx];
    const en = envHistory[Math.min(eIdx + 1, envHistory.length - 1)];
    const et = clamp(
      (nowT - ec.time) / Math.max(en.time - ec.time, 1),
      0,
      1
    );
    const eEased = easeInOutCubic(et);
    const interpolatedEnv: EnvParams = {
      temperature: lerp(ec.params.temperature, en.params.temperature, eEased),
      humidity: lerp(ec.params.humidity, en.params.humidity, eEased),
      lightIntensity: lerp(ec.params.lightIntensity, en.params.lightIntensity, eEased),
      sunAngle: lerp(ec.params.sunAngle, en.params.sunAngle, eEased),
      sunHeight: lerp(ec.params.sunHeight, en.params.sunHeight, eEased),
    };
    this.envController.setParamsFromHistory(interpolatedEnv);
    this.plantManager.updateEnvironment(interpolatedEnv);

    let pIdx = 0;
    for (let i = 0; i < plantHistory.length - 1; i++) {
      if (nowT >= plantHistory[i].time && nowT < plantHistory[i + 1].time) {
        pIdx = i;
        break;
      }
    }
    const pc = plantHistory[pIdx];
    const pn = plantHistory[Math.min(pIdx + 1, plantHistory.length - 1)];
    const pt = clamp(
      (nowT - pc.time) / Math.max(pn.time - pc.time, 1),
      0,
      1
    );
    const pEased = easeInOutCubic(pt);

    const interpolated: Record<string, any> = {};
    const allIds = new Set([
      ...Object.keys(pc.plants),
      ...Object.keys(pn.plants),
    ]);
    for (const id of allIds) {
      const c = pc.plants[id];
      const n = pn.plants[id];
      if (!c || !n) continue;
      interpolated[id] = {
        growthIndex: lerp(c.growthIndex, n.growthIndex, pEased),
        height: lerp(c.height, n.height, pEased),
        leafCount: Math.round(lerp(c.leafCount, n.leafCount, pEased)),
        fruitCount: Math.round(lerp(c.fruitCount, n.fruitCount, pEased)),
        fruitSize: lerp(c.fruitSize, n.fruitSize, pEased),
        healthScore: Math.round(lerp(c.healthScore, n.healthScore, pEased)),
        leafCurl: lerp(c.leafCurl, n.leafCurl, pEased),
        leafYellow: lerp(c.leafYellow, n.leafYellow, pEased),
        stemThinness: lerp(c.stemThinness, n.stemThinness, pEased),
        overallWilt: lerp(c.overallWilt, n.overallWilt, pEased),
        effects: {
          temperatureEffect: lerp(
            c.effects.temperatureEffect,
            n.effects.temperatureEffect,
            pEased
          ),
          humidityEffect: lerp(
            c.effects.humidityEffect,
            n.effects.humidityEffect,
            pEased
          ),
          lightEffect: lerp(
            c.effects.lightEffect,
            n.effects.lightEffect,
            pEased
          ),
        },
        status: pEased > 0.5 ? n.status : c.status,
      };
    }
    this.plantManager.applyHistoryState(interpolated);

    const progressEl = document.getElementById('timeline-progress');
    if (progressEl) {
      progressEl.style.width = `${(this.playbackTime / totalMs) * 100}%`;
    }
    const timeEl = document.getElementById('timeline-time');
    if (timeEl) {
      const total = Math.floor(totalMs / 1000);
      const curr = Math.floor(this.playbackTime / 1000);
      timeEl.textContent = `${this.fmtTime(curr)} / ${this.fmtTime(total)}`;
    }
  }

  private fmtTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const handled = this.envController.onPointerDown(e, this.camera);
    if (handled) this.controls.enabled = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.envController.onPointerMove(e, this.camera);
  };

  private onPointerUp = (): void => {
    const handled = this.envController.onPointerUp();
    if (handled || !this.controls.enabled) {
      this.controls.enabled = true;
    }
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );

    if (this.plantManager.handleRaycast(hits)) {
      return;
    }
  };

  private focusCamera(pos: THREE.Vector3, target: THREE.Vector3): void {
    this.targetCamPos.copy(pos);
    this.targetLookAt.copy(target);
    this.camVelX.value = 0;
    this.camVelY.value = 0;
    this.camVelZ.value = 0;
    this.lookVelX.value = 0;
    this.lookVelY.value = 0;
    this.lookVelZ.value = 0;
    this.isCamTransitioning = true;
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.plantManager.onResize(w, h);
  };

  private updateCamera(delta: number): void {
    if (this.isCamTransitioning) {
      const smooth = 0.55;
      const maxS = 25;

      const nx = smoothDamp(
        this.camera.position.x,
        this.targetCamPos.x,
        this.camVelX,
        smooth,
        maxS,
        delta
      );
      const ny = smoothDamp(
        this.camera.position.y,
        this.targetCamPos.y,
        this.camVelY,
        smooth,
        maxS,
        delta
      );
      const nz = smoothDamp(
        this.camera.position.z,
        this.targetCamPos.z,
        this.camVelZ,
        smooth,
        maxS,
        delta
      );
      this.camera.position.set(nx, ny, nz);

      const tx = smoothDamp(
        this.controls.target.x,
        this.targetLookAt.x,
        this.lookVelX,
        smooth,
        maxS,
        delta
      );
      const ty = smoothDamp(
        this.controls.target.y,
        this.targetLookAt.y,
        this.lookVelY,
        smooth,
        maxS,
        delta
      );
      const tz = smoothDamp(
        this.controls.target.z,
        this.targetLookAt.z,
        this.lookVelZ,
        smooth,
        maxS,
        delta
      );
      this.controls.target.set(tx, ty, tz);

      const pDist = this.camera.position.distanceTo(this.targetCamPos);
      const tDist = this.controls.target.distanceTo(this.targetLookAt);
      if (pDist < 0.04 && tDist < 0.04) {
        this.isCamTransitioning = false;
      }
    }

    this.controls.update();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    this.envController.update(delta, time);

    if (this.isPlaying) {
      this.updatePlayback(delta);
    }

    this.plantManager.update(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.plantManager.dispose();
    this.envController.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize);
  }
}

let app: GreenhouseApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new GreenhouseApp();
});

window.addEventListener('beforeunload', () => {
  app?.dispose();
});
