import * as THREE from 'three';
import { SolarSystem, PLANET_DATA } from './solarSystem';

export interface ControlPanelOptions {
  solarSystem: SolarSystem;
  camera: THREE.PerspectiveCamera;
  onTimeScaleChange: (scale: number) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private solarSystem: SolarSystem;
  private camera: THREE.PerspectiveCamera;
  private onTimeScaleChange: (scale: number) => void;
  private timeSlider: HTMLInputElement;
  private sliderFill: HTMLDivElement;
  private timeValueDisplay: HTMLSpanElement;
  private initialCameraPosition: THREE.Vector3;

  constructor(options: ControlPanelOptions) {
    this.solarSystem = options.solarSystem;
    this.camera = options.camera;
    this.onTimeScaleChange = options.onTimeScaleChange;
    this.initialCameraPosition = options.camera.position.clone();

    this.container = this.createPanel();
    this.timeSlider = this.container.querySelector('.time-slider') as HTMLInputElement;
    this.sliderFill = this.container.querySelector('.slider-fill') as HTMLDivElement;
    this.timeValueDisplay = this.container.querySelector('.control-value') as HTMLSpanElement;

    this.bindEvents();
    document.body.appendChild(this.container);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    panel.innerHTML = `
      <div class="panel-title">控制面板</div>
      
      <div class="control-section">
        <div class="control-label">
          <span>时间加速</span>
          <span class="control-value">1x</span>
        </div>
        <div class="slider-container">
          <div class="slider-fill" style="width: 0%;"></div>
          <input type="range" class="time-slider" min="1" max="1000" step="1" value="1" />
        </div>
      </div>

      <div class="control-section">
        <div class="control-label">
          <span>行星显示</span>
        </div>
        <div class="planet-switches">
          ${PLANET_DATA.map((planet, index) => `
            <div class="planet-switch-item">
              <span>
                <span class="planet-color-dot" style="background: #${planet.color.toString(16).padStart(6, '0')};"></span>
                ${planet.name}
              </span>
              <label class="switch">
                <input type="checkbox" class="planet-switch" data-index="${index}" checked />
                <span class="switch-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="control-section">
        <button class="reset-btn">重置视角</button>
      </div>
    `;

    return panel;
  }

  private bindEvents(): void {
    this.timeSlider.addEventListener('input', () => {
      const value = parseInt(this.timeSlider.value, 10);
      this.solarSystem.timeScale = value;
      this.onTimeScaleChange(value);
      this.timeValueDisplay.textContent = `${value}x`;
      const percentage = ((value - 1) / (1000 - 1)) * 100;
      this.sliderFill.style.width = `${percentage}%`;
    });

    const planetSwitches = this.container.querySelectorAll('.planet-switch');
    planetSwitches.forEach((switchEl) => {
      switchEl.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0', 10);
        this.solarSystem.setPlanetVisible(index, target.checked);
      });
    });

    const resetBtn = this.container.querySelector('.reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.animateCameraReset();
    });
  }

  private animateCameraReset(): void {
    const startPosition = this.camera.position.clone();
    const endPosition = this.initialCameraPosition.clone();
    const duration = 1000;
    const startTime = performance.now();

    const easeInOut = (t: number): number => {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOut(progress);

      this.camera.position.lerpVectors(startPosition, endPosition, easedProgress);
      this.camera.lookAt(0, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  public destroy(): void {
    this.container.remove();
  }
}
