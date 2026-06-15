import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { EventBus } from './eventBus';
import { DataPoint } from './dataManager';

interface PointObject {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalScale: number;
  baseColor: THREE.Color;
}

const INITIAL_CAMERA_POS = new THREE.Vector3(120, 80, 120);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export class SceneRenderer {
  private eventBus: EventBus;
  private container: HTMLElement;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private pointsGroup: THREE.Group;
  private pointObjects: Map<number, PointObject> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredPointId: number | null = null;

  private sphereGeometry: THREE.SphereGeometry;

  private animationFrameId: number = 0;
  private isResetting: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 200;
    this.controls.target.copy(INITIAL_CAMERA_TARGET);

    this.pointsGroup = new THREE.Group();
    this.scene.add(this.pointsGroup);

    this.sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init(): void {
    this.setupLights();
    this.setupGrid();
    this.setupAxes();

    this.setupEventListeners();

    this.eventBus.on('dataUpdated', (data: DataPoint[]) => this.onDataUpdated(data));
    this.eventBus.on('resetView', () => this.onResetView());
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(80, 100, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-60, 40, -50);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const grid = new THREE.GridHelper(120, 12, 0x555577, 0x333355);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    grid.position.y = -55;
    this.scene.add(grid);

    const gridXZ = new THREE.GridHelper(120, 12, 0x555577, 0x333355);
    (gridXZ.material as THREE.Material).transparent = true;
    (gridXZ.material as THREE.Material).opacity = 0.2;
    gridXZ.rotation.x = Math.PI / 2;
    gridXZ.position.z = 0;
    this.scene.add(gridXZ);

    const gridXY = new THREE.GridHelper(120, 12, 0x555577, 0x333355);
    (gridXY.material as THREE.Material).transparent = true;
    (gridXY.material as THREE.Material).opacity = 0.2;
    gridXY.rotation.z = Math.PI / 2;
    gridXY.position.x = 0;
    this.scene.add(gridXY);
  }

  private setupAxes(): void {
    const axisLength = 60;

    this.addAxisArrow(new THREE.Vector3(axisLength, 0, 0), 0xff3355, 'X');
    this.addAxisArrow(new THREE.Vector3(0, axisLength, 0), 0x33ff66, 'Y');
    this.addAxisArrow(new THREE.Vector3(0, 0, axisLength), 0x5588ff, 'Z');

    const xGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xMat = new THREE.LineBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.7 });
    this.scene.add(new THREE.Line(xGeom, xMat));

    const yGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yMat = new THREE.LineBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.7 });
    this.scene.add(new THREE.Line(yGeom, yMat));

    const zGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x5588ff, transparent: true, opacity: 0.7 });
    this.scene.add(new THREE.Line(zGeom, zMat));
  }

  private addAxisArrow(direction: THREE.Vector3, color: number, _label: string): void {
    const dir = direction.clone().normalize();
    const origin = new THREE.Vector3(0, 0, 0);
    const length = direction.length();
    const arrow = new THREE.ArrowHelper(dir, origin, length, color, 5, 3);
    this.scene.add(arrow);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mouseleave', () => this.onMouseLeave());
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const screenX = event.clientX;
    const screenY = event.clientY;
    this.eventBus.emit('hoverMove', screenX, screenY);
  }

  private onMouseLeave(): void {
    if (this.hoveredPointId !== null) {
      this.restorePointScale(this.hoveredPointId);
      this.hoveredPointId = null;
      this.eventBus.emit('hoverEnd');
    }
  }

  private createPoint(pointData: DataPoint): PointObject {
    const color = new THREE.Color(pointData.color);

    const material = new THREE.MeshPhongMaterial({
      color,
      shininess: 80,
      specular: 0x444444,
      transparent: true,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(this.sphereGeometry, material);
    mesh.position.set(pointData.x, pointData.y, pointData.z);
    mesh.scale.setScalar(pointData.size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { pointId: pointData.id, pointData };

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    const shadowMesh = new THREE.Mesh(this.sphereGeometry, shadowMaterial);
    shadowMesh.scale.setScalar(pointData.size);
    shadowMesh.position.set(pointData.x, -54.5, pointData.z);
    this.pointsGroup.add(shadowMesh);
    mesh.userData.shadowMesh = shadowMesh;

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(this.sphereGeometry, haloMaterial);
    halo.scale.setScalar(pointData.size * 1.8);
    halo.position.copy(mesh.position);
    this.pointsGroup.add(halo);

    this.pointsGroup.add(mesh);

    return {
      mesh,
      halo,
      originalPosition: new THREE.Vector3(pointData.x, pointData.y, pointData.z),
      originalScale: pointData.size,
      baseColor: color.clone()
    };
  }

  private onDataUpdated(data: DataPoint[]): void {
    const visibleIds = new Set<number>();

    for (const pointData of data) {
      visibleIds.add(pointData.id);
      let obj = this.pointObjects.get(pointData.id);
      if (!obj) {
        obj = this.createPoint(pointData);
        this.pointObjects.set(pointData.id, obj);
      }
      this.animatePointVisibility(obj, pointData);
    }

    for (const [id, obj] of this.pointObjects) {
      if (!visibleIds.has(id)) {
        this.animatePointOut(obj);
      }
    }
  }

  private animatePointVisibility(obj: PointObject, pointData: DataPoint): void {
    const material = obj.mesh.material as THREE.MeshPhongMaterial;
    const haloMaterial = obj.halo.material as THREE.MeshBasicMaterial;
    const wasVisible = material.opacity > 0.01;

    if (pointData.visible) {
      if (!wasVisible) {
        material.opacity = 0;
        haloMaterial.opacity = 0;
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80
        );
        obj.mesh.position.copy(obj.originalPosition).add(randomOffset);
        const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
        shadowMesh.position.set(obj.mesh.position.x, -54.5, obj.mesh.position.z);
      }

      const posTarget = { x: pointData.x, y: pointData.y, z: pointData.z };
      const currentPos = { x: obj.mesh.position.x, y: obj.mesh.position.y, z: obj.mesh.position.z };

      new TWEEN.Tween(currentPos)
        .to(posTarget, 800)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          obj.mesh.position.set(currentPos.x, currentPos.y, currentPos.z);
          obj.halo.position.copy(obj.mesh.position);
          const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
          shadowMesh.position.x = currentPos.x;
          shadowMesh.position.z = currentPos.z;
        })
        .start();

      if (!wasVisible) {
        const opacityObj = { opacity: 0, shadowOpacity: 0 };
        new TWEEN.Tween(opacityObj)
          .to({ opacity: 1, shadowOpacity: 0.3 }, 300)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            material.opacity = opacityObj.opacity;
            const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
            (shadowMesh.material as THREE.MeshBasicMaterial).opacity = opacityObj.shadowOpacity;
          })
          .start();
      }
    } else {
      if (wasVisible && !this.isResetting) {
        const opacityObj = { opacity: material.opacity, shadowOpacity: 0.3 };
        new TWEEN.Tween(opacityObj)
          .to({ opacity: 0, shadowOpacity: 0 }, 300)
          .easing(TWEEN.Easing.Quadratic.In)
          .onUpdate(() => {
            material.opacity = opacityObj.opacity;
            haloMaterial.opacity = 0;
            const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
            (shadowMesh.material as THREE.MeshBasicMaterial).opacity = opacityObj.shadowOpacity;
          })
          .start();
      }
    }
  }

  private animatePointOut(obj: PointObject): void {
    const material = obj.mesh.material as THREE.MeshPhongMaterial;
    const haloMaterial = obj.halo.material as THREE.MeshBasicMaterial;
    if (material.opacity > 0.01 && !this.isResetting) {
      const opacityObj = { opacity: material.opacity, shadowOpacity: 0.3 };
      new TWEEN.Tween(opacityObj)
        .to({ opacity: 0, shadowOpacity: 0 }, 300)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(() => {
          material.opacity = opacityObj.opacity;
          haloMaterial.opacity = 0;
          const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
          (shadowMesh.material as THREE.MeshBasicMaterial).opacity = opacityObj.shadowOpacity;
        })
        .start();
    }
  }

  private onResetView(): void {
    this.isResetting = true;
    TWEEN.removeAll();

    for (const [, obj] of this.pointObjects) {
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
      const startPos = obj.originalPosition.clone().add(randomOffset);
      obj.mesh.position.copy(startPos);
      obj.halo.position.copy(startPos);
      const shadowMesh = obj.mesh.userData.shadowMesh as THREE.Mesh;
      shadowMesh.position.set(startPos.x, -54.5, startPos.z);

      const material = obj.mesh.material as THREE.MeshPhongMaterial;
      const haloMaterial = obj.halo.material as THREE.MeshBasicMaterial;
      material.opacity = 1;
      haloMaterial.opacity = 0;
      (shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3;

      const posCurrent = { x: startPos.x, y: startPos.y, z: startPos.z };
      const targetPos = {
        x: obj.originalPosition.x,
        y: obj.originalPosition.y,
        z: obj.originalPosition.z
      };

      new TWEEN.Tween(posCurrent)
        .to(targetPos, 1200)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          obj.mesh.position.set(posCurrent.x, posCurrent.y, posCurrent.z);
          obj.halo.position.copy(obj.mesh.position);
          shadowMesh.position.x = posCurrent.x;
          shadowMesh.position.z = posCurrent.z;
        })
        .onComplete(() => {
          this.isResetting = false;
        })
        .start();
    }

    const camStart = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      tx: this.controls.target.x,
      ty: this.controls.target.y,
      tz: this.controls.target.z
    };

    new TWEEN.Tween(camStart)
      .to({
        x: INITIAL_CAMERA_POS.x,
        y: INITIAL_CAMERA_POS.y,
        z: INITIAL_CAMERA_POS.z,
        tx: INITIAL_CAMERA_TARGET.x,
        ty: INITIAL_CAMERA_TARGET.y,
        tz: INITIAL_CAMERA_TARGET.z
      }, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.set(camStart.x, camStart.y, camStart.z);
        this.controls.target.set(camStart.tx, camStart.ty, camStart.tz);
      })
      .start();
  }

  private restorePointScale(pointId: number): void {
    const obj = this.pointObjects.get(pointId);
    if (!obj) return;

    const material = obj.mesh.material as THREE.MeshPhongMaterial;
    const haloMaterial = obj.halo.material as THREE.MeshBasicMaterial;

    const scaleObj = { s: obj.mesh.scale.x };
    new TWEEN.Tween(scaleObj)
      .to({ s: obj.originalScale }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        obj.mesh.scale.setScalar(scaleObj.s);
        obj.halo.scale.setScalar(scaleObj.s * 1.8);
      })
      .start();

    const haloOpacityObj = { o: haloMaterial.opacity };
    new TWEEN.Tween(haloOpacityObj)
      .to({ o: 0 }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        haloMaterial.opacity = haloOpacityObj.o;
      })
      .start();

    material.emissive = new THREE.Color(0x000000);
  }

  private highlightPoint(pointId: number): void {
    const obj = this.pointObjects.get(pointId);
    if (!obj) return;

    const material = obj.mesh.material as THREE.MeshPhongMaterial;
    const haloMaterial = obj.halo.material as THREE.MeshBasicMaterial;
    const targetScale = obj.originalScale * 1.2;

    const scaleObj = { s: obj.mesh.scale.x };
    new TWEEN.Tween(scaleObj)
      .to({ s: targetScale }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        obj.mesh.scale.setScalar(scaleObj.s);
        obj.halo.scale.setScalar(scaleObj.s * 1.8);
      })
      .start();

    const haloOpacityObj = { o: haloMaterial.opacity };
    new TWEEN.Tween(haloOpacityObj)
      .to({ o: 0.35 }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        haloMaterial.opacity = haloOpacityObj.o;
      })
      .start();

    haloMaterial.color.copy(obj.baseColor).multiplyScalar(1.5);
    material.emissive = obj.baseColor.clone().multiplyScalar(0.3);
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    for (const [, obj] of this.pointObjects) {
      const mat = obj.mesh.material as THREE.MeshPhongMaterial;
      if (mat.opacity > 0.1) {
        meshes.push(obj.mesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const pointId = (hit.object.userData.pointId) as number;
      const pointData = hit.object.userData.pointData as DataPoint;

      if (this.hoveredPointId !== pointId) {
        if (this.hoveredPointId !== null) {
          this.restorePointScale(this.hoveredPointId);
        }
        this.hoveredPointId = pointId;
        this.highlightPoint(pointId);
        this.eventBus.emit('hoverStart', pointData);
      }
    } else {
      if (this.hoveredPointId !== null) {
        this.restorePointScale(this.hoveredPointId);
        this.hoveredPointId = null;
        this.eventBus.emit('hoverEnd');
      }
    }
  }

  animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    TWEEN.update();
    this.updateHover();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
    this.sphereGeometry.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
