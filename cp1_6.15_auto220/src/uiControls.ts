import { PointCloudManager, TEMP_MIN, TEMP_MAX } from './pointCloud';
import { HeatOverlayManager } from './heatOverlay';

export interface UIState {
  overlayOpacity: number;
  tempFilterMin: number;
  tempFilterMax: number;
  pointSize: number;
}

export class UIControls {
  private panel: HTMLDivElement;
  private pointCloud: PointCloudManager;
  private heatOverlay: HeatOverlayManager;
  private onResetCamera: () => void;
  private tempMinSlider: HTMLInputElement;
  private tempMaxSlider: HTMLInputElement;
  private tempMinLabel: HTMLSpanElement;
  private tempMaxLabel: HTMLSpanElement;

  constructor(
    pointCloud: PointCloudManager,
    heatOverlay: HeatOverlayManager,
    onResetCamera: () => void
  ) {
    this.pointCloud = pointCloud;
    this.heatOverlay = heatOverlay;
    this.onResetCamera = onResetCamera;

    this.panel = document.createElement('div');
    this.panel.id = 'ui-panel';
    Object.assign(this.panel.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '50',
      background: 'rgba(26, 26, 46, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.12)',
      padding: '20px',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      fontSize: '13px',
      minWidth: '260px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    const title = document.createElement('div');
    title.textContent = 'Controls';
    Object.assign(title.style, {
      fontSize: '15px',
      fontWeight: 'bold',
      marginBottom: '4px',
      letterSpacing: '1px',
      color: '#ffffff',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: '8px',
    });
    this.panel.appendChild(title);

    this.tempMinLabel = this.createLabel(`Temp Min: ${TEMP_MIN}°C`);
    this.tempMinSlider = this.createSlider(TEMP_MIN, TEMP_MAX, TEMP_MIN, 1, (val) => {
      this.tempMinLabel.textContent = `Temp Min: ${val}°C`;
      this.applyTempFilter();
    });
    this.panel.appendChild(this.tempMinLabel);
    this.panel.appendChild(this.tempMinSlider);

    this.tempMaxLabel = this.createLabel(`Temp Max: ${TEMP_MAX}°C`);
    this.tempMaxSlider = this.createSlider(TEMP_MIN, TEMP_MAX, TEMP_MAX, 1, (val) => {
      this.tempMaxLabel.textContent = `Temp Max: ${val}°C`;
      this.applyTempFilter();
    });
    this.panel.appendChild(this.tempMaxLabel);
    this.panel.appendChild(this.tempMaxSlider);

    const opacityLabel = this.createLabel('Heat Opacity: 0.6');
    const opacitySlider = this.createSlider(0, 1, 0.6, 0.05, (val) => {
      opacityLabel.textContent = `Heat Opacity: ${val.toFixed(2)}`;
      this.heatOverlay.setOpacity(val);
    });
    this.panel.appendChild(opacityLabel);
    this.panel.appendChild(opacitySlider);

    const sizeLabel = this.createLabel('Point Size: 3');
    const sizeSlider = this.createSlider(1, 10, 3, 0.5, (val) => {
      sizeLabel.textContent = `Point Size: ${val}`;
      this.pointCloud.setPointSize(val);
    });
    this.panel.appendChild(sizeLabel);
    this.panel.appendChild(sizeSlider);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset View';
    Object.assign(resetBtn.style, {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.08)',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'background 0.2s',
    });
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.18)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.08)';
    });
    resetBtn.addEventListener('click', () => this.onResetCamera());
    this.panel.appendChild(resetBtn);

    document.body.appendChild(this.panel);
  }

  private createLabel(text: string): HTMLSpanElement {
    const label = document.createElement('span');
    label.textContent = text;
    Object.assign(label.style, {
      fontSize: '12px',
      color: '#c0c0c0',
    });
    return label;
  }

  private createSlider(
    min: number, max: number, value: number, step: number,
    onChange: (val: number) => void
  ): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    Object.assign(slider.style, {
      width: '100%',
      height: '6px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(to right, #0000ff, #00ffff, #ffff00, #ff0000)',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      onChange(parseFloat(slider.value));
    });

    return slider;
  }

  private applyTempFilter() {
    const min = parseFloat(this.tempMinSlider.value);
    const max = parseFloat(this.tempMaxSlider.value);
    const clampedMin = Math.min(min, max);
    const clampedMax = Math.max(min, max);
    this.pointCloud.setTempFilter(clampedMin, clampedMax);
  }
}
