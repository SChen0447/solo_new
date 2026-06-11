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
  private trailLengthSlider: HTMLInputElement;
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
  private trailLengthValue: HTMLElement;

  private mobileDragHandle?: HTMLElement;
  private isMobile = false;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartHeight = 0;
  private minPanelHeight = 60;
  private maxPanelHeight = 0;
  private currentPanelHeight = 0;
  private velocityY = 0;
  private lastDragY = 0;
  private lastDragTime = 0;

  constructor(particleSystem: ParticleSystem, cameraOrbit: CameraOrbit) {
    this.particleSystem = particleSystem;
    this.cameraOrbit = cameraOrbit;

    this.panel = document.getElementById('control-panel')!;
    this.toggleBtn = document.getElementById('panel-toggle')!;

    this.countSlider = document.getElementById('particle-count') as HTMLInputElement;
    this.speedSlider = document.getElementById('particle-speed') as HTMLInputElement;
    this.sizeSlider = document.getElementById('particle-size') as HTMLInputElement;
    this.trailLengthSlider = document.getElementById('trail-length') as HTMLInputElement;
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
    this.trailLengthValue = document.getElementById('trail-length-value')!;

    this.mobileDragHandle = document.getElementById('mobile-drag-handle') || undefined;

    this.initValues();
    this.bindEvents();
    this.bindMobileDragEvents();
    this.checkResponsive();
  }

  private initValues(): void {
    this.countSlider.value = String(this.particleSystem.params.count);
    this.speedSlider.value = String(this.particleSystem.params.speed);
    this.sizeSlider.value = String(this.particleSystem.params.size);
    this.trailLengthSlider.value = String(this.particleSystem.params.trailLength);
    this.colorSelect.value = this.particleSystem.params.colorMode;
    this.shapeSelect.value = this.particleSystem.params.shape;
    this.motionSelect.value = this.particleSystem.params.motionMode;
    this.trailToggle.checked = this.particleSystem.params.trailEnabled;

    this.countValue.textContent = String(this.particleSystem.params.count);
    this.speedValue.textContent = this.particleSystem.params.speed.toFixed(1);
    this.sizeValue.textContent = this.particleSystem.params.size.toFixed(2);
    this.trailLengthValue.textContent = String(this.particleSystem.params.trailLength);

    this.trailLengthSlider.disabled = !this.trailToggle.checked;
    this.trailLengthSlider.style.opacity = this.trailToggle.checked ? '1' : '0.4';
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

    this.trailLengthSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.trailLengthValue.textContent = String(value);
      this.particleSystem.setTrailLength(value);
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
      const enabled = (e.target as HTMLInputElement).checked;
      this.particleSystem.setTrailEnabled(enabled);
      this.trailLengthSlider.disabled = !enabled;
      this.trailLengthSlider.style.opacity = enabled ? '1' : '0.4';
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

    [this.countSlider, this.speedSlider, this.sizeSlider, this.trailLengthSlider].forEach(slider => {
      slider.addEventListener('pointerdown', () => this.showSliderTooltip(slider));
      slider.addEventListener('pointermove', () => this.showSliderTooltip(slider));
      slider.addEventListener('pointerup', () => this.hideSliderTooltip(slider));
      slider.addEventListener('pointerleave', () => this.hideSliderTooltip(slider));
    });
  }

  private bindMobileDragEvents(): void {
    if (!this.mobileDragHandle) return;

    this.mobileDragHandle.addEventListener('touchstart', this.onDragStart, { passive: false });
    this.mobileDragHandle.addEventListener('touchmove', this.onDragMove, { passive: false });
    this.mobileDragHandle.addEventListener('touchend', this.onDragEnd);
    this.mobileDragHandle.addEventListener('touchcancel', this.onDragEnd);

    this.mobileDragHandle.addEventListener('pointerdown', this.onDragStart);
    this.mobileDragHandle.addEventListener('pointermove', this.onDragMove);
    this.mobileDragHandle.addEventListener('pointerup', this.onDragEnd);
    this.mobileDragHandle.addEventListener('pointercancel', this.onDragEnd);
    this.mobileDragHandle.addEventListener('pointerleave', this.onDragEnd);
  }

  private onDragStart = (e: PointerEvent | TouchEvent): void => {
    if (!this.isMobile) return;
    e.preventDefault();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    this.isDragging = true;
    this.dragStartY = clientY;
    this.dragStartHeight = this.currentPanelHeight;
    this.lastDragY = clientY;
    this.lastDragTime = performance.now();
    this.velocityY = 0;

    this.panel.style.transition = 'none';
    if (this.toggleBtn) this.toggleBtn.style.transition = 'none';

    if ('pointerId' in e) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  private onDragMove = (e: PointerEvent | TouchEvent): void => {
    if (!this.isDragging || !this.isMobile) return;
    e.preventDefault();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const now = performance.now();
    const deltaY = this.dragStartY - clientY;
    const dt = Math.max(1, now - this.lastDragTime);

    this.velocityY = (this.lastDragY - clientY) / dt;
    this.lastDragY = clientY;
    this.lastDragTime = now;

    let newHeight = this.dragStartHeight + deltaY;
    newHeight = Math.max(this.minPanelHeight, Math.min(this.maxPanelHeight, newHeight));
    this.currentPanelHeight = newHeight;

    this.setPanelHeight(newHeight);
  };

  private onDragEnd = (e?: PointerEvent | TouchEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (e && 'pointerId' in e) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
    }

    this.panel.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    if (this.toggleBtn) this.toggleBtn.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';

    const threshold = 0.3;
    const shouldExpand = this.velocityY > threshold || (this.velocityY >= -threshold && this.currentPanelHeight > this.maxPanelHeight * 0.4);
    const targetHeight = shouldExpand ? this.maxPanelHeight : this.minPanelHeight;

    this.animateToHeight(targetHeight, () => {
      this.isCollapsed = targetHeight <= this.minPanelHeight;
      this.toggleBtn.classList.toggle('collapsed', this.isCollapsed);
      if (this.isCollapsed) {
        this.panel.style.transform = 'translateY(calc(100% - 60px))';
      } else {
        this.panel.style.transform = 'translateY(0)';
      }
    });
  };

  private setPanelHeight(height: number): void {
    const viewportH = window.innerHeight;
    const translateAmount = viewportH - height;
    const collapseThreshold = this.minPanelHeight + 5;

    if (height <= collapseThreshold) {
      this.panel.style.transform = 'translateY(calc(100% - 60px))';
      this.panel.style.height = '45%';
    } else {
      this.panel.style.transform = `translateY(${Math.max(0, translateAmount)}px)`;
      this.panel.style.height = '45%';
    }

    if (this.toggleBtn) {
      const btnBottom = height + 10;
      this.toggleBtn.style.bottom = `${btnBottom}px`;
    }
  }

  private animateToHeight(targetHeight: number, onComplete?: () => void): void {
    const startHeight = this.currentPanelHeight;
    const diff = targetHeight - startHeight;
    const duration = 350;
    const startTime = performance.now();

    const animateStep = (time: number): void => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.currentPanelHeight = startHeight + diff * eased;
      this.setPanelHeight(this.currentPanelHeight);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else if (onComplete) {
        onComplete();
      }
    };

    requestAnimationFrame(animateStep);
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
    if (this.isMobile) {
      const targetHeight = this.isCollapsed ? this.maxPanelHeight : this.minPanelHeight;
      this.animateToHeight(targetHeight, () => {
        this.isCollapsed = !this.isCollapsed;
        this.toggleBtn.classList.toggle('collapsed', this.isCollapsed);
      });
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.panel.classList.toggle('collapsed', this.isCollapsed);
      this.toggleBtn.classList.toggle('collapsed', this.isCollapsed);
    }
  }

  private checkResponsive(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    this.maxPanelHeight = Math.min(window.innerHeight * 0.6, window.innerHeight - 80);

    if (this.isMobile) {
      this.panel.classList.remove('collapsed');
      this.toggleBtn.classList.add('collapsed');
      this.toggleBtn.style.right = '20px';
      this.toggleBtn.style.top = 'auto';

      if (!wasMobile || this.currentPanelHeight === 0) {
        this.currentPanelHeight = this.minPanelHeight;
        this.setPanelHeight(this.minPanelHeight);
        this.isCollapsed = true;
      }

      if (this.mobileDragHandle) {
        this.mobileDragHandle.style.display = 'flex';
      }
    } else {
      if (this.mobileDragHandle) {
        this.mobileDragHandle.style.display = 'none';
      }
      this.panel.style.transform = '';
      this.panel.style.height = '';
      this.panel.style.transition = '';
      this.toggleBtn.style.transition = '';
      this.toggleBtn.style.bottom = '';
      this.toggleBtn.style.right = '';
      this.toggleBtn.style.top = '';

      this.isCollapsed = this.panel.classList.contains('collapsed');
      this.toggleBtn.classList.toggle('collapsed', this.isCollapsed);
    }
  }
}
