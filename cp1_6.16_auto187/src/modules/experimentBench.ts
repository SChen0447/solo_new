import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface BeakerState {
  id: string;
  position: THREE.Vector3;
  liquidColor: string;
  liquidLevel: number;
  temperature: number;
  ph: number;
  reagents: string[];
}

export interface BenchState {
  beakers: BeakerState[];
  cameraPosition: THREE.Vector3;
}

export interface UserAction {
  type: 'pour' | 'heat' | 'select';
  source: string;
  target: string;
  amount: number;
}

export interface BeakerObject {
  id: string;
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  liquidMaterial: THREE.MeshPhysicalMaterial;
  bubbles: THREE.Points | null;
  currentVolume: number;
  maxVolume: number;
  temperature: number;
  ph: number;
  reagents: string[];
  highlighted: boolean;
  highlightMesh: THREE.Mesh | null;
}

type UserActionCallback = (action: UserAction) => void;

export class ExperimentBench {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  beakers: Map<string, BeakerObject> = new Map();
  private userActionCallbacks: UserActionCallback[] = [];
  private animationId: number = 0;
  private clock: THREE.Clock;
  private benchGroup: THREE.Group;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.clock = new THREE.Clock();
    this.benchGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 40, 60);
    this.camera.lookAt(0, 0, 0);

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 120;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 5, 0);

    this.scene.background = new THREE.Color('#E8ECF1');
    this.scene.fog = new THREE.Fog('#E8ECF1', 80, 200);

    this.createLights();
    this.createBench();
    this.createLabEnvironment();

    window.addEventListener('resize', () => this.onResize(container));

    this.animate();
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(30, 50, 30);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0xffd699, 0.5, 60);
    pointLight.position.set(-20, 25, 10);
    this.scene.add(pointLight);

    const fillLight = new THREE.DirectionalLight(0xe0e8ff, 0.3);
    fillLight.position.set(-30, 20, -20);
    this.scene.add(fillLight);
  }

  private createBench(): void {
    const benchTop = this.createBenchTop();
    this.benchGroup.add(benchTop);

    const legs = this.createBenchLegs();
    legs.forEach(leg => this.benchGroup.add(leg));

    const shelf = this.createShelf();
    this.benchGroup.add(shelf);

    this.scene.add(this.benchGroup);
  }

  private createBenchTop(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(80, 2, 200);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B6914,
      roughness: 0.7,
      metalness: 0.0,
      map: this.createWoodTexture(),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 8, 0);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, 512, 1024);

    for (let i = 0; i < 30; i++) {
      const y = Math.random() * 1024;
      const width = 1 + Math.random() * 3;
      ctx.strokeStyle = `rgba(60, 30, 0, ${0.1 + Math.random() * 0.15})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(0, y);
      let cx = 0;
      while (cx < 512) {
        cx += 20 + Math.random() * 40;
        const cy = y + (Math.random() - 0.5) * 8;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 1024;
      const rx = 2 + Math.random() * 5;
      const ry = 1 + Math.random() * 2;
      ctx.fillStyle = `rgba(50, 25, 0, ${0.1 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
  }

  private createBenchLegs(): THREE.Mesh[] {
    const legGeo = new THREE.BoxGeometry(4, 8, 4);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x6B4E0A,
      roughness: 0.8,
    });
    const positions = [
      [-36, 4, -94],
      [36, 4, -94],
      [-36, 4, 94],
      [36, 4, 94],
    ];
    return positions.map(pos => {
      const mesh = new THREE.Mesh(legGeo, legMat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      return mesh;
    });
  }

  private createShelf(): THREE.Mesh {
    const geo = new THREE.BoxGeometry(70, 1.5, 30);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7A5C0F,
      roughness: 0.75,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 4, 0);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createLabEnvironment(): void {
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd0d4d8,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallGeo = new THREE.PlaneGeometry(300, 100);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf1,
      roughness: 0.95,
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 50, -100);
    this.scene.add(backWall);
  }

  createBeaker(id: string, position: THREE.Vector3): BeakerObject {
    const group = new THREE.Group();
    group.position.copy(position);

    const outerRadius = 5;
    const innerRadius = 4.5;
    const height = 15;
    const segments = 32;

    const glassGeo = new THREE.CylinderGeometry(outerRadius, outerRadius - 0.5, height, segments, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      transmission: 0.95,
      roughness: 0.05,
      metalness: 0.0,
      thickness: 0.5,
      ior: 1.5,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = height / 2;
    group.add(glass);

    const bottomGeo = new THREE.CircleGeometry(innerRadius, segments);
    const bottomMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      transmission: 0.9,
      roughness: 0.05,
      ior: 1.5,
      side: THREE.DoubleSide,
    });
    const bottom = new THREE.Mesh(bottomGeo, bottomMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.1;
    group.add(bottom);

    const rimGeo = new THREE.TorusGeometry(outerRadius, 0.3, 8, segments);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      ior: 1.5,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = height;
    group.add(rim);

    const liquidGeo = new THREE.CylinderGeometry(innerRadius - 0.2, innerRadius - 0.7, 0.1, segments);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.6,
      transmission: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = 0.2;
    group.add(liquidMesh);

    const highlightGeo = new THREE.CylinderGeometry(outerRadius + 1, outerRadius + 1, height + 2, segments, 1, true);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.position.y = height / 2;
    group.add(highlightMesh);

    const scaleMarkings = this.createScaleMarkings(innerRadius, height);
    group.add(scaleMarkings);

    this.scene.add(group);

    const beakerObj: BeakerObject = {
      id,
      group,
      liquidMesh,
      liquidMaterial: liquidMat,
      bubbles: null,
      currentVolume: 0,
      maxVolume: 200,
      temperature: 25,
      ph: 7,
      reagents: [],
      highlighted: false,
      highlightMesh,
    };

    this.beakers.set(id, beakerObj);
    return beakerObj;
  }

  private createScaleMarkings(radius: number, height: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4 });

    for (let i = 1; i <= 4; i++) {
      const y = (i / 5) * height;
      const points = [
        new THREE.Vector3(radius - 0.5, y, 0),
        new THREE.Vector3(radius + 0.5, y, 0),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, mat);
      group.add(line);
    }
    return group;
  }

  updateBeakerLiquid(beakerId: string, volume: number, color?: string): void {
    const beaker = this.beakers.get(beakerId);
    if (!beaker) return;

    beaker.currentVolume = Math.min(volume, beaker.maxVolume);
    const fillRatio = beaker.currentVolume / beaker.maxVolume;
    const maxHeight = 14;
    const newHeight = Math.max(0.1, fillRatio * maxHeight);
    const innerRadius = 4.3;
    const bottomRadius = innerRadius - 0.5;

    beaker.liquidMesh.geometry.dispose();
    const newGeo = new THREE.CylinderGeometry(
      innerRadius - 0.2,
      bottomRadius,
      newHeight,
      32
    );
    beaker.liquidMesh.geometry = newGeo;
    beaker.liquidMesh.position.y = newHeight / 2 + 0.1;

    if (color) {
      beaker.liquidMaterial.color.set(color);
    }

    beaker.currentVolume = volume;
  }

  addBubblesToBeaker(beakerId: string): void {
    const beaker = this.beakers.get(beakerId);
    if (!beaker || beaker.bubbles) return;

    const count = 20;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    beaker.bubbles = new THREE.Points(geo, mat);
    const fillRatio = beaker.currentVolume / beaker.maxVolume;
    beaker.bubbles.position.y = fillRatio * 14 * 0.5;
    beaker.group.add(beaker.bubbles);
  }

  removeBubblesFromBeaker(beakerId: string): void {
    const beaker = this.beakers.get(beakerId);
    if (!beaker || !beaker.bubbles) return;
    beaker.group.remove(beaker.bubbles);
    beaker.bubbles.geometry.dispose();
    (beaker.bubbles.material as THREE.Material).dispose();
    beaker.bubbles = null;
  }

  highlightArea(beakerId: string): void {
    const beaker = this.beakers.get(beakerId);
    if (!beaker || !beaker.highlightMesh) return;

    this.beakers.forEach(b => {
      if (b.highlightMesh) {
        (b.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        b.highlighted = false;
      }
    });

    (beaker.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.25;
    beaker.highlighted = true;
  }

  clearHighlight(): void {
    this.beakers.forEach(b => {
      if (b.highlightMesh) {
        (b.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        b.highlighted = false;
      }
    });
  }

  restoreState(state: BenchState): void {
    state.beakers.forEach(bs => {
      const beaker = this.beakers.get(bs.id);
      if (beaker) {
        beaker.group.position.copy(bs.position);
        this.updateBeakerLiquid(bs.id, bs.liquidLevel, bs.liquidColor);
        beaker.temperature = bs.temperature;
        beaker.ph = bs.ph;
        beaker.reagents = [...bs.reagents];
      }
    });

    this.camera.position.copy(state.cameraPosition);
    this.controls.target.set(0, 5, 0);
    this.controls.update();
  }

  getBenchState(): BenchState {
    const beakerStates: BeakerState[] = [];
    this.beakers.forEach((b, id) => {
      beakerStates.push({
        id,
        position: b.group.position.clone(),
        liquidColor: '#' + b.liquidMaterial.color.getHexString(),
        liquidLevel: b.currentVolume,
        temperature: b.temperature,
        ph: b.ph,
        reagents: [...b.reagents],
      });
    });
    return {
      beakers: beakerStates,
      cameraPosition: this.camera.position.clone(),
    };
  }

  onUserAction(callback: UserActionCallback): void {
    this.userActionCallbacks.push(callback);
  }

  emitUserAction(action: UserAction): void {
    this.userActionCallbacks.forEach(cb => cb(action));
  }

  getBeaker(id: string): BeakerObject | undefined {
    return this.beakers.get(id);
  }

  private animateBubbles(): void {
    this.beakers.forEach(beaker => {
      if (!beaker.bubbles) return;
      const positions = beaker.bubbles.geometry.attributes.position;
      const arr = positions.array as Float32Array;

      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += 0.05 + Math.random() * 0.03;
        if (arr[i * 3 + 1] > 14) {
          arr[i * 3 + 1] = 0;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 3;
          arr[i * 3] = Math.cos(angle) * r;
          arr[i * 3 + 2] = Math.sin(angle) * r;
        }
      }
      positions.needsUpdate = true;
    });
  }

  private onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.controls.update();
    this.animateBubbles();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.controls.dispose();
    this.beakers.forEach(b => {
      b.liquidMesh.geometry.dispose();
      b.liquidMaterial.dispose();
    });
    this.beakers.clear();
  }
}
