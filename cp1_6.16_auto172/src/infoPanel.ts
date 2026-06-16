import * as THREE from 'three';
import { PlanetData } from './solarSystem';

export class InfoPanel {
  private container: HTMLDivElement | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private planets: THREE.Object3D[];
  private onClickHandler: (event: MouseEvent) => void;
  private onDocumentClick: (event: MouseEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, planets: THREE.Object3D[]) {
    this.camera = camera;
    this.planets = planets;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.onClickHandler = this.handleClick.bind(this);
    this.onDocumentClick = this.handleDocumentClick.bind(this);

    window.addEventListener('click', this.onClickHandler);
  }

  private handleClick(event: MouseEvent): void {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.planets
      .map((p) => p.children[0])
      .filter((c) => c !== undefined) as THREE.Mesh[];
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const planetData = clickedMesh.userData.planetData as PlanetData;
      if (planetData) {
        event.stopPropagation();
        this.show(planetData);
      }
    }
  }

  private handleDocumentClick(event: MouseEvent): void {
    if (this.container) {
      const target = event.target as HTMLElement;
      if (!this.container.contains(target)) {
        this.hide();
      }
    }
  }

  public show(data: PlanetData): void {
    this.hide();

    this.container = document.createElement('div');
    this.container.className = 'info-panel';
    this.container.style.setProperty('--planet-color', `#${data.color.toString(16).padStart(6, '0')}`);

    this.container.innerHTML = `
      <div class="info-panel-title">${data.name}</div>
      <ul class="info-list">
        <li class="info-item">
          <span class="info-label">轨道半径</span>
          <span class="info-value">${data.au} AU</span>
        </li>
        <li class="info-item">
          <span class="info-label">公转周期</span>
          <span class="info-value">${data.orbitalPeriod} 地球年</span>
        </li>
        <li class="info-item">
          <span class="info-label">自转周期</span>
          <span class="info-value">${data.rotationPeriod} 小时</span>
        </li>
        <li class="info-item">
          <span class="info-label">质量</span>
          <span class="info-value">${data.mass} 地球倍</span>
        </li>
        <li class="info-item">
          <span class="info-label">卫星数量</span>
          <span class="info-value">${data.satellites}</span>
        </li>
      </ul>
    `;

    document.body.appendChild(this.container);

    setTimeout(() => {
      document.addEventListener('click', this.onDocumentClick, true);
    }, 10);
  }

  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  public destroy(): void {
    window.removeEventListener('click', this.onClickHandler);
    document.removeEventListener('click', this.onDocumentClick, true);
    this.hide();
  }
}
