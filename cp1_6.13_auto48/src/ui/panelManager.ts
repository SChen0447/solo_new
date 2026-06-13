import { FossilData, FossilType } from '../terrain/fossilManager';

export interface PanelCallbacks {
  onCardHover: (id: string, hovered: boolean) => void;
  onCardClickDelete: (id: string) => void;
}

interface CardElement {
  root: HTMLDivElement;
  data: FossilData;
  animating: boolean;
  animationStart: number;
}

export class PanelManager {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private listContainer: HTMLDivElement;
  private emptyHint: HTMLDivElement;
  private countBadge: HTMLSpanElement;
  private cards: Map<string, CardElement> = new Map();
  private callbacks: PanelCallbacks;
  private getFossilIconCanvas: (type: FossilType) => HTMLCanvasElement;
  private getFossilTypeLabel: (type: FossilType) => string;
  private animationFrame: number = 0;

  constructor(
    parent: HTMLElement,
    callbacks: PanelCallbacks,
    getFossilIconCanvas: (type: FossilType) => HTMLCanvasElement,
    getFossilTypeLabel: (type: FossilType) => string
  ) {
    this.container = parent;
    this.callbacks = callbacks;
    this.getFossilIconCanvas = getFossilIconCanvas;
    this.getFossilTypeLabel = getFossilTypeLabel;
    this.panel = this.buildPanel();
    this.listContainer = this.panel.querySelector('.fossil-list') as HTMLDivElement;
    this.emptyHint = this.panel.querySelector('.empty-hint') as HTMLDivElement;
    this.countBadge = this.panel.querySelector('.count-badge') as HTMLSpanElement;
    this.container.appendChild(this.panel);
    this.startCardAnimationLoop();
  }

  private buildPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'strata-info-panel';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      padding: 18px 14px;
      background: rgba(30, 30, 30, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-left: 1px solid rgba(255, 140, 50, 0.18);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      z-index: 50;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      color: #e8e8e8;
      box-sizing: border-box;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 140, 50, 0.15);
    `;
    const titleWrap = document.createElement('div');
    titleWrap.style.display = 'flex';
    titleWrap.style.alignItems = 'center';
    titleWrap.style.gap = '8px';
    const titleIcon = document.createElement('div');
    titleIcon.innerHTML = '🦴';
    titleIcon.style.fontSize = '18px';
    const title = document.createElement('h2');
    title.textContent = '化石发掘记录';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #ffcf8a;
      letter-spacing: 0.5px;
    `;
    titleWrap.appendChild(titleIcon);
    titleWrap.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'count-badge';
    badge.textContent = '0';
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 26px;
      height: 22px;
      padding: 0 8px;
      border-radius: 11px;
      background: linear-gradient(135deg, #ff8833, #ff5511);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(255, 110, 40, 0.4);
    `;

    header.appendChild(titleWrap);
    header.appendChild(badge);

    const listContainer = document.createElement('div');
    listContainer.className = 'fossil-list';
    listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 2px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 140, 50, 0.3) transparent;
    `;
    listContainer.addEventListener('scroll', () => {
      listContainer.style.scrollbarColor = 'rgba(255,140,50,0.45) transparent';
    });

    const style = document.createElement('style');
    style.textContent = `
      .fossil-list::-webkit-scrollbar { width: 5px; }
      .fossil-list::-webkit-scrollbar-track { background: transparent; }
      .fossil-list::-webkit-scrollbar-thumb { background: rgba(255,140,50,0.3); border-radius: 2.5px; }
      .fossil-list::-webkit-scrollbar-thumb:hover { background: rgba(255,140,50,0.55); }
    `;
    document.head.appendChild(style);

    const emptyHint = document.createElement('div');
    emptyHint.className = 'empty-hint';
    emptyHint.innerHTML = `
      <div style="font-size:32px;margin-bottom:10px;opacity:0.5">🔬</div>
      <div style="font-size:13px;color:rgba(200,200,200,0.6);line-height:1.6">
        点击地层表面以标记<br/>化石发掘点
      </div>
    `;
    emptyHint.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      width: 240px;
    `;

    panel.appendChild(header);
    panel.appendChild(listContainer);
    panel.appendChild(emptyHint);

    return panel;
  }

  public addCard(data: FossilData, animate: boolean = true): void {
    if (this.cards.has(data.id)) return;

    const card = this.buildCard(data);
    if (animate) {
      card.root.style.opacity = '0';
      card.root.style.transform = 'translateX(38px)';
    }

    this.listContainer.appendChild(card.root);
    this.listContainer.insertBefore(card.root, this.listContainer.firstChild);
    this.cards.set(data.id, card);

    if (animate) {
      card.animating = true;
      card.animationStart = performance.now();
    }

    this.updateEmptyHint();
  }

  public removeCard(id: string, animate: boolean = true): void {
    const card = this.cards.get(id);
    if (!card) return;

    const doRemove = () => {
      if (card.root.parentNode) card.root.parentNode.removeChild(card.root);
      this.cards.delete(id);
      this.updateEmptyHint();
    };

    if (!animate) {
      doRemove();
      return;
    }

    card.animating = true;
    card.animationStart = performance.now();
    (card.root as any)._removing = true;
  }

  public highlightCard(id: string, highlighted: boolean): void {
    const card = this.cards.get(id);
    if (!card) return;
    if (highlighted) {
      card.root.style.background = 'rgba(255, 215, 0, 0.12)';
      card.root.style.borderColor = 'rgba(255, 200, 60, 0.75)';
      card.root.style.boxShadow = '0 0 0 1px rgba(255, 200, 60, 0.4), 0 6px 22px rgba(255, 160, 40, 0.25)';
      card.root.style.transform = 'translateX(-2px) scale(1.01)';
    } else {
      card.root.style.background = 'rgba(255, 255, 255, 0.06)';
      card.root.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      card.root.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
      card.root.style.transform = 'translateX(0) scale(1)';
    }
  }

  public setFossils(list: FossilData[]): void {
    const existingIds = new Set(this.cards.keys());
    const newIds = new Set(list.map(d => d.id));

    for (const id of existingIds) {
      if (!newIds.has(id)) this.removeCard(id, true);
    }
    for (const d of list) {
      if (!existingIds.has(d.id)) this.addCard(d, true);
    }
  }

  private buildCard(data: FossilData): CardElement {
    const root = document.createElement('div');
    root.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
      user-select: none;
      position: relative;
    `;

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `
      flex: 0 0 44px;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(255, 140, 50, 0.1);
      border: 1px solid rgba(255, 140, 50, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    `;
    const iconCanvas = this.getFossilIconCanvas(data.type);
    iconCanvas.style.width = '34px';
    iconCanvas.style.height = '34px';
    iconCanvas.style.display = 'block';
    iconWrap.appendChild(iconCanvas);

    const infoCol = document.createElement('div');
    infoCol.style.cssText = `
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    `;

    const topRow = document.createElement('div');
    topRow.style.cssText = `display:flex;align-items:baseline;justify-content:space-between;gap:6px`;
    const typeName = document.createElement('div');
    typeName.textContent = this.getFossilTypeLabel(data.type);
    typeName.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #ffe2b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    const depthTag = document.createElement('div');
    depthTag.textContent = `${data.depth.toFixed(1)} m`;
    depthTag.style.cssText = `
      font-size: 11px;
      font-weight: 700;
      color: #9ec9ff;
      background: rgba(90, 140, 212, 0.15);
      border: 1px solid rgba(90, 140, 212, 0.3);
      padding: 2px 7px;
      border-radius: 8px;
      flex-shrink: 0;
    `;
    topRow.appendChild(typeName);
    topRow.appendChild(depthTag);

    const layerName = document.createElement('div');
    layerName.textContent = data.layerName;
    layerName.style.cssText = `
      font-size: 11.5px;
      color: #c8b89a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const timeRow = document.createElement('div');
    timeRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-top: 2px;
    `;
    const timeLabel = document.createElement('div');
    timeLabel.textContent = this.formatTimestamp(data.timestamp);
    timeLabel.style.cssText = `font-size:10.5px;color:rgba(180,180,180,0.6)`;

    const delBtn = document.createElement('div');
    delBtn.innerHTML = '✕';
    delBtn.title = '删除此标记';
    delBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.2s ease;
      flex-shrink: 0;
    `;
    delBtn.addEventListener('mouseenter', () => {
      delBtn.style.background = 'rgba(255, 80, 80, 0.25)';
      delBtn.style.color = '#ff9a9a';
      delBtn.style.borderColor = 'rgba(255, 100, 100, 0.5)';
    });
    delBtn.addEventListener('mouseleave', () => {
      delBtn.style.background = 'rgba(255, 255, 255, 0.04)';
      delBtn.style.color = 'rgba(255, 255, 255, 0.35)';
      delBtn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });
    delBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.callbacks.onCardClickDelete(data.id);
    });

    timeRow.appendChild(timeLabel);
    timeRow.appendChild(delBtn);

    infoCol.appendChild(topRow);
    infoCol.appendChild(layerName);
    infoCol.appendChild(timeRow);

    root.appendChild(iconWrap);
    root.appendChild(infoCol);

    root.addEventListener('mouseenter', () => {
      if (!(root as any)._removing) {
        this.callbacks.onCardHover(data.id, true);
        root.style.background = 'rgba(255, 255, 255, 0.1)';
        root.style.borderColor = 'rgba(255, 140, 50, 0.35)';
      }
    });
    root.addEventListener('mouseleave', () => {
      if (!(root as any)._removing) {
        this.callbacks.onCardHover(data.id, false);
      }
    });
    root.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-del]') || delBtn.contains(ev.target as Node)) return;
    });

    return { root, data, animating: false, animationStart: 0 };
  }

  private startCardAnimationLoop(): void {
    const tick = () => {
      const now = performance.now();
      for (const [id, card] of this.cards.entries()) {
        if (!card.animating) continue;
        const removing = (card.root as any)._removing;
        const elapsed = (now - card.animationStart) / 1000;
        const duration = removing ? 0.25 : 0.3;

        if (elapsed >= duration) {
          card.animating = false;
          if (removing) {
            if (card.root.parentNode) card.root.parentNode.removeChild(card.root);
            this.cards.delete(id);
            this.updateEmptyHint();
          } else {
            card.root.style.opacity = '1';
            card.root.style.transform = 'translateX(0)';
          }
        } else {
          const t = elapsed / duration;
          if (removing) {
            const eased = t * t;
            card.root.style.opacity = String(1 - eased);
            card.root.style.transform = `translateX(${38 * eased}px)`;
          } else {
            const eased = 1 - Math.pow(1 - t, 3);
            card.root.style.opacity = String(eased);
            card.root.style.transform = `translateX(${38 * (1 - eased)}px)`;
          }
        }
      }
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private formatTimestamp(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private updateEmptyHint(): void {
    this.countBadge.textContent = String(this.cards.size);
    if (this.cards.size === 0) {
      this.emptyHint.style.display = 'block';
      this.emptyHint.style.opacity = '1';
    } else {
      this.emptyHint.style.display = 'none';
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    if (this.panel.parentNode) this.panel.parentNode.removeChild(this.panel);
  }
}
