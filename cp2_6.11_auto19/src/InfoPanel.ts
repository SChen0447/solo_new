import type { AtomHoverEvent } from './ModuleLoader';

export class InfoPanel {
  private _panel: HTMLElement;
  private _content: HTMLElement;
  private _hoverLabel: HTMLElement;
  private _appContainer: HTMLElement;
  private _isVisible: boolean = false;

  constructor() {
    this._panel = document.getElementById('info-panel') as HTMLElement;
    this._content = document.getElementById('atom-info-content') as HTMLElement;
    this._hoverLabel = document.getElementById('hover-label') as HTMLElement;
    this._appContainer = document.getElementById('app') as HTMLElement;
  }

  showAtomInfo(event: AtomHoverEvent): void {
    this._isVisible = true;
    this._panel.classList.add('visible');

    const { atom, neighbors, bonds } = event;

    let html = '';

    html += this._infoRow('元素', atom.element);
    html += this._infoRow('序号', `#${atom.index + 1}`);
    html += this._infoRow('坐标', `(${atom.x.toFixed(3)}, ${atom.y.toFixed(3)}, ${atom.z.toFixed(3)})`);

    if (bonds.length > 0) {
      const avgBondLen = bonds.reduce((s, b) => s + b.length, 0) / bonds.length;
      html += this._infoRow('平均键长', `${avgBondLen.toFixed(3)} Å`);
    }

    html += this._infoRow('相邻原子', `${neighbors.length}`);

    if (neighbors.length > 0) {
      html += '<div class="neighbor-list">';
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        const bond = bonds.find(b =>
          (b.atomIndex1 === atom.index && b.atomIndex2 === n.index) ||
          (b.atomIndex2 === atom.index && b.atomIndex1 === n.index)
        );
        const dist = bond ? bond.length.toFixed(3) : '—';
        html += `<div class="neighbor-item">
          <span class="neighbor-element">${n.element} #${n.index + 1}</span>
          <span class="neighbor-distance">${dist} Å</span>
        </div>`;
      }
      html += '</div>';
    }

    this._content.innerHTML = html;

    this._hoverLabel.textContent = `${atom.element} #${atom.index + 1}`;
    this._hoverLabel.classList.add('visible');
    this._updateHoverLabelPosition(event.screenPosition);
  }

  hideAtomInfo(): void {
    this._isVisible = false;
    this._panel.classList.remove('visible');
    this._hoverLabel.classList.remove('visible');
  }

  updateHoverLabel(screenPos: { x: number; y: number }): void {
    if (!this._isVisible) return;
    this._updateHoverLabelPosition(screenPos);
  }

  private _updateHoverLabelPosition(screenPos: { x: number; y: number }): void {
    const offsetX = 16;
    const offsetY = -16;
    this._hoverLabel.style.left = `${screenPos.x + offsetX}px`;
    this._hoverLabel.style.top = `${screenPos.y + offsetY}px`;
  }

  private _infoRow(label: string, value: string): string {
    return `<div class="info-row">
      <span class="info-label">${label}</span>
      <span class="info-value">${value}</span>
    </div>`;
  }

  setCompareMode(active: boolean): void {
    this._appContainer.classList.toggle('compare-active', active);

    if (active) {
      const leftLabel = document.getElementById('label-left');
      const rightLabel = document.getElementById('label-right');
      if (leftLabel) leftLabel.textContent = '模型 A';
      if (rightLabel) rightLabel.textContent = '模型 B';
    }
  }

  updateCompareLabels(labelA: string, labelB: string): void {
    const leftLabel = document.getElementById('label-left');
    const rightLabel = document.getElementById('label-right');
    if (leftLabel) leftLabel.textContent = labelA;
    if (rightLabel) rightLabel.textContent = labelB;
  }
}
