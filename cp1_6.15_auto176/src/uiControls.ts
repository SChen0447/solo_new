import { eventBus, EVENTS } from './eventBus';
import {
  RoomType,
  FloorMaterialType,
  FurnitureData,
  RoomParams,
  roomTemplates,
  FLOOR_MATERIALS,
  SnapshotData,
} from './roomData';

export class UIControls {
  private panelContainer: HTMLElement;
  private snapshotsContainer: HTMLElement;
  private furniturePanel: HTMLElement | null = null;
  private selectedFurniture: FurnitureData | null = null;
  private snapshots: SnapshotData[] = [];
  private maxSnapshots: number = 5;

  private currentRoomType: RoomType = 'livingRoom';
  private currentParams: RoomParams;

  private hue: number = 0;
  private saturation: number = 0;
  private lightness: number = 0.96;

  private isPanelExpanded: boolean = true;

  constructor(panelId: string, snapshotsBarId: string) {
    const panel = document.getElementById(panelId);
    const snapshotsBar = document.getElementById(snapshotsBarId);

    if (!panel || !snapshotsBar) {
      throw new Error('Container elements not found');
    }

    this.panelContainer = panel;
    this.snapshotsContainer = snapshotsBar;
    this.currentParams = { ...roomTemplates.livingRoom.defaultParams };

    this.colorToHsl(this.currentParams.wallColor);

    this.buildUI();
    this.bindEvents();
    this.checkResponsive();

    window.addEventListener('resize', () => this.checkResponsive());
  }

  private buildUI(): void {
    this.panelContainer.innerHTML = '';

    this.buildRoomSelector();
    this.buildWallColorPicker();
    this.buildFloorMaterialSelector();
    this.buildLightControl();
    this.buildSnapshotButton();
  }

  private buildRoomSelector(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '房间模板';
    section.appendChild(title);

    const select = document.createElement('select');
    select.id = 'room-selector';

    Object.entries(roomTemplates).forEach(([key, template]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = template.name;
      select.appendChild(option);
    });

    select.value = this.currentRoomType;
    section.appendChild(select);

    this.panelContainer.appendChild(section);
  }

  private buildWallColorPicker(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '墙面颜色';
    section.appendChild(title);

    const container = document.createElement('div');
    container.className = 'color-picker-container';

    const wheel = document.createElement('canvas');
    wheel.className = 'color-wheel';
    wheel.width = 160;
    wheel.height = 160;
    wheel.id = 'color-wheel';
    container.appendChild(wheel);

    const indicator = document.createElement('div');
    indicator.className = 'color-wheel-indicator';
    indicator.id = 'color-wheel-indicator';
    container.appendChild(indicator);

    const slBars = document.createElement('div');
    slBars.className = 'sl-bars';

    const saturationBar = document.createElement('div');
    saturationBar.className = 'sl-bar';
    saturationBar.id = 'saturation-bar';
    saturationBar.title = '饱和度';
    slBars.appendChild(saturationBar);

    const lightnessBar = document.createElement('div');
    lightnessBar.className = 'sl-bar';
    lightnessBar.id = 'lightness-bar';
    lightnessBar.title = '亮度';
    slBars.appendChild(lightnessBar);

    container.appendChild(slBars);

    const preview = document.createElement('div');
    preview.className = 'color-preview';
    preview.id = 'color-preview';
    preview.style.backgroundColor = this.currentParams.wallColor;
    section.appendChild(container);
    section.appendChild(preview);

    this.panelContainer.appendChild(section);

    requestAnimationFrame(() => {
      this.drawColorWheel();
      this.updateColorIndicator();
      this.updateSlBars();
    });
  }

  private drawColorWheel(): void {
    const canvas = document.getElementById('color-wheel') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = 80;
    const centerY = 80;
    const radius = 70;

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = (angle * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private updateColorIndicator(): void {
    const indicator = document.getElementById('color-wheel-indicator');
    const wheel = document.getElementById('color-wheel');
    if (!indicator || !wheel) return;

    const radius = 70;
    const satRadius = this.saturation * radius;
    const angleRad = (this.hue * Math.PI) / 180;

    const x = 80 + Math.cos(angleRad) * satRadius;
    const y = 80 + Math.sin(angleRad) * satRadius;

    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
    indicator.style.backgroundColor = this.hslToHex(this.hue, this.saturation, this.lightness);
  }

  private updateSlBars(): void {
    const satBar = document.getElementById('saturation-bar');
    const lightBar = document.getElementById('lightness-bar');

    if (satBar) {
      const satGradient = `linear-gradient(to right, 
        hsl(${this.hue}, 0%, ${this.lightness * 100}%), 
        hsl(${this.hue}, 100%, ${this.lightness * 100}%))`;
      satBar.style.background = satGradient;
    }

    if (lightBar) {
      const lightGradient = `linear-gradient(to right, 
        hsl(${this.hue}, ${this.saturation * 100}%, 0%), 
        hsl(${this.hue}, ${this.saturation * 100}%, 100%))`;
      lightBar.style.background = lightGradient;
    }
  }

  private buildFloorMaterialSelector(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '地板材质';
    section.appendChild(title);

    const select = document.createElement('select');
    select.id = 'floor-material-selector';

    Object.entries(FLOOR_MATERIALS).forEach(([key, material]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = material.name;
      select.appendChild(option);
    });

    select.value = this.currentParams.floorMaterial;
    section.appendChild(select);

    this.panelContainer.appendChild(section);
  }

  private buildLightControl(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '光照方向';
    section.appendChild(title);

    const control = document.createElement('div');
    control.className = 'light-control';

    const disc = document.createElement('div');
    disc.className = 'light-disc';
    disc.id = 'light-disc';

    const center = document.createElement('div');
    center.className = 'light-center';
    disc.appendChild(center);

    const indicator = document.createElement('div');
    indicator.className = 'light-indicator';
    indicator.id = 'light-indicator';
    disc.appendChild(indicator);

    control.appendChild(disc);
    section.appendChild(control);

    this.panelContainer.appendChild(section);

    requestAnimationFrame(() => {
      this.updateLightIndicator();
    });
  }

  private updateLightIndicator(): void {
    const indicator = document.getElementById('light-indicator');
    const disc = document.getElementById('light-disc');
    if (!indicator || !disc) return;

    const radius = 50;
    const angleRad = (this.currentParams.lightAngle * Math.PI) / 180;

    const x = 60 + Math.cos(angleRad) * radius;
    const y = 60 + Math.sin(angleRad) * radius;

    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
  }

  private buildSnapshotButton(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const button = document.createElement('button');
    button.className = 'button';
    button.textContent = '保存当前方案';
    button.id = 'save-snapshot-btn';
    section.appendChild(button);

    this.panelContainer.appendChild(section);
  }

  private buildSnapshotsBar(): void {
    this.snapshotsContainer.innerHTML = '';

    const addBtn = document.createElement('div');
    addBtn.className = 'snapshot-add';
    addBtn.textContent = '+';
    addBtn.title = '保存当前方案';
    addBtn.addEventListener('click', () => {
      eventBus.emit(EVENTS.SNAPSHOT_SAVE);
    });
    this.snapshotsContainer.appendChild(addBtn);

    this.snapshots.forEach((snapshot) => {
      const card = document.createElement('div');
      card.className = 'snapshot-card';
      card.dataset.id = snapshot.id;
      card.title = snapshot.name;

      if (snapshot.thumbnail) {
        const img = document.createElement('img');
        img.className = 'snapshot-thumbnail';
        img.src = snapshot.thumbnail;
        card.appendChild(img);
      }

      card.addEventListener('click', () => {
        this.loadSnapshot(snapshot);
      });

      this.snapshotsContainer.appendChild(card);
    });
  }

  private bindEvents(): void {
    const roomSelector = document.getElementById('room-selector') as HTMLSelectElement;
    if (roomSelector) {
      roomSelector.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        eventBus.emit(EVENTS.ROOM_CHANGE, { roomType: target.value as RoomType });
      });
    }

    this.setupColorWheelEvents();

    const floorSelector = document.getElementById('floor-material-selector') as HTMLSelectElement;
    if (floorSelector) {
      floorSelector.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        eventBus.emit(EVENTS.FLOOR_MATERIAL_CHANGE, {
          material: target.value as FloorMaterialType,
        });
      });
    }

    this.setupLightControlEvents();

    const saveBtn = document.getElementById('save-snapshot-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        eventBus.emit(EVENTS.SNAPSHOT_SAVE);
      });
    }

    eventBus.on(EVENTS.PARAMS_UPDATE, (data: any) => {
      this.updateParams(data.params, data.roomType, data.furniture);
    });

    eventBus.on(EVENTS.FURNITURE_SELECT, (data: { furniture: FurnitureData | null }) => {
      this.handleFurnitureSelect(data.furniture);
    });

    eventBus.on('snapshot:created', (snapshot: SnapshotData) => {
      this.addSnapshot(snapshot);
    });

    eventBus.on(EVENTS.SCENE_READY, (data: any) => {
      this.currentRoomType = data.roomType;
      this.currentParams = { ...data.params };
      this.colorToHsl(data.params.wallColor);
      this.updateUIValues();
    });
  }

  private setupColorWheelEvents(): void {
    const wheel = document.getElementById('color-wheel');
    const satBar = document.getElementById('saturation-bar');
    const lightBar = document.getElementById('lightness-bar');

    let isDraggingWheel = false;
    let isDraggingSat = false;
    let isDraggingLight = false;

    const handleWheelMove = (clientX: number, clientY: number) => {
      if (!wheel) return;
      const rect = wheel.getBoundingClientRect();
      const x = clientX - rect.left - 80;
      const y = clientY - rect.top - 80;

      this.hue = (Math.atan2(y, x) * 180) / Math.PI;
      if (this.hue < 0) this.hue += 360;

      const distance = Math.sqrt(x * x + y * y);
      this.saturation = Math.min(distance / 70, 1);

      this.updateWallColor();
    };

    const handleSatMove = (clientX: number) => {
      if (!satBar) return;
      const rect = satBar.getBoundingClientRect();
      const x = clientX - rect.left;
      this.saturation = Math.max(0, Math.min(1, x / rect.width));
      this.updateWallColor();
    };

    const handleLightMove = (clientX: number) => {
      if (!lightBar) return;
      const rect = lightBar.getBoundingClientRect();
      const x = clientX - rect.left;
      this.lightness = Math.max(0, Math.min(1, x / rect.width));
      this.updateWallColor();
    };

    if (wheel) {
      wheel.addEventListener('mousedown', (e) => {
        isDraggingWheel = true;
        handleWheelMove(e.clientX, e.clientY);
      });
    }

    if (satBar) {
      satBar.addEventListener('mousedown', (e) => {
        isDraggingSat = true;
        handleSatMove(e.clientX);
      });
    }

    if (lightBar) {
      lightBar.addEventListener('mousedown', (e) => {
        isDraggingLight = true;
        handleLightMove(e.clientX);
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (isDraggingWheel) {
        handleWheelMove(e.clientX, e.clientY);
      }
      if (isDraggingSat) {
        handleSatMove(e.clientX);
      }
      if (isDraggingLight) {
        handleLightMove(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      isDraggingWheel = false;
      isDraggingSat = false;
      isDraggingLight = false;
    });
  }

  private setupLightControlEvents(): void {
    const disc = document.getElementById('light-disc');
    let isDragging = false;

    const handleMove = (clientX: number, clientY: number) => {
      if (!disc) return;
      const rect = disc.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      this.currentParams.lightAngle = angle;
      this.updateLightIndicator();

      eventBus.emit(EVENTS.LIGHT_DIRECTION_CHANGE, { angle });
    };

    if (disc) {
      disc.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleMove(e.clientX, e.clientY);
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private updateWallColor(): void {
    const color = this.hslToHex(this.hue, this.saturation, this.lightness);
    this.currentParams.wallColor = color;

    const preview = document.getElementById('color-preview');
    if (preview) {
      preview.style.backgroundColor = color;
    }

    this.updateColorIndicator();
    this.updateSlBars();

    eventBus.emit(EVENTS.WALL_COLOR_CHANGE, { color });
  }

  private handleFurnitureSelect(furniture: FurnitureData | null): void {
    this.selectedFurniture = furniture;

    if (furniture) {
      this.showFurniturePanel(furniture);
    } else {
      this.hideFurniturePanel();
    }
  }

  private showFurniturePanel(furniture: FurnitureData): void {
    this.hideFurniturePanel();

    const panel = document.createElement('div');
    panel.className = 'furniture-panel';
    panel.id = 'furniture-panel';

    const header = document.createElement('div');
    header.className = 'furniture-panel-header';

    const title = document.createElement('div');
    title.className = 'furniture-panel-title';
    title.textContent = furniture.name;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'furniture-panel-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      eventBus.emit(EVENTS.FURNITURE_SELECT, { furniture: null });
    });
    header.appendChild(closeBtn);

    panel.appendChild(header);

    const sizeSection = document.createElement('div');
    sizeSection.className = 'control-group';

    const sizeLabel = document.createElement('label');
    sizeLabel.className = 'control-label';
    sizeLabel.textContent = '尺寸';
    sizeSection.appendChild(sizeLabel);

    const dimensions = ['width', 'depth', 'height'] as const;
    const labels = ['宽度', '深度', '高度'];

    dimensions.forEach((dim, index) => {
      const dimGroup = document.createElement('div');
      dimGroup.style.marginBottom = '8px';

      const dimLabel = document.createElement('div');
      dimLabel.style.fontSize = '11px';
      dimLabel.style.color = '#a0a0b0';
      dimLabel.style.marginBottom = '4px';
      dimLabel.textContent = `${labels[index]}: ${furniture.size[dim].toFixed(1)}`;
      dimGroup.appendChild(dimLabel);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0.3';
      slider.max = dim === 'height' ? '3' : '5';
      slider.step = '0.1';
      slider.value = furniture.size[dim].toString();
      slider.dataset.dim = dim;

      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        dimLabel.textContent = `${labels[index]}: ${value.toFixed(1)}`;

        const newSize = { ...furniture.size, [dim]: value };
        eventBus.emit(EVENTS.FURNITURE_SIZE_CHANGE, {
          id: furniture.id,
          size: newSize,
        });
      });

      dimGroup.appendChild(slider);
      sizeSection.appendChild(dimGroup);
    });

    panel.appendChild(sizeSection);

    const posSection = document.createElement('div');
    posSection.className = 'control-group';

    const posLabel = document.createElement('label');
    posLabel.className = 'control-label';
    posLabel.textContent = '位置';
    posSection.appendChild(posLabel);

    const posDimensions = ['x', 'z'] as const;
    const posLabels = ['X 位置', 'Z 位置'];

    posDimensions.forEach((dim, index) => {
      const dimGroup = document.createElement('div');
      dimGroup.style.marginBottom = '8px';

      const dimLabel = document.createElement('div');
      dimLabel.style.fontSize = '11px';
      dimLabel.style.color = '#a0a0b0';
      dimLabel.style.marginBottom = '4px';
      dimLabel.textContent = `${posLabels[index]}: ${furniture.position[dim].toFixed(1)}`;
      dimGroup.appendChild(dimLabel);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '-6';
      slider.max = '6';
      slider.step = '0.2';
      slider.value = furniture.position[dim].toString();
      slider.dataset.dim = dim;

      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        dimLabel.textContent = `${posLabels[index]}: ${value.toFixed(1)}`;

        const newPos = { ...furniture.position, [dim]: value };
        eventBus.emit(EVENTS.FURNITURE_POSITION_CHANGE, {
          id: furniture.id,
          position: newPos,
        });
      });

      dimGroup.appendChild(slider);
      posSection.appendChild(dimGroup);
    });

    panel.appendChild(posSection);

    this.makeDraggable(panel, header);

    document.body.appendChild(panel);
    this.furniturePanel = panel;
  }

  private hideFurniturePanel(): void {
    if (this.furniturePanel) {
      this.furniturePanel.remove();
      this.furniturePanel = null;
    }
  }

  private makeDraggable(element: HTMLElement, handle: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      element.style.left = `${startLeft + dx}px`;
      element.style.top = `${startTop + dy}px`;
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private addSnapshot(snapshot: SnapshotData): void {
    if (this.snapshots.length >= this.maxSnapshots) {
      this.snapshots.shift();
    }
    this.snapshots.push(snapshot);
    this.buildSnapshotsBar();
  }

  private loadSnapshot(snapshot: SnapshotData): void {
    eventBus.emit(EVENTS.SNAPSHOT_LOAD, snapshot);
  }

  private updateParams(params: RoomParams, roomType: RoomType, furniture: FurnitureData[]): void {
    this.currentParams = { ...params };
    this.currentRoomType = roomType;
    this.colorToHsl(params.wallColor);
    this.updateUIValues();
  }

  private updateUIValues(): void {
    const roomSelector = document.getElementById('room-selector') as HTMLSelectElement;
    if (roomSelector) {
      roomSelector.value = this.currentRoomType;
    }

    const floorSelector = document.getElementById('floor-material-selector') as HTMLSelectElement;
    if (floorSelector) {
      floorSelector.value = this.currentParams.floorMaterial;
    }

    const preview = document.getElementById('color-preview');
    if (preview) {
      preview.style.backgroundColor = this.currentParams.wallColor;
    }

    this.updateColorIndicator();
    this.updateSlBars();
    this.updateLightIndicator();
  }

  private colorToHsl(hex: string): void {
    const hexColor = hex.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16) / 255;
    const g = parseInt(hexColor.substring(2, 4), 16) / 255;
    const b = parseInt(hexColor.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    this.hue = h * 360;
    this.saturation = s;
    this.lightness = l;
  }

  private hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (value: number) => {
      const hex = Math.round((value + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private checkResponsive(): void {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.panelContainer.classList.add('mobile-panel');
      if (!this.isPanelExpanded) {
        this.panelContainer.classList.remove('expanded');
      }
      this.setupMobileToggle();
    } else {
      this.panelContainer.classList.remove('mobile-panel');
      this.panelContainer.classList.remove('expanded');
    }
  }

  private setupMobileToggle(): void {
    if (document.getElementById('mobile-toggle')) return;

    const toggle = document.createElement('div');
    toggle.id = 'mobile-toggle';
    toggle.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1;
    `;
    toggle.innerHTML = '<span style="font-size: 12px; color: #00d4aa;">控制面板 ▲</span>';

    toggle.addEventListener('click', () => {
      this.isPanelExpanded = !this.isPanelExpanded;
      this.panelContainer.classList.toggle('expanded', this.isPanelExpanded);
      toggle.innerHTML = this.isPanelExpanded
        ? '<span style="font-size: 12px; color: #00d4aa;">收起 ▼</span>'
        : '<span style="font-size: 12px; color: #00d4aa;">控制面板 ▲</span>';
    });

    this.panelContainer.appendChild(toggle);
  }

  public dispose(): void {
    this.hideFurniturePanel();
  }
}
