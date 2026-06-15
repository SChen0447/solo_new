export interface Layer {
  id: 'edge' | 'style' | 'drawing';
  name: string;
  visible: boolean;
  opacity: number;
}

export interface LayerManagerState {
  layers: Layer[];
}

export class LayerManager {
  private layers: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> = new Map();
  private state: LayerManagerState;

  constructor(public width: number, public height: number) {
    this.state = {
      layers: [
        { id: 'edge', name: '原图边缘层', visible: true, opacity: 100 },
        { id: 'style', name: '风格填充层', visible: true, opacity: 100 },
        { id: 'drawing', name: '手绘层', visible: true, opacity: 100 }
      ]
    };
    this.initLayers();
  }

  private initLayers(): void {
    for (const layer of this.state.layers) {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d')!;
      this.layers.set(layer.id, { canvas, ctx });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const layer of this.state.layers) {
      const layerData = this.layers.get(layer.id)!;
      const oldImage = layerData.ctx.getImageData(0, 0, layerData.canvas.width, layerData.canvas.height);
      layerData.canvas.width = width;
      layerData.canvas.height = height;
      layerData.ctx.putImageData(oldImage, 0, 0);
    }
  }

  getLayerState(): LayerManagerState {
    return this.state;
  }

  getLayerContext(id: string): CanvasRenderingContext2D | null {
    return this.layers.get(id)?.ctx ?? null;
  }

  getLayerCanvas(id: string): HTMLCanvasElement | null {
    return this.layers.get(id)?.canvas ?? null;
  }

  setVisible(id: string, visible: boolean): void {
    const layer = this.state.layers.find(l => l.id === id);
    if (layer) layer.visible = visible;
  }

  setOpacity(id: string, opacity: number): void {
    const layer = this.state.layers.find(l => l.id === id);
    if (layer) layer.opacity = Math.max(0, Math.min(100, opacity));
  }

  clearLayer(id: string): void {
    const layerData = this.layers.get(id);
    if (layerData) {
      layerData.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  mergeToContext(targetCtx: CanvasRenderingContext2D, transparentBg: boolean = true): void {
    targetCtx.clearRect(0, 0, this.width, this.height);
    if (!transparentBg) {
      targetCtx.fillStyle = '#1a1a2e';
      targetCtx.fillRect(0, 0, this.width, this.height);
    }

    for (const layer of this.state.layers) {
      if (!layer.visible) continue;
      const layerData = this.layers.get(layer.id);
      if (!layerData) continue;

      targetCtx.save();
      targetCtx.globalAlpha = layer.opacity / 100;
      targetCtx.drawImage(layerData.canvas, 0, 0);
      targetCtx.restore();
    }
  }

  mergeToImageData(transparentBg: boolean = true): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    this.mergeToContext(ctx, transparentBg);
    return ctx.getImageData(0, 0, this.width, this.height);
  }

  exportPNG(scale: number = 1, transparentBg: boolean = true): string {
    const exportWidth = Math.min(2048, Math.floor(this.width * scale));
    const exportHeight = Math.min(2048, Math.floor(this.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(exportWidth / this.width, exportHeight / this.height);
    this.mergeToContext(ctx, transparentBg);
    return canvas.toDataURL('image/png');
  }

  async exportGIF(scale: number = 1, fps: number = 12, duration: number = 3): Promise<string[]> {
    const frames: string[] = [];
    const totalFrames = fps * duration;
    const exportWidth = Math.min(2048, Math.floor(this.width * scale));
    const exportHeight = Math.min(2048, Math.floor(this.height * scale));

    for (let i = 0; i < totalFrames; i++) {
      const progress = i / totalFrames;
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      ctx.save();
      ctx.scale(exportWidth / this.width, exportHeight / this.height);
      ctx.translate(this.width / 2, this.height / 2);

      const scaleAnim = 0.9 + progress * 0.1;
      ctx.scale(scaleAnim, scaleAnim);
      ctx.rotate((progress - 0.5) * 0.02);
      ctx.translate(-this.width / 2, -this.height / 2);

      ctx.globalAlpha = 0.3 + progress * 0.7;
      this.mergeToContext(ctx, false);

      const glitchIntensity = Math.sin(progress * Math.PI * 4) * 3;
      if (Math.abs(glitchIntensity) > 1) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        for (let y = 0; y < this.height; y += 4) {
          const shift = Math.floor((Math.sin(y * 0.01 + progress * 20) * glitchIntensity * 2));
          for (let x = 0; x < this.width; x++) {
            const srcX = Math.min(Math.max(x + shift, 0), this.width - 1);
            const i = (y * this.width + x) * 4;
            const srcI = (y * this.width + srcX) * 4;
            if (y % 8 < 2) {
              data[i] = data[srcI];
              data[i + 1] = Math.min(255, data[srcI + 1] + 30);
              data[i + 2] = data[srcI + 2];
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      ctx.restore();

      frames.push(canvas.toDataURL('image/png'));
    }

    return frames;
  }
}
