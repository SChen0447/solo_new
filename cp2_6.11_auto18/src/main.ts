import { TerrainEditor } from './terrain/terrainEditor';
import { TerrainRenderer } from './terrain/terrainRenderer';
import { FluidEngine } from './fluid/fluidEngine';
import { FluidRenderer } from './fluid/fluidRenderer';
import { ControlPanel } from './ui/controlPanel';
import { ExportData, PerformanceStats } from './types';
import { eventBus } from './eventBus';

const EXPORT_VERSION = '1.1';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainEditor: TerrainEditor;
  private terrainRenderer: TerrainRenderer;
  private fluidEngine: FluidEngine;
  private fluidRenderer: FluidRenderer;
  private controlPanel: ControlPanel;
  private lastTime: number = 0;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private running: boolean = true;
  private gridUpdateTime: number = 0;
  private animFrameId: number = 0;

  constructor() {
    const appEl = document.getElementById('app');
    if (!appEl) throw new Error('App container not found');

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    appEl.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.terrainEditor = new TerrainEditor(100, 60);
    this.terrainRenderer = new TerrainRenderer(this.canvas);
    this.fluidEngine = new FluidEngine();
    this.fluidRenderer = new FluidRenderer(this.ctx);
    this.controlPanel = new ControlPanel(appEl);

    this.terrainRenderer.setTerrainEditor(this.terrainEditor);

    const hm = this.terrainEditor.getHeightMap();
    this.fluidEngine.setHeightMapReader(this.terrainEditor, hm.cols, hm.rows);
    this.fluidEngine.setCellSize(this.terrainRenderer.getCellSize());

    this.setupCallbacks();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());

    eventBus.on('terrain:heights:changed', (payload) => {
      const hm = payload as ReturnType<TerrainEditor['getHeightMap']>;
      if (hm && hm.cols && hm.rows) {
        this.fluidEngine.setHeightMapReader(this.terrainEditor, hm.cols, hm.rows);
      }
    });

    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.loop(this.lastTime);
  }

  private setupCallbacks(): void {
    this.controlPanel.setToolChangeHandler((tool) => {
      this.terrainRenderer.setTool(tool);
      eventBus.emit('tool:changed', tool);
    });

    this.controlPanel.setWeatherChangeHandler((weather) => {
      this.fluidEngine.setWeather(weather);
    });

    this.controlPanel.setExportHandler(() => {
      this.exportState();
    });

    this.controlPanel.setImportHandler((data) => {
      this.importState(data);
    });
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.terrainRenderer.resize(w, h);

    const hm = this.terrainEditor.getHeightMap();
    this.terrainRenderer.centerView(hm.cols, hm.rows);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.fpsFrames++;
    if (timestamp - this.fpsTime >= 500) {
      this.currentFps = Math.round(this.fpsFrames / ((timestamp - this.fpsTime) / 1000));
      this.fpsFrames = 0;
      this.fpsTime = timestamp;
    }

    this.gridUpdateTime = this.fluidEngine.update(dt);

    const hm = this.terrainEditor.getHeightMap();
    const viewTransform = this.terrainRenderer.getViewTransform();
    const weatherTransition = this.fluidEngine.getWeatherTransition();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.terrainRenderer.render(hm);

    this.fluidRenderer.render(
      this.fluidEngine.getParticles(),
      viewTransform,
      weatherTransition,
      this.fluidEngine.getRipples(),
      this.fluidEngine.getSnowCover(),
      hm,
      this.terrainRenderer.getCellSize(),
      this.fluidEngine.getLodClusters()
    );

    const stats: PerformanceStats = {
      fps: this.currentFps,
      particleCount: this.fluidEngine.getActiveParticleCount(),
      gridUpdateTime: this.gridUpdateTime,
    };
    this.controlPanel.updateStats(stats);

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private exportState(): void {
    const terrainData = this.terrainEditor.exportData();
    const viewTransform = this.terrainRenderer.getViewTransform();
    const exportData: ExportData = {
      version: EXPORT_VERSION,
      heightMap: terrainData.heightMap,
      cols: terrainData.cols,
      rows: terrainData.rows,
      seed: this.fluidEngine.exportSeed(),
      weather: this.fluidEngine.getWeather(),
      tool: this.controlPanel.getCurrentTool(),
      viewTransform,
      cellSize: this.terrainRenderer.getCellSize(),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'water-sim-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private importState(jsonStr: string): void {
    try {
      const data: ExportData = JSON.parse(jsonStr);
      if (!data.heightMap || !data.cols || !data.rows) {
        console.error('Invalid config file');
        return;
      }
      const floatData = new Float32Array(data.heightMap);
      this.terrainEditor.loadHeightMap(floatData, data.cols, data.rows);

      this.fluidEngine.setHeightMapReader(this.terrainEditor, data.cols, data.rows);

      if (data.weather) {
        this.fluidEngine.setWeather(data.weather);
        this.controlPanel.setWeather(data.weather);
      }
      if (data.tool) {
        this.terrainRenderer.setTool(data.tool);
        this.controlPanel.setTool(data.tool);
      }
      if (data.viewTransform) {
        this.terrainRenderer.setViewTransform(data.viewTransform);
      }
      if (data.cellSize) {
        this.terrainRenderer.setCellSize(data.cellSize);
        this.fluidEngine.setCellSize(data.cellSize);
      }
    } catch (e) {
      console.error('Failed to import config:', e);
    }
  }

  destroy(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    eventBus.clear();
  }
}

new App();
