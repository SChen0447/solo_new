import * as THREE from 'three';
import { PlantSculpture, PlantPart } from './plant-sculpture';
import { PlantDataPoint } from './utils';

export class DataProbe {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private sculpture: PlantSculpture;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private tooltipElement: HTMLElement;
  private titleElement: HTMLElement;
  private potentialElement: HTMLElement;
  private stomatalElement: HTMLElement;
  private calciumElement: HTMLElement;
  private waterFlowElement: HTMLElement;
  private currentData: PlantDataPoint | null = null;
  private isHovering: boolean = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    sculpture: PlantSculpture
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.sculpture = sculpture;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.tooltipElement = document.getElementById('probe-tooltip') as HTMLElement;
    this.titleElement = document.getElementById('probe-title') as HTMLElement;
    this.potentialElement = document.getElementById('probe-potential') as HTMLElement;
    this.stomatalElement = document.getElementById('probe-stomatal') as HTMLElement;
    this.calciumElement = document.getElementById('probe-calcium') as HTMLElement;
    this.waterFlowElement = document.getElementById('probe-waterflow') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plantGroup = this.sculpture.getPlantGroup();
    const intersects = this.raycaster.intersectObjects(plantGroup.children, true);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const part = (intersectedMesh as any).userData.plantPart as PlantPart | undefined;

      if (part) {
        this.isHovering = true;
        this.sculpture.highlightPart(part);
        this.showTooltip(part, event.clientX, event.clientY);
      } else {
        this.hideTooltip();
        this.sculpture.clearHighlight();
        this.isHovering = false;
      }
    } else {
      this.hideTooltip();
      this.sculpture.clearHighlight();
      this.isHovering = false;
    }
  }

  private onMouseLeave(): void {
    this.hideTooltip();
    this.sculpture.clearHighlight();
    this.isHovering = false;
  }

  private showTooltip(part: PlantPart, clientX: number, clientY: number): void {
    const data = this.currentData;
    if (!data) return;

    const partName = this.getPartName(part);
    this.titleElement.textContent = partName;

    const potentialVariation = (part.segmentIndex || 0) * 1.5;
    const partPotential = data.rootPotential + potentialVariation;
    this.potentialElement.textContent = `${partPotential.toFixed(1)} mV`;

    const stomatalVariation = (part.leafIndex || 0) * 5;
    const partStomatal = Math.max(0, Math.min(100, data.stomatalOpening + stomatalVariation));
    this.stomatalElement.textContent = `${partStomatal.toFixed(1)}%`;

    this.calciumElement.textContent = `${data.calciumOscillation.toFixed(2)} Hz`;
    this.waterFlowElement.textContent = `${data.waterFlow.toFixed(2)} cm/s`;

    const tooltipWidth = 240;
    const tooltipHeight = 120;
    const offsetX = 15;
    const offsetY = -60;

    let left = clientX + offsetX;
    let top = clientY + offsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + tooltipWidth > viewportWidth - 10) {
      left = clientX - tooltipWidth - offsetX;
    }
    if (top < 10) {
      top = 10;
    }
    if (top + tooltipHeight > viewportHeight - 10) {
      top = viewportHeight - tooltipHeight - 10;
    }

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.display = 'block';
    this.tooltipElement.style.opacity = '1';
  }

  private hideTooltip(): void {
    this.tooltipElement.style.opacity = '0';
    setTimeout(() => {
      if (!this.isHovering) {
        this.tooltipElement.style.display = 'none';
      }
    }, 300);
  }

  private getPartName(part: PlantPart): string {
    switch (part.type) {
      case 'segment':
        return `主干节段 ${(part.segmentIndex || 0) + 1}`;
      case 'branch':
        return `分支 ${(part.segmentIndex || 0) + 1}-${(part.branchIndex || 0) + 1}`;
      case 'leaf':
        return `叶片 ${(part.segmentIndex || 0) + 1}-${(part.branchIndex || 0) + 1}-${(part.leafIndex || 0) + 1}`;
      default:
        return '植物部件';
    }
  }

  public updateData(data: PlantDataPoint): void {
    this.currentData = data;
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
  }
}
