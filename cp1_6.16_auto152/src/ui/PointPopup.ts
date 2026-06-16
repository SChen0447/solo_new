import { PickedPointInfo, FREQUENCY_LABELS, MATERIAL_SCHEME_NAMES } from '@/types';

export class PointPopup {
  private container: HTMLElement;
  private element: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.element = this.createPopup();
    this.container.appendChild(this.element);
  }

  private createPopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.id = 'point-popup';
    return popup;
  }

  public show(info: PickedPointInfo): void {
    this.element.innerHTML = `
      <div class="popup-title">声压详情</div>
      <div class="popup-row">
        <span class="popup-label">声压级</span>
        <span class="popup-spl">${info.spl} dB</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">频带</span>
        <span class="popup-value">${FREQUENCY_LABELS[info.frequency]}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">吸音方案</span>
        <span class="popup-value">${MATERIAL_SCHEME_NAMES[info.scheme]}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">位置 (X, Y, Z)</span>
        <span class="popup-value">(${info.x}, ${info.y}, ${info.z})</span>
      </div>
    `;

    const popupWidth = 240;
    const popupHeight = 160;
    const padding = 16;
    let left = info.screenX + padding;
    let top = info.screenY + padding;

    if (left + popupWidth > window.innerWidth) {
      left = info.screenX - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight) {
      top = info.screenY - popupHeight - padding;
    }

    this.element.style.left = `${Math.max(8, left)}px`;
    this.element.style.top = `${Math.max(8, top)}px`;

    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });
  }

  public hide(): void {
    this.element.classList.remove('visible');
  }
}
