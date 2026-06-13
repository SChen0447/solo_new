import * as dat from 'dat.gui';
import { DataController, FilterConfig } from '../modules/dataController';
import { RenderController, COLOR_THEMES } from '../modules/renderController';

export interface ControlPanelConfig {
  columnCount: number;
  colorTheme: string;
  rotationSpeed: number;
  particleCount: number;
  beatMode: boolean;
  beatInterval: number;
  filterType: string;
  filterThreshold: number;
  filterCategory: number;
}

type ConfigChangeCallback = (config: ControlPanelConfig) => void;

export class ControlPanel {
  private gui: dat.GUI;
  private dataController: DataController;
  private renderController: RenderController;
  private config: ControlPanelConfig;
  private changeCallbacks: ConfigChangeCallback[] = [];

  constructor(dataController: DataController, renderController: RenderController) {
    this.dataController = dataController;
    this.renderController = renderController;

    this.config = {
      columnCount: dataController.getColumnCount(),
      colorTheme: 'ocean',
      rotationSpeed: 0.01,
      particleCount: 750,
      beatMode: false,
      beatInterval: 1,
      filterType: 'none',
      filterThreshold: 3,
      filterCategory: 0
    };

    this.gui = new dat.GUI({ width: 320 });
    this.setupPanel();
  }

  private setupPanel(): void {
    const dataFolder = this.gui.addFolder('数据柱控制');
    dataFolder.add(this.config, 'columnCount', 20, 200, 1).name('柱体数量').onChange((value: number) => {
      this.dataController.updateColumnCount(value);
      this.notifyChange();
    });
    dataFolder.open();

    const themeFolder = this.gui.addFolder('颜色主题');
    themeFolder.add(this.config, 'colorTheme', {
      '海洋蓝': 'ocean',
      '日落橙': 'sunset',
      '森林绿': 'forest',
      '梦幻紫': 'purple'
    }).name('主题').onChange((value: string) => {
      this.renderController.setColorTheme(value);
      this.notifyChange();
    });
    themeFolder.open();

    const animationFolder = this.gui.addFolder('动画控制');
    animationFolder.add(this.config, 'rotationSpeed', 0, 0.05, 0.001).name('旋转速度').onChange((value: number) => {
      this.renderController.setRotationSpeed(value);
      this.notifyChange();
    });
    animationFolder.open();

    const particleFolder = this.gui.addFolder('背景粒子');
    particleFolder.add(this.config, 'particleCount', 500, 1000, 10).name('粒子数量').onChange((value: number) => {
      this.renderController.updateParticleCount(value);
      this.notifyChange();
    });
    particleFolder.open();

    const beatFolder = this.gui.addFolder('节拍模式');
    beatFolder.add(this.config, 'beatMode').name('开启节拍').onChange((value: boolean) => {
      this.renderController.setBeatMode(value);
      this.notifyChange();
    });
    beatFolder.add(this.config, 'beatInterval', 0.5, 2, 0.1).name('节拍间隔(秒)').onChange((value: number) => {
      this.renderController.setBeatInterval(value);
      this.notifyChange();
    });
    beatFolder.open();

    const filterFolder = this.gui.addFolder('数据筛选');
    filterFolder.add(this.config, 'filterType', {
      '无筛选': 'none',
      '高值筛选': 'value-high',
      '低值筛选': 'value-low',
      '类别筛选': 'category'
    }).name('筛选类型').onChange(() => {
      this.applyFilter();
      this.notifyChange();
    });
    filterFolder.add(this.config, 'filterThreshold', 1, 5, 0.1).name('数值阈值').onChange(() => {
      this.applyFilter();
      this.notifyChange();
    });
    filterFolder.add(this.config, 'filterCategory', 0, 2, 1).name('类别').onChange(() => {
      this.applyFilter();
      this.notifyChange();
    });
    filterFolder.open();
  }

  private applyFilter(): void {
    const filterType = this.config.filterType as FilterConfig['type'];
    this.dataController.setFilter({
      type: filterType,
      threshold: this.config.filterThreshold,
      category: Math.floor(this.config.filterCategory)
    });
  }

  public onConfigChange(callback: ConfigChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => cb({ ...this.config }));
  }

  public getConfig(): ControlPanelConfig {
    return { ...this.config };
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
