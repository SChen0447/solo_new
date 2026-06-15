import * as THREE from 'three';
import { GraphModel } from '../models/graphModel';
import { SceneManager } from '../renderer/sceneManager';

export class InteractionHandler {
  private model: GraphModel;
  private sceneManager: SceneManager;
  private container: HTMLElement;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private isDragging = false;
  private dragNodeId: string | null = null;
  private shiftClickSource: string | null = null;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private infoPanel: HTMLElement;
  private infoName: HTMLElement;
  private infoConnections: HTMLElement;
  private infoPackets: HTMLElement;

  constructor(model: GraphModel, sceneManager: SceneManager, container: HTMLElement) {
    this.model = model;
    this.sceneManager = sceneManager;
    this.container = container;
    this.infoPanel = document.getElementById('info-panel')!;
    this.infoName = document.getElementById('info-name')!;
    this.infoConnections = document.getElementById('info-connections')!;
    this.infoPackets = document.getElementById('info-packets')!;
    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.sceneManager.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', () => this.onMouseLeave());
  }

  private getMouseNDC(e: MouseEvent): THREE.Vector2 {
    const rect = this.container.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouse = this.getMouseNDC(e);
    const hitId = this.sceneManager.raycastNodes(this.mouse);
    if (hitId) {
      if (e.shiftKey) {
        if (this.shiftClickSource && this.shiftClickSource !== hitId) {
          const conn = this.model.addConnection(this.shiftClickSource, hitId);
          if (conn) {
            this.sceneManager.addConnectionVisual(conn);
          }
          this.shiftClickSource = null;
        } else {
          this.shiftClickSource = hitId;
        }
        return;
      }
      this.isDragging = true;
      this.dragNodeId = hitId;
      this.sceneManager.setDraggedNode(hitId);
      this.sceneManager.controls.enabled = false;
      const node = this.model.getNode(hitId);
      if (node) {
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1).applyQuaternion(this.sceneManager.camera.quaternion),
          node.position
        );
        const intersection = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        raycaster.ray.intersectPlane(this.dragPlane, intersection);
        this.dragOffset.copy(node.position).sub(intersection);
      }
      this.model.setSelectedNodeId(hitId);
    } else {
      this.shiftClickSource = null;
      this.model.setSelectedNodeId(null);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse = this.getMouseNDC(e);
    if (this.isDragging && this.dragNodeId) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(this.dragPlane, intersection);
      if (intersection) {
        const newPos = intersection.add(this.dragOffset);
        this.model.updateNodePosition(this.dragNodeId, newPos);
      }
    } else {
      const hitId = this.sceneManager.raycastNodes(this.mouse);
      this.sceneManager.setHoveredNode(hitId);
      this.updateInfoPanel(hitId);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.sceneManager.setDraggedNode(null);
      this.dragNodeId = null;
      this.sceneManager.controls.enabled = true;
    }
  }

  private onMouseLeave(): void {
    this.sceneManager.setHoveredNode(null);
    this.infoPanel.classList.remove('visible');
    if (this.isDragging) {
      this.isDragging = false;
      this.sceneManager.setDraggedNode(null);
      this.dragNodeId = null;
      this.sceneManager.controls.enabled = true;
    }
  }

  private updateInfoPanel(nodeId: string | null): void {
    if (!nodeId) {
      this.infoPanel.classList.remove('visible');
      return;
    }
    const node = this.model.getNode(nodeId);
    if (!node) {
      this.infoPanel.classList.remove('visible');
      return;
    }
    this.infoName.textContent = node.name;
    this.infoConnections.textContent = String(this.model.getConnectionCount(nodeId));
    this.infoPackets.textContent = String(node.receivedPackets);
    this.infoPanel.classList.add('visible');
  }
}
