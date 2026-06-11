import * as THREE from 'three';
import * as d3 from 'd3';
import { dataManager, BubbleData, DataMode } from '../dataModule/dataManager';

interface Bubble {
  mesh: THREE.Mesh;
  city: string;
  month: number;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startScale: number;
  targetScale: number;
  startColor: THREE.Color;
  targetColor: THREE.Color;
  startOpacity: number;
  targetOpacity: number;
  currentColorValue: number;
}

export class BubbleRenderer {
  private scene: THREE.Scene;
  private bubbles: Map<string, Bubble> = new Map();
  private geometry: THREE.SphereGeometry;
  private colorScale: d3.ScaleLinear<number, string>;
  private animationProgress: number = 1;
  private animationDuration: number = 800;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera | null = null;
  private onBubbleClick?: (data: { city: string; month: number }) => void;
  private currentMonth: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.SphereGeometry(1, 32, 32);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.colorScale = d3.scaleLinear<number, string>()
      .domain([0, 0.5, 1])
      .range(['#2196F3', '#FFC107', '#F44336'] as unknown as Iterable<number>);
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  init(): void {
    const cities = dataManager.getCities();
    const monthCount = dataManager.getMonthCount();

    for (const city of cities) {
      for (let m = 0; m < monthCount; m++) {
        const key = `${city}-${m}`;
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          shininess: 80,
          specular: 0x444444
        });

        const mesh = new THREE.Mesh(this.geometry, material);
        mesh.userData = { city, month: m + 1 };
        mesh.position.set(0, -10, 0);
        mesh.scale.set(0.01, 0.01, 0.01);
        mesh.visible = false;

        this.scene.add(mesh);
        this.bubbles.set(key, {
          mesh,
          city,
          month: m + 1,
          startPosition: new THREE.Vector3(0, -10, 0),
          targetPosition: new THREE.Vector3(),
          startScale: 0.01,
          targetScale: 1,
          startColor: new THREE.Color(0xffffff),
          targetColor: new THREE.Color(),
          startOpacity: 0,
          targetOpacity: 0,
          currentColorValue: 0
        });
      }
    }

    this.updateBubbles(0);
  }

  setOnBubbleClick(callback: (data: { city: string; month: number }) => void): void {
    this.onBubbleClick = callback;
  }

  handleClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    if (!this.camera) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.bubbles.values())
      .filter(b => b.mesh.visible)
      .map(b => b.mesh);

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0 && this.onBubbleClick) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.onBubbleClick({
        city: mesh.userData.city,
        month: mesh.userData.month
      });
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  updateBubbles(currentMonth: number): void {
    this.currentMonth = currentMonth;
    const cities = dataManager.getCities();
    const monthCount = dataManager.getMonthCount();
    const startMonth = Math.max(0, currentMonth - 2);
    const endMonth = Math.min(monthCount - 1, currentMonth + 2);

    const allBubbleData = new Map<string, BubbleData>();
    for (let m = startMonth; m <= endMonth; m++) {
      const monthData = dataManager.getBubbleData(m);
      for (const d of monthData) {
        allBubbleData.set(`${d.city}-${m}`, d);
      }
    }

    for (const city of cities) {
      for (let m = 0; m < monthCount; m++) {
        const key = `${city}-${m}`;
        const bubble = this.bubbles.get(key);
        if (!bubble) continue;

        const data = allBubbleData.get(key);

        bubble.startPosition.copy(bubble.mesh.position);
        bubble.startScale = bubble.mesh.scale.x;
        const material = bubble.mesh.material as THREE.MeshPhongMaterial;
        bubble.startColor.copy(material.color);
        bubble.startOpacity = material.opacity;

        if (data) {
          const zOffset = (m - currentMonth) * 2.5;
          bubble.targetPosition.set(data.x, data.y, zOffset);
          bubble.targetScale = data.size;
          bubble.targetColor = new THREE.Color(this.colorScale(data.colorValue));
          bubble.targetOpacity = dataManager.getCityOpacity(city);
          bubble.mesh.visible = true;
          bubble.currentColorValue = data.colorValue;
        } else {
          bubble.targetPosition.set(0, -10, 0);
          bubble.targetScale = 0.01;
          bubble.targetOpacity = 0;
        }
      }
    }

    this.startAnimation();
  }

  updateDataMode(mode: DataMode): void {
    switch (mode) {
      case 'temperature':
        this.colorScale = d3.scaleLinear<number, string>()
          .domain([0, 0.5, 1])
          .range(['#2196F3', '#FFC107', '#F44336'] as unknown as Iterable<number>);
        break;
      case 'humidity':
        this.colorScale = d3.scaleLinear<number, string>()
          .domain([0, 0.5, 1])
          .range(['#8D6E63', '#4CAF50', '#00BCD4'] as unknown as Iterable<number>);
        break;
      case 'precipitation':
        this.colorScale = d3.scaleLinear<number, string>()
          .domain([0, 0.5, 1])
          .range(['#E0E0E0', '#64B5F6', '#1565C0'] as unknown as Iterable<number>);
        break;
    }

    this.updateBubbles(this.currentMonth);
  }

  updateCityFilter(): void {
    for (const bubble of this.bubbles.values()) {
      if (bubble.mesh.visible) {
        bubble.startOpacity = (bubble.mesh.material as THREE.MeshPhongMaterial).opacity;
        bubble.targetOpacity = dataManager.getCityOpacity(bubble.city);
      }
    }

    this.startAnimation();
  }

  private startAnimation(): void {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animationProgress = 0;
  }

  update(_deltaTime: number): void {
    if (!this.isAnimating) return;

    const elapsed = performance.now() - this.animationStartTime;
    this.animationProgress = Math.min(1, elapsed / this.animationDuration);

    const eased = this.easeInOut(this.animationProgress);

    for (const bubble of this.bubbles.values()) {
      const material = bubble.mesh.material as THREE.MeshPhongMaterial;

      bubble.mesh.position.lerpVectors(bubble.startPosition, bubble.targetPosition, eased);

      const newScale = bubble.startScale + (bubble.targetScale - bubble.startScale) * eased;
      bubble.mesh.scale.set(newScale, newScale, newScale);

      material.color.copy(bubble.startColor).lerp(bubble.targetColor, eased);

      material.opacity = bubble.startOpacity + (bubble.targetOpacity - bubble.startOpacity) * eased;

      if (bubble.targetOpacity <= 0.01 && material.opacity <= 0.01) {
        bubble.mesh.visible = false;
      }
    }

    if (this.animationProgress >= 1) {
      this.isAnimating = false;
    }
  }

  dispose(): void {
    for (const bubble of this.bubbles.values()) {
      this.scene.remove(bubble.mesh);
      (bubble.mesh.material as THREE.Material).dispose();
    }
    this.geometry.dispose();
    this.bubbles.clear();
  }

  getBubbleMeshes(): THREE.Mesh[] {
    return Array.from(this.bubbles.values()).map(b => b.mesh);
  }
}
