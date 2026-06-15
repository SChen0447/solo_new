import * as THREE from 'three';
import { FurnitureType, FurnitureItem, FurnitureDimensions, RoomConfig, FurnitureTypeColors, RecognitionResult } from './types';
import { eventBus, Events } from './eventBus';

class SceneManager {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private furnitureMap: Map<string, THREE.Group> = new Map();
  private furnitureDataMap: Map<string, FurnitureItem> = new Map();
  private selectedFurnitureId: string | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private isRotatingView: boolean = false;
  private dragObject: THREE.Group | null = null;
  private previousMouse: THREE.Vector2;
  private groundPlane: THREE.Mesh | null = null;
  private roomConfig: RoomConfig = {
    width: 10,
    depth: 8,
    height: 3,
    floorColor: '#DEB887',
    wallColor: '#FFFFFF',
  };
  private cameraAngleTheta: number = Math.PI / 4;
  private cameraAnglePhi: number = Math.PI / 4;
  private cameraDistance: number = 12;
  private animationId: number = 0;
  private outlineBox: THREE.BoxHelper | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.previousMouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(Events.RECOGNITION_COMPLETE, this.handleRecognitionComplete.bind(this));
    eventBus.on(Events.FURNITURE_ADD, this.addFurnitureToScene.bind(this));
    eventBus.on(Events.FURNITURE_REMOVE, this.removeFurnitureFromScene.bind(this));
    eventBus.on(Events.FURNITURE_HIGHLIGHT, this.highlightFurniture.bind(this));
    eventBus.on(Events.SCENE_CLEAR, this.clearScene.bind(this));
    eventBus.on(Events.SCENE_EXPORT, this.exportScene.bind(this));
  }

  init(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.renderer.domElement);

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    this.createRoom();
    this.setupLights();
    this.updateCameraPosition();
    this.setupInteraction();

    eventBus.emit(Events.SCENE_READY);
    this.animate();
  }

  private resize(): void {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private createRoom(): void {
    const { width, depth, height } = this.roomConfig;

    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floorCanvas = this.createWoodTexture();
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'ground';
    this.scene.add(floor);
    this.groundPlane = floor;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.roomConfig.wallColor,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMaterial);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    this.createWindow(leftWall);
    this.createDoor(backWall);
  }

  private createWoodTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(139, 90, 43, ${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      for (let x = 0; x < 256; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.05) * 3 + (Math.random() - 0.5) * 2);
      }
      ctx.stroke();
    }

    for (let y = 0; y < 256; y += 64) {
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    return canvas;
  }

  private createWindow(wall: THREE.Mesh): void {
    const windowGroup = new THREE.Group();
    const windowWidth = 1.2;
    const windowHeight = 1.0;

    const frameMaterial = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#87CEEB',
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
    });

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      glassMaterial
    );
    windowGroup.add(glass);

    const frameThickness = 0.08;
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, 0.1),
      frameMaterial
    );
    topFrame.position.y = windowHeight / 2 + frameThickness / 2;
    windowGroup.add(topFrame);

    const bottomFrame = topFrame.clone();
    bottomFrame.position.y = -windowHeight / 2 - frameThickness / 2;
    windowGroup.add(bottomFrame);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, windowHeight, 0.1),
      frameMaterial
    );
    leftFrame.position.x = -windowWidth / 2 - frameThickness / 2;
    windowGroup.add(leftFrame);

    const rightFrame = leftFrame.clone();
    rightFrame.position.x = windowWidth / 2 + frameThickness / 2;
    windowGroup.add(rightFrame);

    windowGroup.position.set(0.1, 1.6, 0);
    windowGroup.rotation.y = -Math.PI / 2;
    wall.parent?.add(windowGroup);
  }

  private createDoor(wall: THREE.Mesh): void {
    const doorGroup = new THREE.Group();
    const doorWidth = 0.9;
    const doorHeight = 2.1;

    const frameMaterial = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.7 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: '#A0522D', roughness: 0.8 });

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, doorHeight, 0.08),
      doorMaterial
    );
    door.position.set(0, doorHeight / 2, 0.05);
    doorGroup.add(door);

    const frameThickness = 0.1;
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + frameThickness * 2, frameThickness, 0.15),
      frameMaterial
    );
    topFrame.position.set(0, doorHeight + frameThickness / 2, 0);
    doorGroup.add(topFrame);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, doorHeight + frameThickness, 0.15),
      frameMaterial
    );
    leftFrame.position.set(-doorWidth / 2 - frameThickness / 2, doorHeight / 2, 0);
    doorGroup.add(leftFrame);

    const rightFrame = leftFrame.clone();
    rightFrame.position.x = doorWidth / 2 + frameThickness / 2;
    doorGroup.add(rightFrame);

    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.8, roughness: 0.2 })
    );
    knob.position.set(doorWidth / 2 - 0.1, doorHeight / 2, 0.12);
    doorGroup.add(knob);

    const { width, depth } = this.roomConfig;
    doorGroup.position.set(width / 2 - 1.5, 0, -depth / 2 + 0.01);
    wall.parent?.add(doorGroup);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const windowLight = new THREE.PointLight(0x87CEEB, 0.5, 10);
    const { depth } = this.roomConfig;
    windowLight.position.set(-this.roomConfig.width / 2 + 0.5, 1.6, 0);
    this.scene.add(windowLight);
  }

  private updateCameraPosition(): void {
    const { cameraAngleTheta, cameraAnglePhi, cameraDistance } = this;
    this.camera.position.x = cameraDistance * Math.sin(cameraAnglePhi) * Math.cos(cameraAngleTheta);
    this.camera.position.y = cameraDistance * Math.cos(cameraAnglePhi);
    this.camera.position.z = cameraDistance * Math.sin(cameraAnglePhi) * Math.sin(cameraAngleTheta);
    this.camera.lookAt(0, 0.5, 0);
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.container) return;

    this.updateMouse(event);

    if (event.button === 2) {
      this.isRotatingView = true;
      this.previousMouse.copy(this.mouse);
      return;
    }

    if (event.button === 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const furnitureMeshes: THREE.Object3D[] = [];
      this.furnitureMap.forEach((group) => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            furnitureMeshes.push(child);
          }
        });
      });

      const intersects = this.raycaster.intersectObjects(furnitureMeshes, false);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !this.furnitureMap.has(obj.name)) {
          obj = obj.parent;
        }
        if (obj) {
          this.dragObject = obj as THREE.Group;
          this.isDragging = true;
          this.selectedFurnitureId = obj.name;
          this.updateHighlight();
          eventBus.emit(Events.FURNITURE_HIGHLIGHT, this.selectedFurnitureId);
          this.previousMouse.copy(this.mouse);
        }
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.container) return;

    this.updateMouse(event);

    if (this.isRotatingView) {
      const deltaX = this.mouse.x - this.previousMouse.x;
      const deltaY = this.mouse.y - this.previousMouse.y;

      this.cameraAngleTheta -= deltaX * Math.PI;
      this.cameraAnglePhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraAnglePhi - deltaY * Math.PI));

      this.updateCameraPosition();
      this.previousMouse.copy(this.mouse);
      return;
    }

    if (this.isDragging && this.dragObject && this.groundPlane) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.groundPlane);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const { width, depth } = this.roomConfig;
        const halfW = width / 2 - 0.5;
        const halfD = depth / 2 - 0.5;

        point.x = Math.max(-halfW, Math.min(halfW, point.x));
        point.z = Math.max(-halfD, Math.min(halfD, point.z));

        this.dragObject.position.x = point.x;
        this.dragObject.position.z = point.z;

        const data = this.furnitureDataMap.get(this.dragObject.name);
        if (data) {
          data.position.x = point.x;
          data.position.z = point.z;
        }

        this.updateOutline();
      }
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isRotatingView = false;
    this.dragObject = null;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (!this.container) return;
    this.updateMouse(event);

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.cameraDistance = Math.max(5, Math.min(25, this.cameraDistance + event.deltaY * 0.01));
      this.updateCameraPosition();
      return;
    }

    if (this.selectedFurnitureId) {
      const group = this.furnitureMap.get(this.selectedFurnitureId);
      const data = this.furnitureDataMap.get(this.selectedFurnitureId);
      if (group && data) {
        const rotationDelta = event.deltaY > 0 ? 0.05 : -0.05;
        group.rotation.y += rotationDelta;
        data.rotation = group.rotation.y;
        this.updateOutline();
      }
    }
  }

  private updateMouse(event: MouseEvent): void {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleRecognitionComplete(result: RecognitionResult): void {
    const item: FurnitureItem = {
      id: result.id,
      type: result.type,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      confidence: result.confidence,
    };
    this.addFurnitureToScene(item);
  }

  private addFurnitureToScene(item: FurnitureItem): void {
    if (this.furnitureMap.has(item.id)) {
      this.highlightFurniture(item.id);
      return;
    }

    const group = this.createFurnitureModel(item.type);
    group.name = item.id;
    group.position.set(item.position.x, item.position.y, item.position.z);
    group.rotation.y = item.rotation;

    const dims = FurnitureDimensions[item.type];
    group.position.y = dims.height / 2;
    item.position.y = dims.height / 2;

    this.scene.add(group);
    this.furnitureMap.set(item.id, group);
    this.furnitureDataMap.set(item.id, item);

    this.selectedFurnitureId = item.id;
    this.updateHighlight();
    this.updateFurnitureList();
  }

  private createFurnitureModel(type: FurnitureType): THREE.Group {
    const group = new THREE.Group();
    const color = FurnitureTypeColors[type];
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

    switch (type) {
      case FurnitureType.SOFA: {
        const dims = FurnitureDimensions[type];
        const seatHeight = 0.4;
        const backHeight = dims.height - seatHeight;
        const armHeight = dims.height - 0.1;

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, seatHeight, dims.depth),
          material
        );
        base.position.y = seatHeight / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        const back = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, backHeight, 0.2),
          material
        );
        back.position.set(0, seatHeight + backHeight / 2, -dims.depth / 2 + 0.1);
        back.castShadow = true;
        group.add(back);

        const arm1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, armHeight, dims.depth),
          material
        );
        arm1.position.set(-dims.width / 2 + 0.1, armHeight / 2, 0);
        arm1.castShadow = true;
        group.add(arm1);

        const arm2 = arm1.clone();
        arm2.position.x = dims.width / 2 - 0.1;
        group.add(arm2);

        const cushion = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width - 0.1, 0.12, dims.depth - 0.3),
          new THREE.MeshStandardMaterial({ color: this.lightenColor(color, 20), roughness: 0.6 })
        );
        cushion.position.set(0, seatHeight + 0.06, 0.05);
        cushion.castShadow = true;
        group.add(cushion);
        break;
      }

      case FurnitureType.TABLE: {
        const dims = FurnitureDimensions[type];
        const topThickness = 0.05;
        const legHeight = dims.height - topThickness;
        const legRadius = 0.04;

        const top = new THREE.Mesh(
          new THREE.CylinderGeometry(Math.max(dims.width, dims.depth) / 2, Math.max(dims.width, dims.depth) / 2, topThickness, 64),
          material
        );
        top.position.y = legHeight + topThickness / 2;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const legPositions = [
          [-dims.width / 3, -dims.depth / 3],
          [dims.width / 3, -dims.depth / 3],
          [-dims.width / 3, dims.depth / 3],
          [dims.width / 3, dims.depth / 3],
        ];

        legPositions.forEach(([x, z]) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16),
            darkMaterial
          );
          leg.position.set(x, legHeight / 2, z);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case FurnitureType.DESK: {
        const dims = FurnitureDimensions[type];
        const topThickness = 0.05;
        const legHeight = dims.height - topThickness;

        const top = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, topThickness, dims.depth),
          material
        );
        top.position.y = legHeight + topThickness / 2;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const legThickness = 0.08;
        const corners = [
          [-dims.width / 2 + legThickness / 2, -dims.depth / 2 + legThickness / 2],
          [dims.width / 2 - legThickness / 2, -dims.depth / 2 + legThickness / 2],
          [-dims.width / 2 + legThickness / 2, dims.depth / 2 - legThickness / 2],
          [dims.width / 2 - legThickness / 2, dims.depth / 2 - legThickness / 2],
        ];

        corners.forEach(([x, z]) => {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(legThickness, legHeight, legThickness),
            darkMaterial
          );
          leg.position.set(x, legHeight / 2, z);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case FurnitureType.BED: {
        const dims = FurnitureDimensions[type];
        const frameHeight = 0.2;
        const mattressThickness = 0.25;
        const headboardHeight = 1.0;

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, frameHeight, dims.depth),
          darkMaterial
        );
        frame.position.y = frameHeight / 2;
        frame.castShadow = true;
        frame.receiveShadow = true;
        group.add(frame);

        const mattress = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width - 0.1, mattressThickness, dims.depth - 0.1),
          new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 })
        );
        mattress.position.y = frameHeight + mattressThickness / 2;
        mattress.castShadow = true;
        group.add(mattress);

        const headboard = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, headboardHeight, 0.15),
          material
        );
        headboard.position.set(0, frameHeight + headboardHeight / 2, -dims.depth / 2 + 0.075);
        headboard.castShadow = true;
        group.add(headboard);

        const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFAF0, roughness: 0.9 });
        const pillow1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.1, 0.35),
          pillowMaterial
        );
        pillow1.position.set(-dims.width / 4, frameHeight + mattressThickness + 0.05, -dims.depth / 2 + 0.35);
        pillow1.rotation.x = -0.1;
        group.add(pillow1);

        const pillow2 = pillow1.clone();
        pillow2.position.x = dims.width / 4;
        group.add(pillow2);
        break;
      }

      case FurnitureType.CABINET: {
        const dims = FurnitureDimensions[type];

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(dims.width, dims.height, dims.depth),
          material
        );
        body.position.y = dims.height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const doorMaterial = new THREE.MeshStandardMaterial({ color: this.lightenColor(color, 15), roughness: 0.7 });
        const doorWidth = (dims.width - 0.05) / 2;
        const doorHeight = dims.height - 0.1;

        const door1 = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth, doorHeight, 0.04),
          doorMaterial
        );
        door1.position.set(-doorWidth / 2 - 0.0125, dims.height / 2, dims.depth / 2 + 0.02);
        group.add(door1);

        const door2 = door1.clone();
        door2.position.x = doorWidth / 2 + 0.0125;
        group.add(door2);

        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.8, roughness: 0.2 });
        const handle1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8),
          handleMaterial
        );
        handle1.rotation.z = Math.PI / 2;
        handle1.position.set(-0.05, dims.height / 2, dims.depth / 2 + 0.06);
        group.add(handle1);

        const handle2 = handle1.clone();
        handle2.position.x = 0.05;
        group.add(handle2);

        const shelfThickness = 0.02;
        for (let i = 1; i <= 3; i++) {
          const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(dims.width - 0.08, shelfThickness, dims.depth - 0.08),
            darkMaterial
          );
          shelf.position.set(0, (dims.height / 4) * i, 0);
          group.add(shelf);
        }
        break;
      }
    }

    return group;
  }

  private lightenColor(hex: string, percent: number): number {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return (R << 16) | (G << 8) | B;
  }

  private removeFurnitureFromScene(id: string): void {
    const group = this.furnitureMap.get(id);
    if (group) {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.furnitureMap.delete(id);
      this.furnitureDataMap.delete(id);

      if (this.selectedFurnitureId === id) {
        this.selectedFurnitureId = null;
        this.removeOutline();
      }

      this.updateFurnitureList();
    }
  }

  private highlightFurniture(id: string | null): void {
    this.selectedFurnitureId = id;
    this.updateHighlight();
  }

  private updateHighlight(): void {
    this.removeOutline();

    if (this.selectedFurnitureId) {
      const group = this.furnitureMap.get(this.selectedFurnitureId);
      if (group) {
        this.outlineBox = new THREE.BoxHelper(group, 0x00ff00);
        (this.outlineBox.material as THREE.Material).transparent = true;
        (this.outlineBox.material as THREE.LineBasicMaterial).opacity = 0.8;
        this.scene.add(this.outlineBox);
        this.addDimensionLabels(group);
      }
    }
  }

  private updateOutline(): void {
    if (this.outlineBox && this.selectedFurnitureId) {
      const group = this.furnitureMap.get(this.selectedFurnitureId);
      if (group) {
        this.outlineBox.update();
      }
    }
  }

  private removeOutline(): void {
    if (this.outlineBox) {
      this.scene.remove(this.outlineBox);
      this.outlineBox.geometry.dispose();
      (this.outlineBox.material as THREE.Material).dispose();
      this.outlineBox = null;
    }
    this.removeDimensionLabels();
  }

  private dimensionSprites: THREE.Sprite[] = [];

  private addDimensionLabels(group: THREE.Group): void {
    this.removeDimensionLabels();
    const id = group.name;
    const data = this.furnitureDataMap.get(id);
    if (!data) return;

    const dims = FurnitureDimensions[data.type];
    const labels = [
      { text: `长: ${dims.width}m`, position: new THREE.Vector3(group.position.x, group.position.y + dims.height / 2 + 0.3, group.position.z + dims.depth / 2 + 0.3) },
      { text: `宽: ${dims.depth}m`, position: new THREE.Vector3(group.position.x + dims.width / 2 + 0.3, group.position.y + dims.height / 2 + 0.3, group.position.z) },
      { text: `高: ${dims.height}m`, position: new THREE.Vector3(group.position.x, group.position.y + dims.height + 0.3, group.position.z) },
    ];

    labels.forEach((label) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.roundRect(0, 0, 256, 64, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.text, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(label.position);
      sprite.scale.set(0.8, 0.2, 1);
      sprite.renderOrder = 999;
      this.scene.add(sprite);
      this.dimensionSprites.push(sprite);
    });
  }

  private removeDimensionLabels(): void {
    this.dimensionSprites.forEach((sprite) => {
      this.scene.remove(sprite);
      (sprite.material as THREE.Material).dispose();
      if ((sprite.material as THREE.SpriteMaterial).map) {
        (sprite.material as THREE.SpriteMaterial).map!.dispose();
      }
    });
    this.dimensionSprites = [];
  }

  private clearScene(): void {
    const ids = Array.from(this.furnitureMap.keys());
    ids.forEach((id) => this.removeFurnitureFromScene(id));
    this.selectedFurnitureId = null;
    this.removeOutline();
    this.updateFurnitureList();
  }

  private updateFurnitureList(): void {
    const items = Array.from(this.furnitureDataMap.values());
    eventBus.emit(Events.FURNITURE_LIST_UPDATE, items);
  }

  private exportScene(): void {
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `furniture-scene-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resize.bind(this));
    this.renderer.dispose();
  }
}

export const sceneManager = new SceneManager();
