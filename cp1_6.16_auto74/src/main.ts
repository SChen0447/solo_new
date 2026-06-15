import { generateMap, findPath, isWalkable, MapConfig, GridData, Point, Stats } from './mapGenerator';
import { MapRenderer } from './mapRenderer';

interface UIElements {
  widthSlider: HTMLInputElement;
  heightSlider: HTMLInputElement;
  roomCountSlider: HTMLInputElement;
  minRoomSizeSlider: HTMLInputElement;
  corridorWidthSlider: HTMLInputElement;
  widthValue: HTMLSpanElement;
  heightValue: HTMLSpanElement;
  roomCountValue: HTMLSpanElement;
  minRoomSizeValue: HTMLSpanElement;
  corridorWidthValue: HTMLSpanElement;
  generateBtn: HTMLButtonElement;
  genTimeEl: HTMLSpanElement;
  roomCountEl: HTMLSpanElement;
  corridorLenEl: HTMLSpanElement;
  pathTimeEl: HTMLSpanElement;
  instructionEl: HTMLDivElement;
}

class DungeonApp {
  private renderer: MapRenderer;
  private gridData: GridData | null = null;
  private stats: Stats | null = null;
  private selectState: 'start' | 'end' = 'start';
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;
  private ui: UIElements;

  constructor() {
    const canvas = document.getElementById('mapCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.renderer = new MapRenderer(canvas);
    this.ui = this.initUI();

    this.setupResize();
    this.generate();
  }

  private initUI(): UIElements {
    const bind = (id: string): HTMLInputElement => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (!el) throw new Error(`Element ${id} not found`);
      return el;
    };
    const bindSpan = (id: string): HTMLSpanElement => {
      const el = document.getElementById(id) as HTMLSpanElement;
      if (!el) throw new Error(`Element ${id} not found`);
      return el;
    };

    const widthSlider = bind('widthSlider');
    const heightSlider = bind('heightSlider');
    const roomCountSlider = bind('roomCountSlider');
    const minRoomSizeSlider = bind('minRoomSizeSlider');
    const corridorWidthSlider = bind('corridorWidthSlider');
    const widthValue = bindSpan('widthValue');
    const heightValue = bindSpan('heightValue');
    const roomCountValue = bindSpan('roomCountValue');
    const minRoomSizeValue = bindSpan('minRoomSizeValue');
    const corridorWidthValue = bindSpan('corridorWidthValue');
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    const genTimeEl = bindSpan('genTime');
    const roomCountEl = bindSpan('roomCount');
    const corridorLenEl = bindSpan('corridorLen');
    const pathTimeEl = bindSpan('pathTime');
    const instructionEl = document.getElementById('instruction') as HTMLDivElement;

    const syncSlider = (slider: HTMLInputElement, display: HTMLSpanElement) => {
      slider.addEventListener('input', () => {
        display.textContent = slider.value;
      });
    };

    syncSlider(widthSlider, widthValue);
    syncSlider(heightSlider, heightValue);
    syncSlider(roomCountSlider, roomCountValue);
    syncSlider(minRoomSizeSlider, minRoomSizeValue);
    syncSlider(corridorWidthSlider, corridorWidthValue);

    generateBtn.addEventListener('click', () => this.generate());

    this.renderer.onCellClick = (x: number, y: number) => this.handleCellClick(x, y);

    return {
      widthSlider,
      heightSlider,
      roomCountSlider,
      minRoomSizeSlider,
      corridorWidthSlider,
      widthValue,
      heightValue,
      roomCountValue,
      minRoomSizeValue,
      corridorWidthValue,
      generateBtn,
      genTimeEl,
      roomCountEl,
      corridorLenEl,
      pathTimeEl,
      instructionEl,
    };
  }

  private getConfig(): MapConfig {
    return {
      width: parseInt(this.ui.widthSlider.value),
      height: parseInt(this.ui.heightSlider.value),
      roomCount: parseInt(this.ui.roomCountSlider.value),
      minRoomSize: parseInt(this.ui.minRoomSizeSlider.value),
      corridorWidth: parseInt(this.ui.corridorWidthSlider.value),
    };
  }

  private generate(): void {
    const config = this.getConfig();
    const result = generateMap(config);

    this.gridData = result.gridData;
    this.stats = result.stats;
    this.selectState = 'start';
    this.startPoint = null;
    this.endPoint = null;

    this.renderer.setGridData(result.gridData);
    this.updateStats();
    this.ui.instructionEl.textContent = '右键点击房间格子设置起点';
    this.ui.pathTimeEl.textContent = '-';
    this.ui.pathTimeEl.style.color = '';
  }

  private handleCellClick(x: number, y: number): void {
    if (!this.gridData) return;
    if (!isWalkable(this.gridData, x, y)) return;

    if (this.selectState === 'start') {
      this.renderer.clearPath();
      this.renderer.setStartPoint({ x, y });
      this.startPoint = { x, y };
      this.selectState = 'end';
      this.ui.instructionEl.textContent = '右键点击房间格子设置终点';
    } else {
      if (x === this.startPoint?.x && y === this.startPoint?.y) return;
      this.renderer.setEndPoint({ x, y });
      this.endPoint = { x, y };
      this.selectState = 'start';

      if (this.startPoint && this.endPoint && this.gridData) {
        const result = findPath(this.gridData, this.startPoint, this.endPoint);
        if (result.path.length > 0) {
          this.renderer.setPath(result.path);
          if (this.stats) {
            this.stats.pathfindingTime = result.time;
          }
          this.ui.instructionEl.textContent = '右键点击房间格子设置新起点';
        } else {
          this.ui.instructionEl.textContent = '未找到路径，请重新选择';
        }
        this.updateStats();
      }
    }
  }

  private updateStats(): void {
    if (!this.stats) return;

    const animateValue = (el: HTMLSpanElement, value: string, isOverThreshold: boolean) => {
      el.style.color = '#00ff88';
      el.textContent = value;
      setTimeout(() => {
        el.style.color = isOverThreshold ? '#ff3355' : '#ffffff';
      }, 300);
    };

    animateValue(
      this.ui.genTimeEl,
      `${this.stats.generationTime.toFixed(1)}ms`,
      this.stats.generationTime > 500
    );
    animateValue(this.ui.roomCountEl, `${this.stats.roomCount}`, false);
    animateValue(this.ui.corridorLenEl, `${this.stats.corridorLength}`, false);

    if (this.stats.pathfindingTime > 0) {
      animateValue(
        this.ui.pathTimeEl,
        `${this.stats.pathfindingTime.toFixed(1)}ms`,
        this.stats.pathfindingTime > 100
      );
    }
  }

  private setupResize(): void {
    const resize = () => {
      const container = document.getElementById('canvasContainer');
      if (!container) return;
      const canvas = document.getElementById('mapCanvas') as HTMLCanvasElement;
      if (!canvas) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      this.renderer.resize(rect.width, rect.height);
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 50);
  }
}

new DungeonApp();
