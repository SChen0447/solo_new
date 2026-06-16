import * as THREE from 'three';
import { Terrain } from './terrain';
import { Fault } from './fault';
import { Vein, VeinType } from './vein';
import { UI } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private terrain: Terrain;
  private faults: Fault[] = [];
  private veins: Vein[] = [];
  private ui: UI;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isRotating: boolean = false;
  private isDraggingControl: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: -0.5, y: 0.5 };
  private currentRotation: { x: number; y: number } = { x: -0.5, y: 0.5 };
  private targetDistance: number = 60;
  private currentDistance: number = 60;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, -5, 0);

  private velocity: { x: number; y: number } = { x: 0, y: 0 };
  private clock: THREE.Clock;

  private draggingFault: Fault | null = null;
  private draggingControlIndex: number = -1;
  private veinInterpolationProgress: number = 1;
  private lastVeinUpdateTime: number = 0;
  private needsVeinUpdate: boolean = false;

  private hoveredObject: THREE.Object3D | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();

    this.terrain = new Terrain();
    this.scene.add(this.terrain.group);

    this.ui = new UI(this.container, {
      onAddFault: () => this.addFault(),
      onRemoveFault: (id) => this.removeFault(id),
      onAddVein: (type) => this.addVein(type),
      onRemoveVein: (id) => this.removeVein(id),
      onReset: () => this.reset(),
      onExport: () => this.export(),
      onFaultParamChange: (id, param, value) => this.onFaultParamChange(id, param, value)
    });

    this.setupEventListeners();
    this.updateCameraPosition();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 50, 30);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-30, 20, -30);
    this.scene.add(directionalLight2);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('click', (e) => this.onClick(e));

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.onResize());
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const fault of this.faults) {
      const intersects = this.raycaster.intersectObjects(fault.controlPoints, false);
      if (intersects.length > 0) {
        const controlIndex = fault.controlPoints.indexOf(intersects[0].object as THREE.Mesh);
        if (controlIndex >= 0) {
          this.isDraggingControl = true;
          this.draggingFault = fault;
          this.draggingControlIndex = controlIndex;
          fault.startDrag(controlIndex);
          return;
        }
      }
    }

    this.isRotating = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
    this.velocity = { x: 0, y: 0 };
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);

    if (this.isDraggingControl && this.draggingFault) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.handleControlDrag();
      this.needsVeinUpdate = true;
      this.veinInterpolationProgress = 0;
      return;
    }

    if (this.isRotating) {
      const dx = event.clientX - this.previousMouse.x;
      const dy = event.clientY - this.previousMouse.y;
      this.velocity = { x: dx * 0.005, y: dy * 0.005 };
      this.targetRotation.y += dx * 0.005;
      this.targetRotation.x += dy * 0.005;
      this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));
      this.previousMouse = { x: event.clientX, y: event.clientY };
      return;
    }

    this.updateHover(event);
  }

  private onMouseUp(_event: MouseEvent): void {
    if (this.isDraggingControl && this.draggingFault) {
      this.draggingFault.endDrag();
      this.lastVeinUpdateTime = this.clock.getElapsedTime();
    }
    this.isRotating = false;
    this.isDraggingControl = false;
    this.draggingFault = null;
    this.draggingControlIndex = -1;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.targetDistance += event.deltaY * zoomSpeed * this.targetDistance;
    this.targetDistance = Math.max(10, Math.min(100, this.targetDistance));
  }

  private onClick(event: MouseEvent): void {
    if (this.isDraggingControl) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const fault of this.faults) {
      const intersects = this.raycaster.intersectObject(fault.mesh, false);
      if (intersects.length > 0) {
        this.ui.setSelectedObject(fault);
        return;
      }
    }

    for (const vein of this.veins) {
      const intersects = this.raycaster.intersectObject(vein.points, false);
      if (intersects.length > 0) {
        this.ui.setSelectedObject(vein, this.faults);
        return;
      }
    }

    this.ui.setSelectedObject(null);
  }

  private updateHover(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    let found: THREE.Object3D | null = null;
    let tooltipText = '';

    for (const fault of this.faults) {
      const controlIntersects = this.raycaster.intersectObjects(fault.controlPoints, false);
      if (controlIntersects.length > 0) {
        found = controlIntersects[0].object;
        const idx = fault.controlPoints.indexOf(found as THREE.Mesh);
        tooltipText = idx === 0 ? '原点控制点' : idx === 1 ? '倾角控制点' : '走向控制点';
        fault.setHoveredControl(idx, true);
        break;
      }

      const meshIntersects = this.raycaster.intersectObject(fault.mesh, false);
      if (meshIntersects.length > 0) {
        found = fault.mesh;
        tooltipText = '断层 - 点击查看属性';
        break;
      }
    }

    if (!found) {
      for (const vein of this.veins) {
        const intersects = this.raycaster.intersectObject(vein.points, false);
        if (intersects.length > 0) {
          found = vein.points;
          tooltipText = `${vein.getName()} - 点击查看属性`;
          break;
        }
      }
    }

    for (const fault of this.faults) {
      for (let i = 0; i < fault.controlPoints.length; i++) {
        if (this.hoveredObject === fault.controlPoints[i] && found !== fault.controlPoints[i]) {
          fault.setHoveredControl(i, false);
        }
      }
    }

    this.hoveredObject = found;

    if (found) {
      this.ui.showTooltip(event.clientX, event.clientY, tooltipText);
    } else {
      this.ui.hideTooltip();
    }
  }

  private handleControlDrag(): void {
    if (!this.draggingFault || this.draggingControlIndex < 0) return;

    const fault = this.draggingFault;
    const idx = this.draggingControlIndex;

    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = fault.group.position.clone();
    const dragPlane = new THREE.Plane(planeNormal, -planeNormal.dot(planePoint));

    const intersectPoint = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(dragPlane, intersectPoint)) return;

    const localPoint = intersectPoint.sub(fault.group.position);

    if (idx === 0) {
      fault.group.position.add(localPoint);
    } else if (idx === 1) {
      const dx = localPoint.x;
      const dy = localPoint.y;
      const dz = localPoint.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);
      const newDip = THREE.MathUtils.radToDeg(Math.atan2(dy, horizDist || 0.01));
      fault.setDip(Math.max(0, Math.min(90, newDip)));
    } else if (idx === 2) {
      const dx = localPoint.x;
      const dz = localPoint.z;
      const newStrike = THREE.MathUtils.radToDeg(Math.atan2(dx, dz || 0.01));
      fault.setStrike((newStrike + 360) % 360);
    }

    this.ui.updateFaults(this.faults);
  }

  private onFaultParamChange(id: string, param: 'strike' | 'dip' | 'throw', value: number): void {
    const fault = this.faults.find(f => f.id === id);
    if (!fault) return;

    if (param === 'strike') fault.setStrike(value);
    else if (param === 'dip') fault.setDip(value);
    else if (param === 'throw') fault.setThrow(value);

    this.needsVeinUpdate = true;
    this.veinInterpolationProgress = 0;
    this.lastVeinUpdateTime = this.clock.getElapsedTime();
  }

  private addFault(): void {
    const fault = new Fault();
    this.faults.push(fault);
    this.scene.add(fault.group);
    this.ui.updateFaults(this.faults);
  }

  private removeFault(id: string): void {
    const index = this.faults.findIndex(f => f.id === id);
    if (index >= 0) {
      const fault = this.faults[index];
      this.scene.remove(fault.group);
      fault.dispose();
      this.faults.splice(index, 1);
      this.ui.updateFaults(this.faults);
      this.needsVeinUpdate = true;
    }
  }

  private addVein(type: VeinType): void {
    const vein = new Vein({ type });
    this.veins.push(vein);
    this.scene.add(vein.group);
    vein.applyFaultOffsets(this.faults, 1);
    this.ui.updateVeins(this.veins, this.faults);
  }

  private removeVein(id: string): void {
    const index = this.veins.findIndex(v => v.id === id);
    if (index >= 0) {
      const vein = this.veins[index];
      this.scene.remove(vein.group);
      vein.dispose();
      this.veins.splice(index, 1);
      this.ui.updateVeins(this.veins, this.faults);
    }
  }

  private reset(): void {
    this.faults.forEach(f => {
      this.scene.remove(f.group);
      f.dispose();
    });
    this.veins.forEach(v => {
      this.scene.remove(v.group);
      v.dispose();
    });
    this.faults = [];
    this.veins = [];
    this.ui.updateFaults(this.faults);
    this.ui.updateVeins(this.veins, this.faults);
    this.ui.setSelectedObject(null);
  }

  private export(): void {
    const data = {
      terrain: {
        gridSize: 50,
        layers: 10,
        layerHeight: 2
      },
      faults: this.faults.map(f => ({
        strike: f.strike,
        dip: f.dip,
        throw: f.throw,
        position: { x: f.position.x, y: f.position.y, z: f.position.z }
      })),
      veins: this.veins.map(v => ({
        type: v.type,
        shape: v.shape,
        density: v.density,
        volume: v.volume,
        position: { x: v.position.x, y: v.position.y, z: v.position.z }
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geological-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.currentDistance * Math.sin(this.currentRotation.y) * Math.cos(this.currentRotation.x);
    const y = this.cameraTarget.y + this.currentDistance * Math.sin(this.currentRotation.x);
    const z = this.cameraTarget.z + this.currentDistance * Math.cos(this.currentRotation.y) * Math.cos(this.currentRotation.x);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const inertiaFactor = 0.2 / Math.max(delta, 0.001);

    if (!this.isRotating) {
      this.targetRotation.y += this.velocity.x;
      this.targetRotation.x += this.velocity.y;
      this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));
      this.velocity.x *= Math.pow(0.95, delta * 60);
      this.velocity.y *= Math.pow(0.95, delta * 60);
    }

    const rotLerp = 1 - Math.exp(-delta * inertiaFactor);
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * rotLerp;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * rotLerp;

    const distLerp = 1 - Math.exp(-delta * 10);
    this.currentDistance += (this.targetDistance - this.currentDistance) * distLerp;

    this.updateCameraPosition();

    this.faults.forEach(f => f.update(delta));

    if (this.needsVeinUpdate || this.isDraggingControl) {
      const interpolationDuration = 0.3;
      if (this.isDraggingControl) {
        this.veinInterpolationProgress = 1;
      } else {
        const elapsed = this.clock.getElapsedTime() - this.lastVeinUpdateTime;
        this.veinInterpolationProgress = Math.min(1, elapsed / interpolationDuration);
        if (this.veinInterpolationProgress >= 1) {
          this.needsVeinUpdate = false;
        }
      }
      this.veins.forEach(v => v.applyFaultOffsets(this.faults, this.veinInterpolationProgress));
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
