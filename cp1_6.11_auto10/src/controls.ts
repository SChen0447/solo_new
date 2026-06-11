import { ParticleSystem, ColorMode, ParticleShape, MotionMode } from './particleSystem';
import { CameraOrbit, PresetView } from './cameraOrbit';

export class UIControls {
  private particleSystem: ParticleSystem;
  private cameraOrbit: CameraOrbit;

  private panel: HTMLElement;
  private toggleBtn: HTMLElement;
  private isCollapsed = true;

  private countSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private sizeSlider: HTMLInputElement;
  private colorSelect: HTMLSelectElement;
  private shapeSelect: HTMLSelectElement;
  private motionSelect: HTMLSelectElement;
  private trailToggle: HTMLInputElement;
  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private presetBtns: NodeListOf<HTMLButtonElement>;

  private countValue: HTMLElement;
  private speedValue: HTMLElement;
  private sizeValue: HTMLElement;

  constructor(particleSystem: ParticleSystem, cameraOrbit: CameraOrbit) {
    this.particleSystem = particleSystem;
    this.cameraOrbit = cameraOrbit;

    this.panel = document.getElementById('control-panel')!;
    this.toggleBtn = document.getElementById('panel-toggle')!;

    this.countSlider = document.getElementById('particle-count') as HTMLInputElement;
    this.speedSlider = document.getElementById('particle-speed') as HTMLInputElement;
    this.sizeSlider = document.getElementById('particle-size') as HTMLInputElement;
    this.colorSelect = document.getElementById('color-mode') as HTMLSelectElement;
    this.shapeSelect = document.getElementById('particle-shape') as HTMLSelectElement;
    this.motionSelect = document.getElementById('motion-mode') as HTMLSelectElement;
    this.trailToggle = document.getElementById('trail-toggle') as HTMLInputElement;
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.presetBtns = document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;

    this.countValue = document.getElementById('count-value')!;
    this.speedValue = document.getElementById('speed-value')!;
    this.sizeValue = document.getElementById('size-value')!;

    this.initValues();
    this.bindEvents();
    this.checkResponsive();
  }

  private initValues(): void {
    this.countSlider.value = String(this.particleSystem.params.count);
    this.speedSlider.value = String(this.particleSystem.params.speed);
    this.sizeSlider.value = String(this.particleSystem.params.size);
    this.colorSelect.value = this.particleSystem.params.colorMode;
    this.shapeSelect.value = this.particleSystem.params.shape;
    this.motionSelect.value = this.particleSystem.params.motionMode;
    this.trailToggle.checked = this.particleSystem.params.trailEnabled;

    this.countValue.textContent = String(this.particleSystem.params.count);
    this.speedValue.textContent = this.particleSystem.params.speed.toFixed(1);
    this.sizeValue.textContent = this.particleSystem.params.size.toFixed(2);
  }

  private bindEvents(): void {
    this.toggleBtn.addEventListener('click', () => this.togglePanel());

    this.countSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.countValue.textContent = String(value);
    });
    this.countSlider.addEventListener('change', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.particleSystem.setCount(value);
      const counter = document.getElementById('particle-counter');
      if (counter) counter.textContent = String(value);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.speedValue.textContent = value.toFixed(1);
      this.particleSystem.setSpeed(value);
    });

    this.sizeSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.sizeValue.textContent = value.toFixed(2);
      this.particleSystem.setSize(value);
    });

    this.colorSelect.addEventListener('change', (e) => {
      this.particleSystem.setColorMode((e.target as HTMLSelectElement).value as ColorMode);
    });

    this.shapeSelect.addEventListener('change', (e) => {
      this.particleSystem.setShape((e.target as HTMLSelectElement).value as ParticleShape);
    });

    this.motionSelect.addEventListener('change', (e) => {
      this.particleSystem.setMotionMode((e.target as HTMLSelectElement).value as MotionMode);
    });

    this.trailToggle.addEventListener('change', (e) => {
      this.particleSystem.setTrailEnabled((e.target as HTMLInputElement).checked);
    });

    this.pauseBtn.addEventListener('click', () => {
      this.particleSystem.togglePause();
      this.pauseBtn.textContent = this.particleSystem.paused ? '▶ 继续' : '⏸ 暂停';
      this.pauseBtn.classList.toggle('active', this.particleSystem.paused);
    });

    this.resetBtn.addEventListener('click', () => {
      this.particleSystem.reset();
    });

    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cameraOrbit.setPresetView(btn.dataset.view as PresetView);
      });
    });

    window.addEventListener('resize', () => this.checkResponsive());

    [this.countSlider, this.speedSlider, this.sizeSlider].forEach(slider => {
      slider.addEventListener('pointerdown', () => this.showSliderTooltip(slider));
      slider.addEventListener('pointermove', () => this.showSliderTooltip(slider));
      slider.addEventListener('pointerup', () => this.hideSliderTooltip(slider));
      slider.addEventListener('pointerleave', () => this.hideSliderTooltip(slider));
    });
  }

  private showSliderTooltip(slider: HTMLInputElement): void {
    let tooltip = slider.parentElement?.querySelector('.control-value-tooltip') as HTMLElement;
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'control-value-tooltip';
      slider.parentElement?.appendChild(tooltip);
    }
    const rect = slider.getBoundingClientRect();
    const wrapperRect = slider.parentElement!.getBoundingClientRect();
    const percent = (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min));
    const x = rect.width * percent;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${rect.top - wrapperRect.top - 30}px`;

    let valueText = slider.value;
    if (slider.id === 'particle-speed') valueText = Number(valueText).toFixed(1);
    if (slider.id === 'particle-size') valueText = Number(valueText).toFixed(2);
    tooltip.textContent = valueText;
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(-2px)';
  }

  private hideSliderTooltip(slider: HTMLInputElement): void {
    const tooltip = slider.parentElement?.querySelector('.control-value-tooltip') as HTMLElement;
    if (tooltip) {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(-4px)';
    }
  }

  private togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
    this.toggleBtn.classList.toggle('collapsed', this.isCollapsed);
  }

  private checkResponsive(): void {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.panel.classList.add('collapsed');
      this.toggleBtn.classList.add('collapsed');
      this.isCollapsed = true;
    } else {
      this.panel.classList.remove('collapsed');
      this.toggleBtn.classList.remove('collapsed');
      this.isCollapsed = false;
    }
  }
}
