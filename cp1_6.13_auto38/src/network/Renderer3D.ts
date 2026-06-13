import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GraphNodeData, GraphEdgeData, OwnerType } from './GraphManager';

const COLORS = {
  bg: 0x0b0c10,
  player: 0x3b82f6,
  ai: 0xff4d6d,
  neutral: 0x45a29e,
  accent: 0x66fcf1,
  gold: 0xffd700,
} as const;

const SCRIPT_COLORS: Record<string, number> = {
  crack: 0xff4d6d,
  firewall: 0x45a29e,
  stealth: 0xa855f7,
};

interface NodeObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  coreRing?: THREE.Mesh;
  id: string;
  baseScale: number;
}

interface EdgeObject {
  line: THREE.Line;
  key: string;
  fromId: string;
  toId: string;
}

interface AnimationState {
  pulseNodes: Map<string, { t: number; duration: number }>;
  rippleNodes: Map<string, { t: number; duration: number; rings: THREE.Mesh[] }>;
  edgeFlashes: Map<string, { t: number; duration: number }>;
  pathHighlights: { ids: string[]; index: number; t: number; duration: number } | null;
  dragIndicator: { mesh: THREE.Mesh; light: THREE.PointLight; t: number } | null;
  adjacentHighlights: Set<string>;
  scriptModeHighlights: Set<string>;
  trackPathLines: THREE.Line[];
}

export class Renderer3D {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private nodesGroup: THREE.Group = new THREE.Group();
  private edgesGroup: THREE.Group = new THREE.Group();
  private effectsGroup: THREE.Group = new THREE.Group();

  private nodeObjects: Map<string, NodeObject> = new Map();
  private edgeObjects: Map<string, EdgeObject> = new Map();

  private animations: AnimationState = {
    pulseNodes: new Map(),
    rippleNodes: new Map(),
    edgeFlashes: new Map(),
    pathHighlights: null,
    dragIndicator: null,
    adjacentHighlights: new Set(),
    scriptModeHighlights: new Set(),
    trackPathLines: [],
  };

  private nodeClickCb: ((id: string | null) => void) | null = null;
  private nodeHoverCb: ((id: string | null) => void) | null = null;
  private hoveredId: string | null = null;

  private selectedScriptMode: string | null = null;

  public init(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    this.scene.fog = new THREE.Fog(COLORS.bg, 40, 90);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    this.camera.position.set(0, 35, 30);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.touches = {
      ONE: null as unknown as THREE.TOUCH,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.target.set(0, 0, 0);

    this.setupLights();

    this.scene.add(this.edgesGroup);
    this.scene.add(this.nodesGroup);
    this.scene.add(this.effectsGroup);

    this.setupEvents();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.6);
    this.scene!.add(ambient);

    const dir = new THREE.DirectionalLight(0x66fcf1, 0.4);
    dir.position.set(15, 25, 10);
    this.scene!.add(dir);

    const dir2 = new THREE.DirectionalLight(0x3b82f6, 0.25);
    dir2.position.set(-15, 15, -10);
    this.scene!.add(dir2);
  }

  private setupEvents(): void {
    const dom = this.renderer!.domElement;

    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('resize', () => this.resize());
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.container || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const id = this.pickNode();
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.nodeHoverCb?.(id);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (!this.container || !this.camera) return;

    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const id = this.pickNode();
    this.nodeClickCb?.(id);
  }

  private pickNode(): string | null {
    if (!this.camera || !this.scene) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.nodeObjects.forEach((no) => {
      meshes.push(no.mesh);
      if (no.coreRing) meshes.push(no.coreRing);
    });
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    let found: string | null = null;
    this.nodeObjects.forEach((no, id) => {
      if (hits[0].object === no.mesh || hits[0].object === no.coreRing) {
        found = id;
      }
    });
    return found;
  }

  public setGraphData(graph: { nodes: Map<string, GraphNodeData>; edges: GraphEdgeData[] }): void {
    this.clearScene();

    for (const edge of graph.edges) {
      this.createEdge(edge, graph.nodes);
    }

    for (const node of graph.nodes.values()) {
      this.createNode(node);
    }
  }

  private clearScene(): void {
    this.nodeObjects.forEach((no) => {
      no.mesh.geometry.dispose();
      (no.mesh.material as THREE.Material).dispose();
      if (no.coreRing) {
        no.coreRing.geometry.dispose();
        (no.coreRing.material as THREE.Material).dispose();
      }
      this.nodesGroup.remove(no.group);
    });
    this.nodeObjects.clear();

    this.edgeObjects.forEach((eo) => {
      eo.line.geometry.dispose();
      (eo.line.material as THREE.Material).dispose();
      this.edgesGroup.remove(eo.line);
    });
    this.edgeObjects.clear();

    this.clearEffects();
  }

  private clearEffects(): void {
    while (this.effectsGroup.children.length > 0) {
      const c = this.effectsGroup.children[0];
      this.effectsGroup.remove(c);
      if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      const mat = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    }
    this.animations.pulseNodes.clear();
    this.animations.rippleNodes.clear();
    this.animations.edgeFlashes.clear();
    this.animations.pathHighlights = null;
    this.animations.dragIndicator = null;
    this.animations.adjacentHighlights.clear();
    this.animations.scriptModeHighlights.clear();
    this.hideTrackPath();
  }

  private createNode(data: GraphNodeData): void {
    const group = new THREE.Group();
    group.position.copy(data.position);

    const baseScale = data.isCore ? 1.35 : 1.0;
    const radius = data.isCore ? 1.35 : 1.0;
    const height = data.isCore ? 1.0 : 0.7;

    const geo = new THREE.CylinderGeometry(radius, radius, height, 6, 1, false);
    const mat = new THREE.MeshStandardMaterial({
      color: this.ownerColor(data.owner),
      metalness: 0.6,
      roughness: 0.25,
      emissive: this.ownerColor(data.owner),
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 6;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);

    const light = new THREE.PointLight(this.ownerColor(data.owner), data.isCore ? 2.5 : 1.2, data.isCore ? 10 : 6);
    light.position.set(0, 0.8, 0);
    group.add(light);

    let coreRing: THREE.Mesh | undefined;
    if (data.isCore) {
      const ringGeo = new THREE.TorusGeometry(1.9, 0.12, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLORS.gold,
        transparent: true,
        opacity: 0.85,
      });
      coreRing = new THREE.Mesh(ringGeo, ringMat);
      coreRing.rotation.x = Math.PI / 2;
      coreRing.position.y = 0.05;
      group.add(coreRing);
    }

    this.nodesGroup.add(group);
    this.nodeObjects.set(data.id, { group, mesh, light, coreRing, id: data.id, baseScale });
  }

  private createEdge(edge: GraphEdgeData, nodes: Map<string, GraphNodeData>): void {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) return;

    const key = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`;

    const positions = new Float32Array(6);
    positions[0] = from.position.x;
    positions[1] = from.position.y;
    positions[2] = from.position.z;
    positions[3] = to.position.x;
    positions[4] = to.position.y;
    positions[5] = to.position.z;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: COLORS.accent,
      transparent: true,
      opacity: 0.22,
    });

    const line = new THREE.Line(geo, mat);
    this.edgesGroup.add(line);
    this.edgeObjects.set(key, { line, key, fromId: edge.from, toId: edge.to });
  }

  private ownerColor(owner: OwnerType): number {
    switch (owner) {
      case 'player': return COLORS.player;
      case 'ai': return COLORS.ai;
      case 'neutral': return COLORS.neutral;
    }
  }

  public updateNodeColor(id: string, owner: OwnerType): void {
    const no = this.nodeObjects.get(id);
    if (!no) return;
    const color = this.ownerColor(owner);
    (no.mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
    (no.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    no.light.color.setHex(color);
  }

  public playPulseAnimation(nodeId: string): void {
    const no = this.nodeObjects.get(nodeId);
    if (!no) return;

    this.animations.pulseNodes.set(nodeId, { t: 0, duration: 0.9 });

    const ringGeo = new THREE.TorusGeometry(no.baseScale * 1.8, 0.08, 10, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: (no.mesh.material as THREE.MeshStandardMaterial).color.getHex(),
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(no.group.position);
    ring.position.y += 0.2;
    ring.userData.pulseT = 0;
    ring.userData.pulseDuration = 0.9;
    this.effectsGroup.add(ring);
  }

  public playRippleAnimation(nodeId: string): void {
    const no = this.nodeObjects.get(nodeId);
    if (!no) return;

    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(no.baseScale * 1.0, no.baseScale * 1.05, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLORS.player,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(no.group.position);
      ring.position.y = 0.1;
      ring.userData.rippleDelay = i * 0.2;
      ring.userData.rippleDuration = 1.0;
      this.effectsGroup.add(ring);
      rings.push(ring);
    }
    this.animations.rippleNodes.set(nodeId, { t: 0, duration: 1.5, rings });
  }

  public playEdgeFlash(from: string, to: string): void {
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    this.animations.edgeFlashes.set(key, { t: 0, duration: 0.5 });
  }

  public playPathHighlight(pathIds: string[]): void {
    if (pathIds.length < 2) return;
    this.animations.pathHighlights = { ids: [...pathIds], index: 0, t: 0, duration: 0.35 };
  }

  public showTrackPath(pathIds: string[]): void {
    this.hideTrackPath();
    if (pathIds.length < 2) return;

    for (let i = 0; i < pathIds.length - 1; i++) {
      const fromNode = this.nodeObjects.get(pathIds[i]);
      const toNode = this.nodeObjects.get(pathIds[i + 1]);
      if (!fromNode || !toNode) continue;

      const positions = new Float32Array(6);
      positions[0] = fromNode.group.position.x;
      positions[1] = fromNode.group.position.y;
      positions[2] = fromNode.group.position.z;
      positions[3] = toNode.group.position.x;
      positions[4] = toNode.group.position.y;
      positions[5] = toNode.group.position.z;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineDashedMaterial({
        color: COLORS.ai,
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0.85,
        linewidth: 1,
      });

      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.effectsGroup.add(line);
      this.animations.trackPathLines.push(line);
    }
  }

  public hideTrackPath(): void {
    for (const line of this.animations.trackPathLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.effectsGroup.remove(line);
    }
    this.animations.trackPathLines = [];
  }

  public setDragIndicator(active: boolean, worldPos?: THREE.Vector3): void {
    if (this.animations.dragIndicator) {
      this.effectsGroup.remove(this.animations.dragIndicator.mesh);
      this.effectsGroup.remove(this.animations.dragIndicator.light);
      this.animations.dragIndicator.mesh.geometry.dispose();
      (this.animations.dragIndicator.mesh.material as THREE.Material).dispose();
      this.animations.dragIndicator = null;
    }
    if (!active || !worldPos) return;

    const geo = new THREE.SphereGeometry(0.8, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.gold,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(worldPos);
    const light = new THREE.PointLight(COLORS.gold, 3.0, 12);
    light.position.copy(worldPos);
    this.effectsGroup.add(mesh);
    this.effectsGroup.add(light);
    this.animations.dragIndicator = { mesh, light, t: 0 };
  }

  public setHoverAdjacents(adjacentIds: string[], playerId: string): void {
    this.animations.adjacentHighlights.clear();
    const playerColor = this.ownerColor('player');
    this.nodeObjects.forEach((no, id) => {
      const mat = no.mesh.material as THREE.MeshStandardMaterial;
      const baseOwner = this.getBaseOwnerFromColor(mat.color.getHex());
      if (baseOwner) {
        mat.emissiveIntensity = no.id === playerId ? 0.6 : 0.35;
      }
    });
    for (const aid of adjacentIds) {
      this.animations.adjacentHighlights.add(aid);
      const no = this.nodeObjects.get(aid);
      if (no) {
        const mat = no.mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(playerColor);
        mat.emissiveIntensity = 0.9;
      }
    }
  }

  private getBaseOwnerFromColor(color: number): OwnerType | null {
    if (color === COLORS.player) return 'player';
    if (color === COLORS.ai) return 'ai';
    if (color === COLORS.neutral) return 'neutral';
    return null;
  }

  public selectScriptMode(mode: string | null): void {
    this.selectedScriptMode = mode;
    this.animations.scriptModeHighlights.clear();

    this.nodeObjects.forEach((no) => {
      const mat = no.mesh.material as THREE.MeshStandardMaterial;
      const baseOwner = this.getBaseOwnerFromColor(mat.color.getHex());
      if (baseOwner) {
        mat.emissive.setHex(this.ownerColor(baseOwner));
        mat.emissiveIntensity = 0.35;
      }
      if (no.coreRing) {
        (no.coreRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
      }
    });

    if (!mode) return;

    const scriptColor = SCRIPT_COLORS[mode] ?? COLORS.accent;

    this.nodeObjects.forEach((no) => {
      const mat = no.mesh.material as THREE.MeshStandardMaterial;
      const baseColor = mat.color.getHex();
      if (baseColor === COLORS.player) {
        this.animations.scriptModeHighlights.add(no.id);
        mat.emissive.setHex(scriptColor);
        mat.emissiveIntensity = 0.8;
      }
    });
  }

  public onNodeClick(cb: (id: string | null) => void): void {
    this.nodeClickCb = cb;
  }

  public onNodeHover(cb: (id: string | null) => void): void {
    this.nodeHoverCb = cb;
  }

  public getScreenToWorld(clientX: number, clientY: number): THREE.Vector3 {
    if (!this.container || !this.camera) return new THREE.Vector3();
    const rect = this.container.getBoundingClientRect();
    const vec = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      0.5
    );
    vec.unproject(this.camera);
    const dir = vec.sub(this.camera.position).normalize();
    const distance = -this.camera.position.y / dir.y;
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  public resize(): void {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public render(dt: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.controls?.update();

    this.updatePulseAnimations(dt);
    this.updateRippleAnimations(dt);
    this.updateEdgeFlashes(dt);
    this.updatePathHighlights(dt);
    this.updateDragIndicator(dt);
    this.updateNodeBreathing(dt);
    this.updateCoreRing(dt);
    this.updateScriptHighlights(dt);
    this.updateTrackPathDashed(dt);

    this.renderer.render(this.scene, this.camera);
  }

  private updatePulseAnimations(dt: number): void {
    const toRemove: string[] = [];
    this.animations.pulseNodes.forEach((state, id) => {
      state.t += dt;
      const no = this.nodeObjects.get(id);
      if (no) {
        const p = state.t / state.duration;
        if (p >= 1) {
          no.group.scale.setScalar(1);
          toRemove.push(id);
        } else {
          const e = 1 + Math.sin(p * Math.PI) * 0.3;
          no.group.scale.setScalar(e * no.baseScale);
        }
      } else {
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => this.animations.pulseNodes.delete(id));

    const ringsToRemove: THREE.Object3D[] = [];
    for (const child of this.effectsGroup.children) {
      if ('pulseDuration' in child.userData) {
        child.userData.pulseT += dt;
        const p = child.userData.pulseT / child.userData.pulseDuration;
        if (p >= 1) {
          ringsToRemove.push(child);
        } else {
          const scale = 1 + p * 2.5;
          child.scale.setScalar(scale);
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
        }
      }
    }
    ringsToRemove.forEach((r) => {
      this.effectsGroup.remove(r);
      if ((r as THREE.Mesh).geometry) (r as THREE.Mesh).geometry.dispose();
      const mat = (r as THREE.Mesh).material as THREE.Material;
      if (mat) mat.dispose();
    });
  }

  private updateRippleAnimations(dt: number): void {
    const toRemove: string[] = [];
    this.animations.rippleNodes.forEach((state, id) => {
      state.t += dt;
      if (state.t >= state.duration) {
        toRemove.push(id);
        for (const ring of state.rings) {
          this.effectsGroup.remove(ring);
          ring.geometry.dispose();
          (ring.material as THREE.Material).dispose();
        }
        return;
      }
      for (const ring of state.rings) {
        const localT = Math.max(0, state.t - ring.userData.rippleDelay);
        const dur = ring.userData.rippleDuration;
        if (localT >= dur) {
          ring.visible = false;
          continue;
        }
        const p = localT / dur;
        const no = this.nodeObjects.get(id);
        const baseR = no ? no.baseScale : 1.0;
        const inner = baseR * 1.0 + p * baseR * 3.5;
        const outer = inner + baseR * 0.15 * (1 - p * 0.7);
        ring.scale.setScalar(1);
        const newGeo = new THREE.RingGeometry(inner, outer, 64);
        ring.geometry.dispose();
        ring.geometry = newGeo;
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
      }
    });
    toRemove.forEach((id) => this.animations.rippleNodes.delete(id));
  }

  private updateEdgeFlashes(dt: number): void {
    const toRemove: string[] = [];
    this.animations.edgeFlashes.forEach((state, key) => {
      state.t += dt;
      const eo = this.edgeObjects.get(key);
      if (!eo) {
        toRemove.push(key);
        return;
      }
      const p = state.t / state.duration;
      if (p >= 1) {
        (eo.line.material as THREE.LineBasicMaterial).opacity = 0.22;
        (eo.line.material as THREE.LineBasicMaterial).color.setHex(COLORS.accent);
        toRemove.push(key);
      } else {
        const flash = Math.sin(p * Math.PI);
        (eo.line.material as THREE.LineBasicMaterial).opacity = 0.22 + flash * 0.78;
        (eo.line.material as THREE.LineBasicMaterial).color.setHex(COLORS.player);
      }
    });
    toRemove.forEach((k) => this.animations.edgeFlashes.delete(k));
  }

  private updatePathHighlights(dt: number): void {
    const ph = this.animations.pathHighlights;
    if (!ph) return;

    ph.t += dt;
    if (ph.t >= ph.duration) {
      ph.t = 0;
      if (ph.index + 1 >= ph.ids.length) {
        for (const eo of this.edgeObjects.values()) {
          (eo.line.material as THREE.LineBasicMaterial).opacity = 0.22;
          (eo.line.material as THREE.LineBasicMaterial).color.setHex(COLORS.accent);
        }
        this.animations.pathHighlights = null;
        return;
      }
      ph.index++;
    }

    const a = ph.ids[ph.index];
    const b = ph.ids[ph.index + 1];
    if (!a || !b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const eo = this.edgeObjects.get(key);
    if (!eo) return;
    const p = ph.t / ph.duration;
    const flash = Math.sin(p * Math.PI);
    (eo.line.material as THREE.LineBasicMaterial).opacity = 0.3 + flash * 0.7;
    (eo.line.material as THREE.LineBasicMaterial).color.setHex(COLORS.accent);
  }

  private updateDragIndicator(dt: number): void {
    const di = this.animations.dragIndicator;
    if (!di) return;
    di.t += dt;
    const pulse = 1 + Math.sin(di.t * 5) * 0.2;
    di.mesh.scale.setScalar(pulse);
    (di.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(di.t * 5) * 0.3;
  }

  private time: number = 0;

  private updateNodeBreathing(dt: number): void {
    this.time += dt;
    this.nodeObjects.forEach((no, id) => {
      if (this.animations.pulseNodes.has(id)) return;
      const breathe = 1 + Math.sin(this.time * 1.5 + no.group.position.x * 0.3) * 0.03;
      no.group.scale.setScalar(breathe * no.baseScale);
    });
  }

  private updateCoreRing(dt: number): void {
    this.nodeObjects.forEach((no) => {
      if (no.coreRing) {
        no.coreRing.rotation.z += dt * 0.6;
        const pulse = 0.75 + Math.sin(this.time * 2.5) * 0.2;
        (no.coreRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    });
  }

  private updateScriptHighlights(dt: number): void {
    if (!this.selectedScriptMode) return;
    const scriptColor = SCRIPT_COLORS[this.selectedScriptMode] ?? COLORS.accent;
    this.animations.scriptModeHighlights.forEach((id) => {
      const no = this.nodeObjects.get(id);
      if (!no) return;
      const intensity = 0.65 + Math.sin(this.time * 4) * 0.35;
      const mat = no.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(scriptColor);
      mat.emissiveIntensity = intensity;
    });
  }

  private updateTrackPathDashed(dt: number): void {
    for (const line of this.animations.trackPathLines) {
      const mat = line.material as THREE.LineDashedMaterial;
      mat.dashSize = 0.5 + Math.sin(this.time * 3) * 0.1;
      (line as any).computeLineDistances?.();
    }
  }
}
