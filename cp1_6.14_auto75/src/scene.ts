import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGraphStore, GraphNode, GraphEdge } from './store';

interface NodeMesh {
  id: string;
  sphere: THREE.Mesh;
  halo: THREE.Mesh;
  selectionRing: THREE.Mesh;
  label: THREE.Sprite;
  baseScale: number;
}

interface EdgeMesh {
  id: string;
  cylinder: THREE.Mesh;
  label: THREE.Sprite;
  baseRadius: number;
}

const NODE_RADIUS = 0.4;
const HALO_RADIUS = 0.55;
const EDGE_RADIUS = 0.05;
const EDGE_HOVER_RADIUS = 0.08;
const PULSE_PERIOD = 2;
const HEMISPHERE_RADIUS = 10;

const COLORS = [
  '#00ff88', '#0088ff', '#ff00ff', '#ff8800',
  '#ffff00', '#00ffff', '#ff0088', '#88ff00',
  '#8800ff', '#00ffcc'
];

export class KnowledgeGraphScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private nodeMeshes: Map<string, NodeMesh> = new Map();
  private edgeMeshes: Map<string, EdgeMesh> = new Map();
  private nodeObjectToId: Map<THREE.Object3D, string> = new Map();
  private edgeObjectToId: Map<THREE.Object3D, string> = new Map();

  private animationId: number | null = null;
  private clock: THREE.Clock;
  private isActive: boolean = true;

  private isDragging: boolean = false;
  private dragStartNode: string | null = null;
  private dragLine: THREE.Line | null = null;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();
  private isConnecting: boolean = false;

  private tweening: boolean = false;
  private tweenStartPos: THREE.Vector3 = new THREE.Vector3();
  private tweenStartTarget: THREE.Vector3 = new THREE.Vector3();
  private tweenEndPos: THREE.Vector3 = new THREE.Vector3();
  private tweenEndTarget: THREE.Vector3 = new THREE.Vector3();
  private tweenTime: number = 0;
  private tweenDuration: number = 1;

  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.setupLights();
    this.setupEventListeners();
    this.setupStoreSubscription();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88ff, 0.3);
    rimLight.position.set(0, -5, 5);
    this.scene.add(rimLight);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private setupStoreSubscription(): void {
    let prevNodesLen = 0;
    let prevEdgesLen = 0;
    let prevSelected = '';
    let prevHoveredNode = '';
    let prevHoveredEdge = '';

    this.unsubscribe = useGraphStore.subscribe((state) => {
      const nodesLen = state.nodes.length;
      const edgesLen = state.edges.length;
      const selected = state.selectedNodeId || '';
      const hoveredNode = state.hoveredNodeId || '';
      const hoveredEdge = state.hoveredEdgeId || '';

      if (
        nodesLen !== prevNodesLen ||
        edgesLen !== prevEdgesLen ||
        selected !== prevSelected ||
        hoveredNode !== prevHoveredNode ||
        hoveredEdge !== prevHoveredEdge
      ) {
        prevNodesLen = nodesLen;
        prevEdgesLen = edgesLen;
        prevSelected = selected;
        prevHoveredNode = hoveredNode;
        prevHoveredEdge = hoveredEdge;
        this.syncWithStore();
      }
    });
  }

  private syncWithStore(): void {
    const state = useGraphStore.getState();
    
    const currentNodeIds = new Set(this.nodeMeshes.keys());
    const storeNodeIds = new Set(state.nodes.map((n) => n.id));

    for (const id of currentNodeIds) {
      if (!storeNodeIds.has(id)) {
        this.removeNodeMesh(id);
      }
    }

    for (const node of state.nodes) {
      if (!this.nodeMeshes.has(node.id)) {
        this.createNodeMesh(node);
      } else {
        this.updateNodeMesh(node);
      }
    }

    const currentEdgeIds = new Set(this.edgeMeshes.keys());
    const storeEdgeIds = new Set(state.edges.map((e) => e.id));

    for (const id of currentEdgeIds) {
      if (!storeEdgeIds.has(id)) {
        this.removeEdgeMesh(id);
      }
    }

    for (const edge of state.edges) {
      if (!this.edgeMeshes.has(edge.id)) {
        this.createEdgeMesh(edge);
      } else {
        this.updateEdgeMesh(edge);
      }
    }

    this.updateSelectionVisuals();
  }

  private createNodeMesh(node: GraphNode): void {
    const color = new THREE.Color(node.color);

    const sphereGeometry = new THREE.SphereGeometry(NODE_RADIUS, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      emissive: color.clone().multiplyScalar(0.2),
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(node.position);

    const haloGeometry = new THREE.SphereGeometry(HALO_RADIUS, 32, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(node.position);

    const ringGeometry = new THREE.RingGeometry(NODE_RADIUS * 1.3, NODE_RADIUS * 1.5, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    selectionRing.position.copy(node.position);
    selectionRing.lookAt(this.camera.position);

    const label = this.createLabel(node.name);
    label.position.copy(node.position);
    label.position.y += NODE_RADIUS + 0.3;

    const group = new THREE.Group();
    group.add(sphere, halo, selectionRing, label);
    this.scene.add(group);

    const nodeMesh: NodeMesh = {
      id: node.id,
      sphere,
      halo,
      selectionRing,
      label,
      baseScale: 1,
    };

    this.nodeMeshes.set(node.id, nodeMesh);
    this.nodeObjectToId.set(sphere, node.id);
    this.nodeObjectToId.set(halo, node.id);
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    context.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 4;
    context.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  private updateNodeMesh(node: GraphNode): void {
    const mesh = this.nodeMeshes.get(node.id);
    if (!mesh) return;

    mesh.sphere.position.copy(node.position);
    mesh.halo.position.copy(node.position);
    mesh.selectionRing.position.copy(node.position);
    mesh.label.position.copy(node.position);
    mesh.label.position.y += NODE_RADIUS + 0.3;
  }

  private removeNodeMesh(id: string): void {
    const mesh = this.nodeMeshes.get(id);
    if (!mesh) return;

    this.nodeObjectToId.delete(mesh.sphere);
    this.nodeObjectToId.delete(mesh.halo);
    
    this.scene.remove(mesh.sphere);
    this.scene.remove(mesh.halo);
    this.scene.remove(mesh.selectionRing);
    this.scene.remove(mesh.label);

    mesh.sphere.geometry.dispose();
    (mesh.sphere.material as THREE.Material).dispose();
    mesh.halo.geometry.dispose();
    (mesh.halo.material as THREE.Material).dispose();
    mesh.selectionRing.geometry.dispose();
    (mesh.selectionRing.material as THREE.Material).dispose();
    (mesh.label.material as THREE.Material).dispose();
    mesh.label.material.map?.dispose();

    this.nodeMeshes.delete(id);
  }

  private createEdgeMesh(edge: GraphEdge): void {
    const state = useGraphStore.getState();
    const sourceNode = state.getNodeById(edge.source);
    const targetNode = state.getNodeById(edge.target);
    if (!sourceNode || !targetNode) return;

    const sourceColor = new THREE.Color(sourceNode.color);
    const targetColor = new THREE.Color(targetNode.color);
    const midColor = sourceColor.clone().lerp(targetColor, 0.5);

    const cylinderGeometry = new THREE.CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, 1, 16);
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: midColor,
      transparent: true,
      opacity: 0.6,
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

    const distance = sourceNode.position.distanceTo(targetNode.position);
    const label = this.createLabel(distance.toFixed(2));
    label.scale.set(1, 0.25, 1);

    const edgeMesh: EdgeMesh = {
      id: edge.id,
      cylinder,
      label,
      baseRadius: EDGE_RADIUS,
    };

    this.edgeMeshes.set(edge.id, edgeMesh);
    this.edgeObjectToId.set(cylinder, edge.id);
    this.scene.add(cylinder);
    this.scene.add(label);

    this.updateEdgeMesh(edge);
  }

  private updateEdgeMesh(edge: GraphEdge): void {
    const mesh = this.edgeMeshes.get(edge.id);
    if (!mesh) return;

    const state = useGraphStore.getState();
    const sourceNode = state.getNodeById(edge.source);
    const targetNode = state.getNodeById(edge.target);
    if (!sourceNode || !targetNode) return;

    const sourcePos = sourceNode.position.clone();
    const targetPos = targetNode.position.clone();

    const direction = targetPos.clone().sub(sourcePos).normalize();
    const distance = sourcePos.distanceTo(targetPos);

    const startPos = sourcePos.clone().add(direction.clone().multiplyScalar(NODE_RADIUS));
    const endPos = targetPos.clone().sub(direction.clone().multiplyScalar(NODE_RADIUS));
    const actualDistance = startPos.distanceTo(endPos);

    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
    mesh.cylinder.position.copy(midPoint);
    mesh.cylinder.scale.y = actualDistance;
    mesh.cylinder.lookAt(endPos);
    mesh.cylinder.rotateX(Math.PI / 2);

    mesh.label.position.copy(midPoint);
    mesh.label.position.y += 0.2;

    const canvas = (mesh.label.material as THREE.SpriteMaterial).map as THREE.CanvasTexture;
    if (canvas && canvas.image) {
      const ctx = (canvas.image as HTMLCanvasElement).getContext('2d')!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(200, 200, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(distance.toFixed(2), 128, 32);
      canvas.needsUpdate = true;
    }
  }

  private removeEdgeMesh(id: string): void {
    const mesh = this.edgeMeshes.get(id);
    if (!mesh) return;

    this.edgeObjectToId.delete(mesh.cylinder);
    this.scene.remove(mesh.cylinder);
    this.scene.remove(mesh.label);

    mesh.cylinder.geometry.dispose();
    (mesh.cylinder.material as THREE.Material).dispose();
    (mesh.label.material as THREE.Material).dispose();
    mesh.label.material.map?.dispose();

    this.edgeMeshes.delete(id);
  }

  private updateSelectionVisuals(): void {
    const state = useGraphStore.getState();

    for (const [id, mesh] of this.nodeMeshes) {
      const isSelected = state.selectedNodeId === id;
      const isHovered = state.hoveredNodeId === id;

      const scale = isSelected ? 1.15 : isHovered ? 1.05 : 1;
      mesh.sphere.scale.setScalar(scale);
      mesh.halo.scale.setScalar(scale);
      
      const ringMat = mesh.selectionRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = isSelected ? 0.8 : 0;
      mesh.selectionRing.lookAt(this.camera.position);

      const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.3 : 0.2;
      const sphereMat = mesh.sphere.material as THREE.MeshStandardMaterial;
      const color = new THREE.Color(useGraphStore.getState().getNodeById(id)?.color || '#ffffff');
      sphereMat.emissive = color.clone().multiplyScalar(emissiveIntensity);
    }

    for (const [id, mesh] of this.edgeMeshes) {
      const isHovered = state.hoveredEdgeId === id;
      const mat = mesh.cylinder.material as THREE.MeshBasicMaterial;
      mat.opacity = isHovered ? 1.0 : 0.6;

      const targetRadius = isHovered ? EDGE_HOVER_RADIUS : EDGE_RADIUS;
      mesh.cylinder.scale.x = targetRadius / EDGE_RADIUS;
      mesh.cylinder.scale.z = targetRadius / EDGE_RADIUS;
    }
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    
    this.updateMouse(event);
    this.mouseDownPos.copy(this.mouse);
    this.isDragging = true;

    const hit = this.raycastNode();
    if (hit) {
      this.isConnecting = true;
      this.dragStartNode = hit;
      this.startDragLine(hit);
      this.controls.enabled = false;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.updateMouse(event);

    if (this.isConnecting && this.dragLine) {
      this.updateDragLine();
    }

    if (!this.isDragging || !this.isConnecting) {
      this.handleHover();
    }
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    
    const moveDistance = this.mouse.distanceTo(this.mouseDownPos);
    const wasClick = moveDistance < 0.02;

    if (this.isConnecting && this.dragStartNode) {
      const targetHit = this.raycastNode();
      if (targetHit && targetHit !== this.dragStartNode) {
        const state = useGraphStore.getState();
        state.addEdge(this.dragStartNode, targetHit);
      }
      this.clearDragLine();
      this.isConnecting = false;
      this.dragStartNode = null;
      this.controls.enabled = true;
    } else if (wasClick && event.button === 0) {
      this.handleClick(event);
    }

    this.isDragging = false;
  };

  private onDoubleClick = (event: MouseEvent): void => {
    this.updateMouse(event);
    const edgeHit = this.raycastEdge();
    if (edgeHit) {
      useGraphStore.getState().deleteEdge(edgeHit);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const state = useGraphStore.getState();

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state.selectedNodeId) {
        state.deleteNode(state.selectedNodeId);
      } else if (state.selectedEdgeId) {
        state.deleteEdge(state.selectedEdgeId);
      }
    }

    if (event.key === 'f' || event.key === 'F') {
      if (state.selectedNodeId) {
        this.focusOnNode(state.selectedNodeId);
      }
    }

    if (event.key === 'Escape') {
      state.selectNode(null);
      state.selectEdge(null);
    }
  };

  private onVisibilityChange = (): void => {
    this.isActive = !document.hidden;
    if (this.isActive && this.animationId === null) {
      this.startAnimationLoop();
    }
  };

  private raycastNode(): string | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const spheres: THREE.Object3D[] = [];
    for (const mesh of this.nodeMeshes.values()) {
      spheres.push(mesh.sphere);
    }

    const intersects = this.raycaster.intersectObjects(spheres);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      return this.nodeObjectToId.get(obj) || null;
    }
    return null;
  }

  private raycastEdge(): string | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const cylinders: THREE.Object3D[] = [];
    for (const mesh of this.edgeMeshes.values()) {
      cylinders.push(mesh.cylinder);
    }

    const intersects = this.raycaster.intersectObjects(cylinders);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      return this.edgeObjectToId.get(obj) || null;
    }
    return null;
  }

  private handleClick(event: MouseEvent): void {
    const nodeHit = this.raycastNode();
    const state = useGraphStore.getState();

    if (nodeHit) {
      state.selectNode(nodeHit);
    } else {
      const edgeHit = this.raycastEdge();
      if (edgeHit) {
        state.selectEdge(edgeHit);
      } else {
        state.selectNode(null);
        state.selectEdge(null);
        this.showAddNodeModal(event);
      }
    }
  }

  private handleHover(): void {
    const nodeHit = this.raycastNode();
    const edgeHit = nodeHit ? null : this.raycastEdge();
    const state = useGraphStore.getState();

    if (state.hoveredNodeId !== nodeHit) {
      state.setHoveredNode(nodeHit);
      document.body.style.cursor = nodeHit ? 'pointer' : 'default';
    }

    if (state.hoveredEdgeId !== edgeHit) {
      state.setHoveredEdge(edgeHit);
      if (!nodeHit) {
        document.body.style.cursor = edgeHit ? 'pointer' : 'default';
      }
    }
  }

  private showAddNodeModal(event: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    const position = intersection || new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 5,
      (Math.random() - 0.5) * 10
    );

    useGraphStore.getState().setIsAddingNode(true, position);
  }

  private startDragLine(nodeId: string): void {
    const nodeMesh = this.nodeMeshes.get(nodeId);
    if (!nodeMesh) return;

    const points = [
      nodeMesh.sphere.position.clone(),
      nodeMesh.sphere.position.clone(),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.6,
    });
    this.dragLine = new THREE.Line(geometry, material);
    this.dragLine.computeLineDistances();
    this.scene.add(this.dragLine);
  }

  private updateDragLine(): void {
    if (!this.dragLine || !this.dragStartNode) return;

    const nodeMesh = this.nodeMeshes.get(this.dragStartNode);
    if (!nodeMesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    planeNormal.negate();
    
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      nodeMesh.sphere.position
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    const positions = this.dragLine.geometry.attributes.position;
    positions.setXYZ(0, nodeMesh.sphere.position.x, nodeMesh.sphere.position.y, nodeMesh.sphere.position.z);
    positions.setXYZ(1, intersection.x, intersection.y, intersection.z);
    positions.needsUpdate = true;
    
    this.dragLine.computeLineDistances();
  }

  private clearDragLine(): void {
    if (this.dragLine) {
      this.scene.remove(this.dragLine);
      this.dragLine.geometry.dispose();
      (this.dragLine.material as THREE.Material).dispose();
      this.dragLine = null;
    }
  }

  private focusOnNode(nodeId: string): void {
    const node = useGraphStore.getState().getNodeById(nodeId);
    if (!node) return;

    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const distance = 5;
    const targetPos = node.position.clone().add(direction.multiplyScalar(distance));

    this.startTween(targetPos, node.position.clone(), 1);
  }

  private startTween(endPos: THREE.Vector3, endTarget: THREE.Vector3, duration: number): void {
    this.tweenStartPos.copy(this.camera.position);
    this.tweenStartTarget.copy(this.controls.target);
    this.tweenEndPos.copy(endPos);
    this.tweenEndTarget.copy(endTarget);
    this.tweenDuration = duration;
    this.tweenTime = 0;
    this.tweening = true;
    this.controls.enabled = false;
  }

  private updateTween(delta: number): void {
    if (!this.tweening) return;

    this.tweenTime += delta;
    const t = Math.min(this.tweenTime / this.tweenDuration, 1);
    const eased = this.easeInOutCubic(t);

    this.camera.position.lerpVectors(this.tweenStartPos, this.tweenEndPos, eased);
    this.controls.target.lerpVectors(this.tweenStartTarget, this.tweenEndTarget, eased);
    this.controls.update();

    if (t >= 1) {
      this.tweening = false;
      this.controls.enabled = true;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (!this.isActive) return;

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      if (this.tweening) {
        this.updateTween(delta);
      } else {
        this.controls.update();
      }

      this.updatePulseAnimation(elapsed);
      this.updateLabelOrientations();
      this.updateEdgeMeshes();
      this.updateSelectionVisuals();

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updatePulseAnimation(elapsed: number): void {
    for (const mesh of this.nodeMeshes.values()) {
      const pulse = 0.5 + 0.5 * Math.sin((elapsed / PULSE_PERIOD) * Math.PI * 2);
      const haloMat = mesh.halo.material as THREE.MeshBasicMaterial;
      haloMat.opacity = 0.15 + pulse * 0.2;
      
      const haloScale = 1 + pulse * 0.15;
      mesh.halo.scale.setScalar(haloScale * (mesh.baseScale || 1));
    }
  }

  private updateLabelOrientations(): void {
    for (const mesh of this.nodeMeshes.values()) {
      mesh.selectionRing.lookAt(this.camera.position);
    }
  }

  private updateEdgeMeshes(): void {
    const state = useGraphStore.getState();
    for (const edge of state.edges) {
      this.updateEdgeMesh(edge);
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    for (const id of Array.from(this.nodeMeshes.keys())) {
      this.removeNodeMesh(id);
    }

    for (const id of Array.from(this.edgeMeshes.keys())) {
      this.removeEdgeMesh(id);
    }

    this.clearDragLine();

    this.controls.dispose();
    this.renderer.dispose();
  }
}

export function generateHemispherePosition(index: number, total: number): THREE.Vector3 {
  const phi = Math.acos(-1 + (2 * index) / Math.max(total, 1));
  const theta = Math.sqrt(total * Math.PI) * phi;
  const radius = HEMISPHERE_RADIUS;

  const x = radius * Math.cos(theta) * Math.sin(phi);
  const y = radius * Math.abs(Math.cos(phi)) * 0.8 + 1;
  const z = radius * Math.sin(theta) * Math.sin(phi);

  return new THREE.Vector3(x, y, z);
}

export const PRESET_COLORS = COLORS;
