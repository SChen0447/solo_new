import * as THREE from 'three';
import type { BuildingData, BuildingMesh, EditorMode } from './types';

type BuildingUpdateCallback = (buildings: BuildingData[]) => void;
type BuildingSelectCallback = (id: string | null) => void;

export class BuildingModule {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private buildings: Map<string, { data: BuildingData; mesh: BuildingMesh; edges: THREE.LineSegments }> = new Map();
  private buildingCounter = 0;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private isDragging = false;
  private dragStartPos = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private dragMesh: BuildingMesh | null = null;

  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  public currentWidth = 15;
  public currentHeight = 30;
  public currentDepth = 15;

  private editorMode: EditorMode = 'select';

  private onUpdate: BuildingUpdateCallback = () => {};
  private onSelect: BuildingSelectCallback = () => {};

  private ghostMesh: BuildingMesh | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.bindEvents();
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousemove', this.handleMouseMove.bind(this));
    dom.addEventListener('mousedown', this.handleMouseDown.bind(this));
    dom.addEventListener('mouseup', this.handleMouseUp.bind(this));
    dom.addEventListener('click', this.handleClick.bind(this));
  }

  private createWindowTexture(width: number, height: number, depth: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const windowCols = Math.max(3, Math.floor(width / 3));
    const windowRows = Math.max(2, Math.floor(height / 3.5));
    const cellW = 64;
    const cellH = 64;
    canvas.width = windowCols * cellW;
    canvas.height = windowRows * cellH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const x = col * cellW + 8;
        const y = row * cellH + 8;
        const w = cellW - 16;
        const h = cellH - 16;
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? '#4a4a5a' : '#333348';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        if (isLight && Math.random() > 0.55) {
          ctx.fillStyle = '#5a5a7a';
          ctx.fillRect(x + 2, y + 2, (w - 4) / 2 - 1, h - 4);
        }
      }
    }

    ctx.strokeStyle = 'rgba(0, 212, 170, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createTopTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#252538';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = 'rgba(0, 212, 170, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 212, 170, 0.25)';
    ctx.fillRect(48, 48, 32, 32);
    ctx.fillRect(88, 88, 24, 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createBuildingMesh(data: BuildingData, isGhost = false): BuildingMesh {
    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);

    const sideTex = this.createWindowTexture(data.width, data.height, data.depth);
    const topTex = this.createTopTexture();

    const materials = [
      new THREE.MeshStandardMaterial({
        map: sideTex,
        roughness: 0.75,
        metalness: 0.12,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      }),
      new THREE.MeshStandardMaterial({
        map: sideTex,
        roughness: 0.75,
        metalness: 0.12,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      }),
      new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.85,
        metalness: 0.08,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      }),
      new THREE.MeshStandardMaterial({
        color: 0x1e1e30,
        roughness: 0.9,
        metalness: 0.05,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      }),
      new THREE.MeshStandardMaterial({
        map: sideTex,
        roughness: 0.75,
        metalness: 0.12,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      }),
      new THREE.MeshStandardMaterial({
        map: sideTex,
        roughness: 0.75,
        metalness: 0.12,
        transparent: isGhost,
        opacity: isGhost ? 0.45 : 1
      })
    ];

    const mesh = new THREE.Mesh(geometry, materials) as BuildingMesh;
    mesh.position.set(data.position.x, data.position.y + data.height / 2, data.position.z);
    mesh.castShadow = !isGhost;
    mesh.receiveShadow = !isGhost;
    mesh.userData = {
      buildingId: data.id,
      isBuilding: true
    };

    return mesh;
  }

  private createEdges(mesh: BuildingMesh): THREE.LineSegments {
    const edgeGeo = new THREE.EdgesGeometry(mesh.geometry);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00d4aa,
      transparent: true,
      opacity: 0
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    mesh.add(edges);
    return edges;
  }

  public addBuilding(x = 0, z = 0): BuildingData {
    this.buildingCounter++;
    const id = `building_${Date.now()}_${this.buildingCounter}`;
    const data: BuildingData = {
      id,
      name: `建筑 ${this.buildingCounter}`,
      position: { x, y: 0, z },
      width: this.currentWidth,
      height: this.currentHeight,
      depth: this.currentDepth
    };

    const mesh = this.createBuildingMesh(data);
    const edges = this.createEdges(mesh);
    this.scene.add(mesh);
    this.buildings.set(id, { data, mesh, edges });
    this.notifyUpdate();
    this.selectBuilding(id);
    return data;
  }

  public deleteBuilding(id: string): boolean {
    const entry = this.buildings.get(id);
    if (!entry) return false;

    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    if (Array.isArray(entry.mesh.material)) {
      entry.mesh.material.forEach((m) => m.dispose());
    }
    this.buildings.delete(id);

    if (this.selectedId === id) {
      this.selectedId = null;
      this.onSelect(null);
    }

    this.notifyUpdate();
    return true;
  }

  public deleteSelected(): void {
    if (this.selectedId) {
      this.deleteBuilding(this.selectedId);
    }
  }

  public selectBuilding(id: string | null): void {
    this.buildings.forEach((entry, bid) => {
      const edgeMat = entry.edges.material as THREE.LineBasicMaterial;
      if (bid === id) {
        edgeMat.opacity = 0.9;
        edgeMat.color.setHex(0x00d4aa);
        entry.mesh.scale.setScalar(1.01);
      } else {
        edgeMat.opacity = 0;
        entry.mesh.scale.setScalar(1);
      }
    });

    this.selectedId = id;
    this.onSelect(id);
  }

  public getSelectedId(): string | null {
    return this.selectedId;
  }

  public updateSelectedDimensions(w: number, h: number, d: number): void {
    if (!this.selectedId) return;
    const entry = this.buildings.get(this.selectedId);
    if (!entry) return;

    entry.data.width = w;
    entry.data.height = h;
    entry.data.depth = d;

    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    if (Array.isArray(entry.mesh.material)) {
      entry.mesh.material.forEach((m) => m.dispose());
    }

    const newMesh = this.createBuildingMesh(entry.data);
    const newEdges = this.createEdges(newMesh);
    (newEdges.material as THREE.LineBasicMaterial).opacity = 0.9;
    newMesh.scale.setScalar(1.01);
    this.scene.add(newMesh);
    this.buildings.set(this.selectedId, { data: entry.data, mesh: newMesh, edges: newEdges });

    this.notifyUpdate();
  }

  public getBuildings(): BuildingData[] {
    return Array.from(this.buildings.values()).map((e) => e.data);
  }

  public getBuildingMeshes(): BuildingMesh[] {
    return Array.from(this.buildings.values()).map((e) => e.mesh);
  }

  public setEditorMode(mode: EditorMode): void {
    this.editorMode = mode;
    if (mode === 'add') {
      this.showGhost();
    } else {
      this.hideGhost();
    }
  }

  public getEditorMode(): EditorMode {
    return this.editorMode;
  }

  private showGhost(): void {
    this.hideGhost();
    const data: BuildingData = {
      id: 'ghost',
      name: '',
      position: { x: 0, y: 0, z: 0 },
      width: this.currentWidth,
      height: this.currentHeight,
      depth: this.currentDepth
    };
    this.ghostMesh = this.createBuildingMesh(data, true);
    this.scene.add(this.ghostMesh);
  }

  private hideGhost(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      if (Array.isArray(this.ghostMesh.material)) {
        this.ghostMesh.material.forEach((m) => m.dispose());
      }
      this.ghostMesh = null;
    }
  }

  public updateGhostDimensions(): void {
    if (this.editorMode !== 'add' || !this.ghostMesh) return;
    const mat = this.ghostMesh.material as THREE.MeshStandardMaterial[];
    const pos = this.ghostMesh.position.clone();
    this.hideGhost();
    const data: BuildingData = {
      id: 'ghost',
      name: '',
      position: { x: pos.x, y: 0, z: pos.z },
      width: this.currentWidth,
      height: this.currentHeight,
      depth: this.currentDepth
    };
    this.ghostMesh = this.createBuildingMesh(data, true);
    this.ghostMesh.position.copy(pos);
    this.scene.add(this.ghostMesh);
  }

  public setUpdateCallback(cb: BuildingUpdateCallback): void {
    this.onUpdate = cb;
  }

  public setSelectCallback(cb: BuildingSelectCallback): void {
    this.onSelect = cb;
  }

  private notifyUpdate(): void {
    this.onUpdate(this.getBuildings());
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.groundPlane, hit);
    return result ? hit : null;
  }

  private intersectBuildings(): BuildingMesh | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.buildings.values()).map((e) => e.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      return hits[0].object as BuildingMesh;
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.isDragging && this.dragMesh) {
      const hit = this.intersectGround();
      if (hit) {
        const newX = Math.max(-95, Math.min(95, hit.x - this.dragOffset.x));
        const newZ = Math.max(-95, Math.min(95, hit.z - this.dragOffset.z));
        this.dragMesh.position.x = newX;
        this.dragMesh.position.z = newZ;
        const entry = this.buildings.get(this.dragMesh.userData.buildingId);
        if (entry) {
          entry.data.position.x = newX;
          entry.data.position.z = newZ;
        }
      }
      return;
    }

    if (this.ghostMesh) {
      const hit = this.intersectGround();
      if (hit) {
        this.ghostMesh.position.x = Math.max(-95, Math.min(95, hit.x));
        this.ghostMesh.position.z = Math.max(-95, Math.min(95, hit.z));
      }
    }

    const hitMesh = this.intersectBuildings();
    const newHovered = hitMesh ? hitMesh.userData.buildingId : null;
    if (newHovered !== this.hoveredId) {
      this.buildings.forEach((entry, id) => {
        const edgeMat = entry.edges.material as THREE.LineBasicMaterial;
        if (id === this.selectedId) {
          edgeMat.opacity = 0.9;
        } else if (id === newHovered) {
          edgeMat.opacity = 0.45;
          edgeMat.color.setHex(0x00e5ff);
        } else {
          edgeMat.opacity = 0;
        }
      });
      this.hoveredId = newHovered;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.updateMouse(e);

    const hitMesh = this.intersectBuildings();

    if (this.editorMode === 'move' && hitMesh) {
      this.isDragging = true;
      this.dragMesh = hitMesh;
      const hit = this.intersectGround();
      if (hit) {
        this.dragStartPos.copy(hit);
        this.dragOffset.set(
          hit.x - hitMesh.position.x,
          0,
          hit.z - hitMesh.position.z
        );
      }
      this.selectBuilding(hitMesh.userData.buildingId);
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.isDragging) {
      this.isDragging = false;
      this.dragMesh = null;
      this.notifyUpdate();
      this.renderer.domElement.style.cursor = '';
    }
  }

  private handleClick(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.isDragging) return;
    this.updateMouse(e);

    if (this.editorMode === 'add') {
      const hit = this.intersectGround();
      if (hit) {
        this.addBuilding(
          Math.max(-95, Math.min(95, hit.x)),
          Math.max(-95, Math.min(95, hit.z))
        );
      }
      return;
    }

    const hitMesh = this.intersectBuildings();
    if (hitMesh) {
      this.selectBuilding(hitMesh.userData.buildingId);
    } else if (this.editorMode === 'select') {
      this.selectBuilding(null);
    }
  }

  public dispose(): void {
    const dom = this.renderer.domElement;
    dom.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    dom.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    dom.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    dom.removeEventListener('click', this.handleClick.bind(this));

    this.buildings.forEach((entry) => {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      if (Array.isArray(entry.mesh.material)) {
        entry.mesh.material.forEach((m) => m.dispose());
      }
    });
    this.buildings.clear();
  }
}
