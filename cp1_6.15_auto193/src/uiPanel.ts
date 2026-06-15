import { NodeData, SpeciesCategory } from './types';
import { COLORS, SIZES, ANIMATION } from './constants';
import { eventBus } from './eventBus';

const getCategoryColor = (category: SpeciesCategory): string => {
  switch (category) {
    case 'animal': return COLORS.ANIMAL;
    case 'plant': return COLORS.PLANT;
    case 'microbe': return COLORS.MICROBE;
  }
};

const getCategoryLabel = (category: SpeciesCategory): string => {
  switch (category) {
    case 'animal': return '动物';
    case 'plant': return '植物';
    case 'microbe': return '微生物';
  }
};

const adjustBrightness = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
};

export class UIPanel {
  private container: HTMLElement;
  private panel!: HTMLDivElement;
  private searchInput!: HTMLInputElement;
  private contentContainer!: HTMLDivElement;
  private nodes: NodeData[] = [];
  private searchTimeout: number | null = null;
  private currentNode: NodeData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
    this.setupBusListeners();
  }

  private init(): void {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${SIZES.UI_PANEL_WIDTH}px;
      background: ${COLORS.UI_PANEL_BG};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: ${SIZES.UI_PANEL_RADIUS}px;
      padding: ${SIZES.UI_PANEL_PADDING}px;
      border: 1px solid ${COLORS.UI_PANEL_BORDER};
      color: ${COLORS.UI_TEXT};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      overflow-x: hidden;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: ${SIZES.UI_CLOSE_BTN_SIZE}px;
      height: ${SIZES.UI_CLOSE_BTN_SIZE}px;
      background: none;
      border: none;
      color: ${COLORS.UI_CLOSE_BTN};
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: color 0.2s ease, background 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = COLORS.UI_TEXT;
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = COLORS.UI_CLOSE_BTN;
      closeBtn.style.background = 'none';
    });
    closeBtn.addEventListener('click', () => {
      this.hideContent();
      eventBus.emit('panel-close');
    });
    this.panel.appendChild(closeBtn);

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = '搜索物种名称或描述...';
    this.searchInput.style.cssText = `
      width: 100%;
      height: ${SIZES.UI_SEARCH_HEIGHT}px;
      background: ${COLORS.UI_BUTTON_BG};
      border-radius: 8px;
      padding: 0 12px;
      border: 2px solid transparent;
      color: ${COLORS.UI_TEXT};
      font-size: 16px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      margin-bottom: 16px;
    `;
    this.searchInput.addEventListener('focus', () => {
      this.searchInput.style.borderColor = COLORS.TRUNK_END;
    });
    this.searchInput.addEventListener('blur', () => {
      this.searchInput.style.borderColor = 'transparent';
    });
    this.searchInput.addEventListener('input', () => {
      this.handleSearchInput();
    });
    this.panel.appendChild(this.searchInput);

    this.contentContainer = document.createElement('div');
    this.contentContainer.style.cssText = `
      display: none;
    `;
    this.panel.appendChild(this.contentContainer);

    const emptyHint = document.createElement('div');
    emptyHint.id = 'empty-hint';
    emptyHint.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: ${COLORS.UI_PLACEHOLDER};">
        <div style="font-size: 48px; margin-bottom: 16px;">🌳</div>
        <div style="font-size: 14px; line-height: 1.6;">
          点击树上的粒子节点<br>或使用搜索框查找物种
        </div>
      </div>
    `;
    this.panel.appendChild(emptyHint);

    this.container.appendChild(this.panel);

    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar {
        width: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  private handleSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = window.setTimeout(() => {
      const query = this.searchInput.value;
      eventBus.emit('search', { query });
    }, ANIMATION.SEARCH_DEBOUNCE);
  }

  private setupBusListeners(): void {
    eventBus.on('node-click', ({ nodeId }) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        this.showNodeDetail(node);
      }
    });
  }

  public setNodes(nodes: NodeData[]): void {
    this.nodes = nodes;
  }

  private showNodeDetail(node: NodeData): void {
    this.currentNode = node;

    const emptyHint = this.panel.querySelector('#empty-hint');
    if (emptyHint) {
      emptyHint.remove();
    }

    this.contentContainer.style.display = 'block';

    const categoryColor = getCategoryColor(node.category);
    const categoryLabel = getCategoryLabel(node.category);

    this.contentContainer.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 24px; font-weight: bold; color: ${COLORS.UI_TEXT}; margin-bottom: 12px;">
          ${node.name}
        </div>
        <span style="
          display: inline-block;
          background: ${categoryColor};
          color: ${COLORS.UI_TEXT};
          font-size: 12px;
          padding: ${SIZES.UI_TAG_PADDING_Y}px ${SIZES.UI_TAG_PADDING_X}px;
          border-radius: ${SIZES.UI_TAG_RADIUS}px;
          font-weight: 500;
        ">
          ${categoryLabel}
        </span>
      </div>

      <div style="
        font-size: 14px;
        color: ${COLORS.UI_TEXT_SECONDARY};
        line-height: 1.6;
        margin-bottom: 24px;
      ">
        ${node.description}
      </div>

      <div style="margin-bottom: 12px;">
        <div style="
          font-size: 12px;
          color: ${COLORS.UI_PLACEHOLDER};
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        ">
          关联物种
        </div>
        <div id="related-container" style="
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        ">
          ${this.renderRelatedSpecies(node)}
        </div>
      </div>

      <div style="
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid ${COLORS.UI_PANEL_BORDER};
        font-size: 12px;
        color: ${COLORS.UI_PLACEHOLDER};
        display: flex;
        justify-content: space-between;
      ">
        <span>深度层级: ${node.depth}</span>
        <span>节点半径: ${node.radius.toFixed(2)}</span>
      </div>
    `;

    this.bindRelatedEvents();
  }

  private renderRelatedSpecies(node: NodeData): string {
    if (!node.relatedSpecies || node.relatedSpecies.length === 0) {
      return `<span style="color: ${COLORS.UI_PLACEHOLDER}; font-size: 13px;">暂无关联物种</span>`;
    }

    return node.relatedSpecies.map(name => {
      const relatedNode = this.nodes.find(n => n.name === name);
      if (!relatedNode) return '';
      
      const categoryColor = getCategoryColor(relatedNode.category);
      const hoverColor = adjustBrightness(categoryColor, 20);

      return `
        <button 
          class="related-btn"
          data-node-id="${relatedNode.id}"
          data-color="${categoryColor}"
          data-hover="${hoverColor}"
          style="
            height: ${SIZES.UI_CAPSULE_HEIGHT}px;
            max-width: 160px;
            background: ${COLORS.UI_BUTTON_BG};
            border: none;
            border-radius: ${SIZES.UI_CAPSULE_RADIUS}px;
            padding: 8px 16px;
            color: ${COLORS.UI_TEXT};
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          "
        >
          ${name}
        </button>
      `;
    }).join('');
  }

  private bindRelatedEvents(): void {
    const buttons = this.contentContainer.querySelectorAll('.related-btn');
    buttons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      const nodeId = button.dataset.nodeId;
      const baseColor = button.dataset.color!;
      const hoverColor = button.dataset.hover!;

      button.addEventListener('mouseenter', () => {
        button.style.background = hoverColor;
        button.style.transform = 'scale(1.05)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.background = COLORS.UI_BUTTON_BG;
        button.style.transform = 'scale(1)';
      });

      button.addEventListener('click', () => {
        if (nodeId) {
          eventBus.emit('related-click', { nodeId });
          
          const node = this.nodes.find(n => n.id === nodeId);
          if (node) {
            this.showNodeDetail(node);
          }
        }
      });
    });
  }

  private hideContent(): void {
    this.currentNode = null;
    this.contentContainer.style.display = 'none';
    this.searchInput.value = '';

    if (!this.panel.querySelector('#empty-hint')) {
      const emptyHint = document.createElement('div');
      emptyHint.id = 'empty-hint';
      emptyHint.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${COLORS.UI_PLACEHOLDER};">
          <div style="font-size: 48px; margin-bottom: 16px;">🌳</div>
          <div style="font-size: 14px; line-height: 1.6;">
            点击树上的粒子节点<br>或使用搜索框查找物种
          </div>
        </div>
      `;
      this.panel.appendChild(emptyHint);
    }
  }

  public dispose(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.container.removeChild(this.panel);
  }
}
