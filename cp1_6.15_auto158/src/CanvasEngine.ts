import {
  CanvasState,
  CanvasElement,
  EmojiElement,
  ASCIIText,
  Layer,
  Point,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  EMOJI_SIZE,
  ASCIIBrushConfig
} from './types';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

export class CanvasEngine {
  private state: CanvasState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: CanvasState) => void;
  private animationFrameId: number | null = null;
  private isRendering = false;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: CanvasState) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;

    const emojiLayer: Layer = {
      id: generateId(),
      name: 'Emoji 层',
      type: 'emoji',
      visible: true,
      opacity: 100,
      elements: []
    };

    const asciiLayer: Layer = {
      id: generateId(),
      name: 'ASCII 层',
      type: 'ascii',
      visible: true,
      opacity: 100,
      elements: []
    };

    const bgLayer: Layer = {
      id: generateId(),
      name: '背景层',
      type: 'background',
      visible: true,
      opacity: 100,
      elements: []
    };

    this.state = {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      layers: [bgLayer, asciiLayer, emojiLayer],
      activeLayerId: emojiLayer.id,
      selectedElementId: null
    };

    this.notifyStateChange();
  }

  getState(): CanvasState {
    return { ...this.state };
  }

  private notifyStateChange(): void {
    this.onStateChange(this.getState());
  }

  private scheduleRender(): void {
    if (this.animationFrameId !== null) return;
    this.animationFrameId = requestAnimationFrame(() => {
      this.render();
      this.animationFrameId = null;
    });
  }

  render(): void {
    if (this.isRendering) return;
    this.isRendering = true;

    const startTime = performance.now();
    const { ctx } = this;

    ctx.clearRect(0, 0, this.state.width, this.state.height);

    this.drawCheckerboardBackground();
    this.drawGrid();

    for (const layer of this.state.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity / 100;
      for (const element of layer.elements) {
        this.drawElement(element);
      }
    }

    ctx.globalAlpha = 1;
    this.isRendering = false;

    const renderTime = performance.now() - startTime;
    if (renderTime > 50) {
      console.warn(`Render took ${renderTime.toFixed(2)}ms, target < 50ms`);
    }
  }

  private drawCheckerboardBackground(): void {
    const { ctx } = this;
    const size = 20;

    for (let y = 0; y < this.state.height; y += size) {
      for (let x = 0; x < this.state.width; x += size) {
        const isLight = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isLight ? '#ffffff' : '#e0e0e0';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  private drawGrid(): void {
    const { ctx } = this;
    ctx.fillStyle = '#888888';

    for (let x = 0; x <= this.state.width; x += GRID_SIZE) {
      for (let y = 0; y <= this.state.height; y += GRID_SIZE) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }

  private drawElement(element: CanvasElement): void {
    const { ctx } = this;

    ctx.save();
    ctx.translate(element.position.x, element.position.y);
    ctx.rotate((element.rotation * Math.PI) / 180);

    if (element.type === 'emoji') {
      this.drawEmoji(element);
    } else if (element.type === 'ascii') {
      this.drawASCIIText(element);
    }

    ctx.restore();
  }

  private drawEmoji(element: EmojiElement): void {
    const { ctx } = this;
    ctx.font = `${element.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.emoji, 0, 0);
  }

  private drawASCIIText(element: ASCIIText): void {
    const { ctx } = this;
    ctx.font = `${element.fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = element.color;
    ctx.fillText(element.char, 0, 0);
  }

  addEmoji(emoji: string, position: Point, layerId?: string): EmojiElement {
    const targetLayerId = layerId || this.state.activeLayerId;
    const layer = this.state.layers.find(l => l.id === targetLayerId);
    if (!layer) throw new Error('Layer not found');

    const snappedPosition = this.snapToGrid(position);

    const element: EmojiElement = {
      id: generateId(),
      type: 'emoji',
      emoji,
      position: snappedPosition,
      size: EMOJI_SIZE,
      rotation: 0,
      layerId: targetLayerId
    };

    layer.elements.push(element);
    this.state.selectedElementId = element.id;
    this.notifyStateChange();
    this.scheduleRender();

    return element;
  }

  drawASCIIChar(
    char: string,
    position: Point,
    config: ASCIIBrushConfig,
    layerId?: string
  ): ASCIIText {
    const targetLayerId = layerId || this.state.activeLayerId;
    const layer = this.state.layers.find(l => l.id === targetLayerId);
    if (!layer) throw new Error('Layer not found');

    const jitterAngle = (Math.random() - 0.5) * 2 * config.jitter;

    const element: ASCIIText = {
      id: generateId(),
      type: 'ascii',
      char,
      position: { ...position },
      rotation: jitterAngle,
      fontSize: config.fontSize,
      color: config.color,
      layerId: targetLayerId
    };

    layer.elements.push(element);
    this.notifyStateChange();
    this.scheduleRender();

    return element;
  }

  moveElement(elementId: string, newPosition: Point): void {
    const { layer, element } = this.findElement(elementId);
    if (!layer || !element) return;

    element.position = this.snapToGrid(newPosition);
    this.notifyStateChange();
    this.scheduleRender();
  }

  deleteElement(elementId: string): void {
    const { layer, elementIndex } = this.findElement(elementId);
    if (!layer || elementIndex === -1) return;

    layer.elements.splice(elementIndex, 1);
    if (this.state.selectedElementId === elementId) {
      this.state.selectedElementId = null;
    }
    this.notifyStateChange();
    this.scheduleRender();
  }

  getElementAtPosition(position: Point): CanvasElement | null {
    for (let i = this.state.layers.length - 1; i >= 0; i--) {
      const layer = this.state.layers[i];
      if (!layer.visible) continue;

      for (let j = layer.elements.length - 1; j >= 0; j--) {
        const element = layer.elements[j];
        if (this.isPointInElement(position, element)) {
          return element;
        }
      }
    }
    return null;
  }

  private isPointInElement(point: Point, element: CanvasElement): boolean {
    const halfSize = element.type === 'emoji' ? element.size / 2 : element.fontSize / 2;
    return (
      point.x >= element.position.x - halfSize &&
      point.x <= element.position.x + halfSize &&
      point.y >= element.position.y - halfSize &&
      point.y <= element.position.y + halfSize
    );
  }

  private findElement(elementId: string): {
    layer: Layer | null;
    element: CanvasElement | null;
    elementIndex: number;
  } {
    for (const layer of this.state.layers) {
      const index = layer.elements.findIndex(e => e.id === elementId);
      if (index !== -1) {
        return { layer, element: layer.elements[index], elementIndex: index };
      }
    }
    return { layer: null, element: null, elementIndex: -1 };
  }

  private snapToGrid(position: Point): Point {
    return {
      x: Math.round(position.x),
      y: Math.round(position.y)
    };
  }

  setActiveLayer(layerId: string): void {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    this.state.activeLayerId = layerId;
    this.notifyStateChange();
  }

  toggleLayerVisibility(layerId: string): void {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.visible = !layer.visible;
    this.notifyStateChange();
    this.scheduleRender();
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.opacity = Math.max(0, Math.min(100, Math.round(opacity / 5) * 5));
    this.notifyStateChange();
    this.scheduleRender();
  }

  reorderLayers(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.state.layers.length) return;
    if (toIndex < 0 || toIndex >= this.state.layers.length) return;

    const [removed] = this.state.layers.splice(fromIndex, 1);
    this.state.layers.splice(toIndex, 0, removed);
    this.notifyStateChange();
    this.scheduleRender();
  }

  addLayer(type: 'emoji' | 'ascii' | 'background'): Layer {
    if (this.state.layers.length >= 5) {
      throw new Error('Maximum 5 layers allowed');
    }

    const newLayer: Layer = {
      id: generateId(),
      name: `${type === 'emoji' ? 'Emoji' : type === 'ascii' ? 'ASCII' : '背景'} 层 ${this.state.layers.length + 1}`,
      type,
      visible: true,
      opacity: 100,
      elements: []
    };

    this.state.layers.push(newLayer);
    this.notifyStateChange();
    this.scheduleRender();

    return newLayer;
  }

  async exportPNG(): Promise<Blob> {
    const startTime = performance.now();

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.state.width;
    exportCanvas.height = this.state.height;
    const exportCtx = exportCanvas.getContext('2d')!;

    exportCtx.clearRect(0, 0, this.state.width, this.state.height);

    for (const layer of this.state.layers) {
      if (!layer.visible) continue;
      exportCtx.globalAlpha = layer.opacity / 100;
      for (const element of layer.elements) {
        exportCtx.save();
        exportCtx.translate(element.position.x, element.position.y);
        exportCtx.rotate((element.rotation * Math.PI) / 180);

        if (element.type === 'emoji') {
          exportCtx.font = `${element.size}px serif`;
          exportCtx.textAlign = 'center';
          exportCtx.textBaseline = 'middle';
          exportCtx.fillText(element.emoji, 0, 0);
        } else if (element.type === 'ascii') {
          exportCtx.font = `${element.fontSize}px monospace`;
          exportCtx.textAlign = 'center';
          exportCtx.textBaseline = 'middle';
          exportCtx.fillStyle = element.color;
          exportCtx.fillText(element.char, 0, 0);
        }

        exportCtx.restore();
      }
    }

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        blob => {
          const exportTime = performance.now() - startTime;
          if (exportTime > 2000) {
            console.warn(`Export took ${exportTime.toFixed(2)}ms, target < 2000ms`);
          }
          if (blob) resolve(blob);
          else reject(new Error('Failed to export PNG'));
        },
        'image/png'
      );
    });
  }

  getCanvasCoordinates(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  setSelectedElement(elementId: string | null): void {
    this.state.selectedElementId = elementId;
    this.notifyStateChange();
  }

  clearCanvas(): void {
    for (const layer of this.state.layers) {
      layer.elements = [];
    }
    this.state.selectedElementId = null;
    this.notifyStateChange();
    this.scheduleRender();
  }

  renderLayerThumbnail(layerId: string, width: number, height: number): string {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return '';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = width;
    thumbCanvas.height = height;
    const thumbCtx = thumbCanvas.getContext('2d')!;

    thumbCtx.fillStyle = '#ffffff';
    thumbCtx.fillRect(0, 0, width, height);

    const scaleX = width / this.state.width;
    const scaleY = height / this.state.height;
    const scale = Math.min(scaleX, scaleY);

    thumbCtx.scale(scale, scale);

    for (const element of layer.elements) {
      thumbCtx.save();
      thumbCtx.translate(element.position.x, element.position.y);
      thumbCtx.rotate((element.rotation * Math.PI) / 180);

      if (element.type === 'emoji') {
        thumbCtx.font = `${element.size}px serif`;
        thumbCtx.textAlign = 'center';
        thumbCtx.textBaseline = 'middle';
        thumbCtx.fillText(element.emoji, 0, 0);
      } else if (element.type === 'ascii') {
        thumbCtx.font = `${element.fontSize}px monospace`;
        thumbCtx.textAlign = 'center';
        thumbCtx.textBaseline = 'middle';
        thumbCtx.fillStyle = element.color;
        thumbCtx.fillText(element.char, 0, 0);
      }

      thumbCtx.restore();
    }

    return thumbCanvas.toDataURL();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
