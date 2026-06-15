import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GraphModel } from '../models/graphModel';
import { FlowNode, FlowConnection, DataPacket, DAMPING_FACTOR } from '../models/types';
import {
  createNodeMesh,
  createNodeGlow,
  createNodeLabel,
  updateNodeLabel,
  createConnectionMesh,
  updateConnectionMesh,
  createPacketMesh,
  createFlowParticle,
  createGridHelper,
} from './objectFactory';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private model: GraphModel;
  private nodeMeshMap: Map<string, THREE.Mesh> = new Map();
  private nodeGlowMap: Map<string, THREE.Mesh> = new Map();
  private nodeLabelMap: Map<string, THREE.Mesh> = new Map();
  private connGroupMap: Map<string, THREE.Group> = new Map();
  private connLineMap: Map<string, THREE.Mesh> = new Map();
  private connParticleMap: Map<string, THREE.Group> = new Map();
  private packetMeshMap: Map<string, THREE.Mesh> = new Map();
  private flowParticleData: Map<string, { progress: number; mesh: THREE.Mesh }[]> = new Map();
  private hoveredNodeId: string | null = null;
  private draggedNodeId: string | null = null;

  constructor(container: HTMLElement, model: GraphModel) {
    this.model = model;
    this.scene = new THREE.Scene();
    this.setupBackground();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 18);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = DAMPING_FACTOR;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;
    this.setupLights();
    this.setupGrid();
    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(1, '#1b263b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);
    const point1 = new THREE.PointLight(0xffffff, 1.0, 100);
    point1.position.set(10, 15, 10);
    this.scene.add(point1);
    const point2 = new THREE.PointLight(0x4fc3f7, 0.6, 80);
    point2.position.set(-10, 5, -10);
    this.scene.add(point2);
    const point3 = new THREE.PointLight(0xff8a65, 0.4, 80);
    point3.position.set(0, -5, 10);
    this.scene.add(point3);
  }

  private setupGrid(): void {
    const grid = createGridHelper();
    this.scene.add(grid);
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  addNodeVisual(node: FlowNode): void {
    const mesh = createNodeMesh(node);
    this.scene.add(mesh);
    this.nodeMeshMap.set(node.id, mesh);
    node.mesh = mesh;
    const glow = createNodeGlow(node);
    this.scene.add(glow);
    this.nodeGlowMap.set(node.id, glow);
    node.glowMesh = glow;
    const label = createNodeLabel(node);
    this.scene.add(label);
    this.nodeLabelMap.set(node.id, label);
    node.label = label;
  }

  removeNodeVisual(nodeId: string): void {
    const mesh = this.nodeMeshMap.get(nodeId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.nodeMeshMap.delete(nodeId);
    }
    const glow = this.nodeGlowMap.get(nodeId);
    if (glow) {
      this.scene.remove(glow);
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      this.nodeGlowMap.delete(nodeId);
    }
    const label = this.nodeLabelMap.get(nodeId);
    if (label) {
      this.scene.remove(label);
      label.geometry.dispose();
      (label.material as THREE.Material).dispose();
      this.nodeLabelMap.delete(nodeId);
    }
  }

  addConnectionVisual(conn: FlowConnection): void {
    const source = this.model.getNode(conn.sourceId);
    const target = this.model.getNode(conn.targetId);
    if (!source || !target) return;
    const { group, lineMesh, particleGroup } = createConnectionMesh(source, target);
    this.scene.add(group);
    this.connGroupMap.set(conn.id, group);
    this.connLineMap.set(conn.id, lineMesh);
    this.connParticleMap.set(conn.id, particleGroup);
    conn.mesh = group;
    conn.lineMesh = lineMesh;
    conn.particleGroup = particleGroup;
    const particles: { progress: number; mesh: THREE.Mesh }[] = [];
    for (let i = 0; i < 3; i++) {
      const p = createFlowParticle();
      particleGroup.add(p);
      particles.push({ progress: i / 3, mesh: p });
    }
    this.flowParticleData.set(conn.id, particles);
  }

  removeConnectionVisual(connId: string): void {
    const group = this.connGroupMap.get(connId);
    if (group) {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
    }
    this.connGroupMap.delete(connId);
    this.connLineMap.delete(connId);
    this.connParticleMap.delete(connId);
    this.flowParticleData.delete(connId);
  }

  addPacketVisual(packet: DataPacket): void {
    const mesh = createPacketMesh();
    this.scene.add(mesh);
    this.packetMeshMap.set(packet.id, mesh);
    packet.mesh = mesh;
    this.updatePacketPosition(packet);
  }

  removePacketVisual(packetId: string): void {
    const mesh = this.packetMeshMap.get(packetId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.packetMeshMap.delete(packetId);
    }
  }

  private updatePacketPosition(packet: DataPacket): void {
    const source = this.model.getNode(packet.sourceId);
    const target = this.model.getNode(packet.targetId);
    if (!source || !target || !packet.mesh) return;
    const pos = new THREE.Vector3().lerpVectors(source.position, target.position, packet.progress);
    packet.mesh.position.copy(pos);
  }

  setHoveredNode(nodeId: string | null): void {
    this.hoveredNodeId = nodeId;
  }

  setDraggedNode(nodeId: string | null): void {
    this.draggedNodeId = nodeId;
  }

  getDraggedNodeId(): string | null {
    return this.draggedNodeId;
  }

  resetView(): void {
    this.camera.position.set(0, 8, 18);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  update(delta: number, elapsed: number): void {
    this.model.updatePackets(delta);
    this.model.updateFlashes(delta);
    const newPacket = this.model.tryAutoSpawn(elapsed);
    if (newPacket) {
      this.addPacketVisual(newPacket);
    }
    this.model.getAllNodes().forEach((node) => {
      const id = node.id;
      const mesh = this.nodeMeshMap.get(id);
      const glow = this.nodeGlowMap.get(id);
      const label = this.nodeLabelMap.get(id);
      if (!mesh) return;
      mesh.position.copy(node.position);
      if (glow) glow.position.copy(node.position);
      if (label) updateNodeLabel(label, node);
      if (node.isFlashing && mesh.material instanceof THREE.MeshPhongMaterial) {
        mesh.material.emissive.setHex(0xffffff);
        mesh.material.emissiveIntensity = 1.5;
      } else if (mesh.material instanceof THREE.MeshPhongMaterial) {
        mesh.material.emissive.set(node.color);
        mesh.material.emissiveIntensity = 0.15;
      }
    });
    this.model.getAllConnections().forEach((conn) => {
      const source = this.model.getNode(conn.sourceId);
      const target = this.model.getNode(conn.targetId);
      if (source && target) {
        updateConnectionMesh(conn, source, target);
      }
      const particles = this.flowParticleData.get(conn.id);
      if (particles && source && target) {
        particles.forEach((p) => {
          p.progress += delta * 0.5;
          if (p.progress > 1) p.progress -= 1;
          const pos = new THREE.Vector3().lerpVectors(source.position, target.position, p.progress);
          p.mesh.position.copy(pos);
        });
      }
    });
    const activePackets = this.model.getActivePackets();
    const activePacketIds = new Set(activePackets.map((p) => p.id));
    this.packetMeshMap.forEach((_, pktId) => {
      if (!activePacketIds.has(pktId)) {
        this.removePacketVisual(pktId);
      }
    });
    activePackets.forEach((pkt) => {
      if (!this.packetMeshMap.has(pkt.id) && pkt.active) {
        this.addPacketVisual(pkt);
      }
      this.updatePacketPosition(pkt);
    });
    this.applyHoverEffects();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private applyHoverEffects(): void {
    const isHovering = this.hoveredNodeId !== null;
    const connectedIds = new Set<string>();
    if (isHovering) {
      this.model.getConnectionsForNode(this.hoveredNodeId!).forEach((c) => {
        connectedIds.add(c.sourceId);
        connectedIds.add(c.targetId);
      });
    }
    this.nodeMeshMap.forEach((mesh, id) => {
      const node = this.model.getNode(id);
      if (!node) return;
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const glow = this.nodeGlowMap.get(id);
      const glowMat = glow?.material as THREE.MeshBasicMaterial;
      if (id === this.hoveredNodeId) {
        mesh.scale.setScalar(1.3);
        mat.color.setHex(0xffeb3b);
        mat.emissive.setHex(0xffeb3b);
        mat.emissiveIntensity = 0.3;
        mat.opacity = 1;
        if (glowMat) {
          glowMat.opacity = 0.3;
        }
      } else if (id === this.draggedNodeId) {
        mesh.scale.setScalar(1.2);
        mat.opacity = 1;
        if (glowMat) {
          glowMat.opacity = 0.25;
          glowMat.color.set(node.color);
        }
      } else if (isHovering && connectedIds.has(id)) {
        mesh.scale.setScalar(1);
        mat.color.set(node.color);
        mat.emissive.set(node.color);
        mat.emissiveIntensity = 0.15;
        mat.opacity = 1;
        if (glowMat) glowMat.opacity = 0;
      } else if (isHovering) {
        mesh.scale.setScalar(1);
        mat.color.set(node.color);
        mat.emissive.set(node.color);
        mat.emissiveIntensity = 0.15;
        mat.opacity = 0.3;
        if (glowMat) glowMat.opacity = 0;
      } else {
        mesh.scale.setScalar(1);
        mat.color.set(node.color);
        mat.emissive.set(node.color);
        mat.emissiveIntensity = 0.15;
        mat.opacity = 1;
        if (glowMat) glowMat.opacity = 0;
      }
    });
    this.connLineMap.forEach((lineMesh, connId) => {
      const mat = lineMesh.material as THREE.MeshPhongMaterial;
      if (!isHovering) {
        mat.color.setHex(0xffffff);
        mat.opacity = 0.35;
        return;
      }
      const conn = this.model.getConnection(connId);
      if (
        conn &&
        (conn.sourceId === this.hoveredNodeId || conn.targetId === this.hoveredNodeId)
      ) {
        mat.color.setHex(0x42a5f5);
        mat.opacity = 0.8;
      } else {
        mat.color.setHex(0xffffff);
        mat.opacity = 0.12;
      }
    });
  }

  raycastNodes(mouse: THREE.Vector2): string | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const meshes = Array.from(this.nodeMeshMap.values());
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      return (intersects[0].object.userData as { nodeId: string }).nodeId ?? null;
    }
    return null;
  }

  getWorldPositionFromMouse(mouse: THREE.Vector2, planeY: number): THREE.Vector3 {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  }
}
