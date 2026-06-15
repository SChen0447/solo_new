import {
  VoxelType,
  BLOCK_DEFS,
  HOTBAR_BLOCKS,
  INITIAL_BLOCK_COUNT,
} from './types';

export class UIManager {
  private container: HTMLElement;
  private coordPanel: HTMLElement;
  private blockInfoPanel: HTMLElement;
  private hotbarContainer: HTMLElement;
  private hotbarItems: HTMLElement[] = [];
  private inventoryOverlay: HTMLElement | null = null;

  private selectedBlockIndex: number = 0;
  private blockCounts: Map<VoxelType, number> = new Map();
  private isInventoryOpen: boolean = false;

  onBlockSelect?: (blockType: VoxelType) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    for (const vt of HOTBAR_BLOCKS) {
      this.blockCounts.set(vt, INITIAL_BLOCK_COUNT);
    }

    this.createStyles();
    this.coordPanel = this.createCoordPanel();
    this.blockInfoPanel = this.createBlockInfoPanel();
    this.hotbarContainer = this.createHotbar();
    this.setupKeyboardListeners();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --primary: #2C3E50;
        --accent: #3498DB;
        --danger: #E74C3C;
        --bg-dark: rgba(0, 0, 0, 0.6);
        --text-color: #ECF0F1;
      }

      .voxel-ui * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .voxel-coord-panel {
        position: fixed;
        top: 16px;
        left: 16px;
        background: var(--bg-dark);
        color: var(--text-color);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        z-index: 100;
        pointer-events: none;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .voxel-coord-panel .coord-label {
        color: #95A5A6;
        font-size: 11px;
      }

      .voxel-coord-panel .coord-value {
        color: var(--accent);
        font-weight: 600;
      }

      .voxel-block-info {
        position: fixed;
        bottom: 90px;
        right: 16px;
        background: var(--bg-dark);
        color: var(--text-color);
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 100;
        pointer-events: none;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .voxel-block-icon {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      .voxel-block-count {
        background: var(--danger);
        color: white;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 20px;
        text-align: center;
      }

      .voxel-hotbar {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        background: var(--bg-dark);
        padding: 8px 12px;
        border-radius: 10px;
        z-index: 100;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .voxel-hotbar-item {
        width: 48px;
        height: 48px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                    border-color 0.2s ease,
                    background-color 0.2s ease;
      }

      .voxel-hotbar-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.6);
      }

      .voxel-hotbar-item.selected {
        transform: scale(1.2);
        border-color: var(--accent);
        box-shadow: 0 0 12px rgba(52, 152, 219, 0.5);
      }

      .voxel-hotbar-item .item-icon {
        width: 32px;
        height: 32px;
        border-radius: 3px;
      }

      .voxel-hotbar-item .item-count {
        position: absolute;
        bottom: -2px;
        right: -2px;
        background: var(--danger);
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 8px;
        min-width: 16px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .voxel-hotbar-item .item-key {
        position: absolute;
        top: 2px;
        left: 4px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .voxel-inventory-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }

      .voxel-inventory-overlay.open {
        opacity: 1;
        pointer-events: all;
      }

      .voxel-inventory-panel {
        background: var(--primary);
        border-radius: 12px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .voxel-inventory-title {
        color: var(--text-color);
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .voxel-inventory-grid {
        display: grid;
        grid-template-columns: repeat(6, 60px);
        grid-template-rows: repeat(4, 60px);
        gap: 8px;
      }

      .voxel-inventory-item {
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }

      .voxel-inventory-item:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--accent);
      }

      .voxel-inventory-item .inv-icon {
        width: 36px;
        height: 36px;
        border-radius: 3px;
      }

      .voxel-inventory-item .inv-label {
        color: var(--text-color);
        font-size: 9px;
        margin-top: 2px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .voxel-inventory-item .inv-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        color: var(--accent);
        font-size: 10px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .voxel-inventory-empty {
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
      }

      .voxel-crosshair {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        z-index: 99;
        pointer-events: none;
      }

      .voxel-crosshair::before,
      .voxel-crosshair::after {
        content: '';
        position: absolute;
        background: rgba(255, 255, 255, 0.7);
      }

      .voxel-crosshair::before {
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        transform: translateY(-50%);
      }

      .voxel-crosshair::after {
        left: 50%;
        top: 0;
        bottom: 0;
        width: 2px;
        transform: translateX(-50%);
      }

      @media (max-width: 768px) {
        .voxel-hotbar-item {
          width: 34px;
          height: 34px;
        }
        .voxel-hotbar-item .item-icon {
          width: 22px;
          height: 22px;
        }
        .voxel-hotbar-item .item-count {
          font-size: 8px;
        }
        .voxel-hotbar-item .item-key {
          font-size: 8px;
        }
        .voxel-coord-panel {
          font-size: 12px;
          display: flex;
          flex-direction: column;
        }
        .voxel-inventory-grid {
          grid-template-columns: repeat(6, 42px);
          grid-template-rows: repeat(4, 42px);
        }
        .voxel-inventory-item {
          width: 42px;
          height: 42px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createCoordPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'voxel-ui voxel-coord-panel';
    panel.innerHTML = `
      <div><span class="coord-label">X: </span><span class="coord-value" id="coord-x">0</span></div>
      <div><span class="coord-label">Y: </span><span class="coord-value" id="coord-y">0</span></div>
      <div><span class="coord-label">Z: </span><span class="coord-value" id="coord-z">0</span></div>
      <div style="margin-top:4px"><span class="coord-label">面向: </span><span class="coord-value" id="facing-block">无</span></div>
    `;
    this.container.appendChild(panel);
    return panel;
  }

  private createBlockInfoPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'voxel-ui voxel-block-info';
    panel.innerHTML = `
      <canvas class="voxel-block-icon" id="info-block-icon" width="32" height="32"></canvas>
      <div>
        <div id="info-block-name" style="font-weight:600"></div>
        <div class="voxel-block-count" id="info-block-count">64</div>
      </div>
    `;
    this.container.appendChild(panel);
    return panel;
  }

  private createHotbar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'voxel-ui voxel-hotbar';

    HOTBAR_BLOCKS.forEach((blockType, index) => {
      const item = document.createElement('div');
      item.className = 'voxel-hotbar-item' + (index === 0 ? ' selected' : '');
      item.dataset.index = String(index);

      const def = BLOCK_DEFS[blockType];
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 32;
      iconCanvas.height = 32;
      iconCanvas.className = 'item-icon';
      const ctx = iconCanvas.getContext('2d')!;
      ctx.fillStyle = def.color;
      ctx.fillRect(0, 0, 32, 32);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, 2, 28, 28);

      const count = document.createElement('span');
      count.className = 'item-count';
      count.textContent = String(this.blockCounts.get(blockType) ?? 0);

      const keyLabel = document.createElement('span');
      keyLabel.className = 'item-key';
      keyLabel.textContent = String(index + 1);

      item.appendChild(keyLabel);
      item.appendChild(iconCanvas);
      item.appendChild(count);

      item.addEventListener('click', () => this.selectBlock(index));

      bar.appendChild(item);
      this.hotbarItems.push(item);
    });

    this.container.appendChild(bar);

    const crosshair = document.createElement('div');
    crosshair.className = 'voxel-ui voxel-crosshair';
    this.container.appendChild(crosshair);

    this.updateBlockInfo();
    return bar;
  }

  private selectBlock(index: number): void {
    if (index < 0 || index >= HOTBAR_BLOCKS.length) return;
    this.selectedBlockIndex = index;

    this.hotbarItems.forEach((item, i) => {
      if (i === index) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    this.updateBlockInfo();

    if (this.onBlockSelect) {
      this.onBlockSelect(HOTBAR_BLOCKS[index]);
    }
  }

  getSelectedBlockType(): VoxelType {
    return HOTBAR_BLOCKS[this.selectedBlockIndex];
  }

  useBlock(): boolean {
    const blockType = this.getSelectedBlockType();
    const count = this.blockCounts.get(blockType) ?? 0;
    if (count <= 0) return false;
    this.blockCounts.set(blockType, count - 1);
    this.updateCounts();
    return true;
  }

  addBlockCount(blockType: VoxelType): void {
    const count = this.blockCounts.get(blockType) ?? 0;
    this.blockCounts.set(blockType, count + 1);
    this.updateCounts();
  }

  private updateCounts(): void {
    HOTBAR_BLOCKS.forEach((blockType, index) => {
      const count = this.blockCounts.get(blockType) ?? 0;
      const countEl = this.hotbarItems[index].querySelector('.item-count');
      if (countEl) countEl.textContent = String(count);
    });
    this.updateBlockInfo();
  }

  private updateBlockInfo(): void {
    const blockType = this.getSelectedBlockType();
    const def = BLOCK_DEFS[blockType];

    const nameEl = document.getElementById('info-block-name');
    const countEl = document.getElementById('info-block-count');
    const iconCanvas = document.getElementById('info-block-icon') as HTMLCanvasElement;

    if (nameEl) nameEl.textContent = def.name;
    if (countEl) countEl.textContent = String(this.blockCounts.get(blockType) ?? 0);
    if (iconCanvas) {
      const ctx = iconCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = def.color;
      ctx.fillRect(0, 0, 32, 32);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 28, 28);
    }
  }

  updateCoords(x: number, y: number, z: number, facingBlock: string): void {
    const elX = document.getElementById('coord-x');
    const elY = document.getElementById('coord-y');
    const elZ = document.getElementById('coord-z');
    const elF = document.getElementById('facing-block');
    if (elX) elX.textContent = x.toFixed(1);
    if (elY) elY.textContent = y.toFixed(1);
    if (elZ) elZ.textContent = z.toFixed(1);
    if (elF) elF.textContent = facingBlock;
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code >= 'Digit1' && e.code <= 'Digit5') {
        const index = parseInt(e.code.replace('Digit', '')) - 1;
        this.selectBlock(index);
      }
      if (e.code === 'KeyE') {
        this.toggleInventory();
      }
      if (e.code === 'Escape' && this.isInventoryOpen) {
        this.closeInventory();
      }
    });
  }

  private toggleInventory(): void {
    if (this.isInventoryOpen) {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  }

  private openInventory(): void {
    if (this.isInventoryOpen) return;
    this.isInventoryOpen = true;

    if (!this.inventoryOverlay) {
      this.createInventoryOverlay();
    }

    requestAnimationFrame(() => {
      if (this.inventoryOverlay) {
        this.inventoryOverlay.classList.add('open');
      }
    });
  }

  private closeInventory(): void {
    if (!this.isInventoryOpen || !this.inventoryOverlay) return;
    this.isInventoryOpen = false;
    this.inventoryOverlay.classList.remove('open');
  }

  private createInventoryOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'voxel-ui voxel-inventory-overlay';

    const panel = document.createElement('div');
    panel.className = 'voxel-inventory-panel';

    const title = document.createElement('div');
    title.className = 'voxel-inventory-title';
    title.textContent = '背包';
    panel.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'voxel-inventory-grid';

    const allBlocks: VoxelType[] = [
      VoxelType.DIRT, VoxelType.STONE, VoxelType.WOOD, VoxelType.GLASS, VoxelType.DIAMOND,
    ];

    for (let i = 0; i < 24; i++) {
      if (i < allBlocks.length) {
        const blockType = allBlocks[i];
        const def = BLOCK_DEFS[blockType];

        const item = document.createElement('div');
        item.className = 'voxel-inventory-item';

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 36;
        iconCanvas.height = 36;
        iconCanvas.className = 'inv-icon';
        const ctx = iconCanvas.getContext('2d')!;
        ctx.fillStyle = def.color;
        ctx.fillRect(0, 0, 36, 36);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(2, 2, 32, 32);

        const label = document.createElement('div');
        label.className = 'inv-label';
        label.textContent = def.name;

        const countSpan = document.createElement('span');
        countSpan.className = 'inv-count';
        countSpan.textContent = String(this.blockCounts.get(blockType) ?? 0);

        item.appendChild(iconCanvas);
        item.appendChild(label);
        item.appendChild(countSpan);

        item.addEventListener('click', () => {
          const hotbarIndex = HOTBAR_BLOCKS.indexOf(blockType);
          if (hotbarIndex >= 0) {
            this.selectBlock(hotbarIndex);
          }
          this.closeInventory();
        });

        grid.appendChild(item);
      } else {
        const empty = document.createElement('div');
        empty.className = 'voxel-inventory-empty';
        grid.appendChild(empty);
      }
    }

    panel.appendChild(grid);
    overlay.appendChild(panel);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeInventory();
      }
    });

    this.container.appendChild(overlay);
    this.inventoryOverlay = overlay;
  }

  isInventoryOpenState(): boolean {
    return this.isInventoryOpen;
  }
}
