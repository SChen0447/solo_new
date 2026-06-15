import GUI from 'lil-gui';
import * as THREE from 'three';
import { eventBus, Events } from '../core/EventBus';
import {
  LightType,
  LightState,
  LightParams,
  RoomSize,
  MaterialPreset,
  MATERIAL_PRESETS,
  SHADOW_MAP_SIZES,
  GroupLightChange,
} from '../core/Types';
import { createColorWheelCanvas, pickColorFromWheel } from '../utils/ColorUtils';

export class UIHandler {
  private gui: GUI;
  private selectedLightIds: string[] = [];
  private lights: LightState[] = [];
  
  private roomFolder!: GUI;
  private lightsFolder!: GUI;
  private selectedLightFolder!: GUI;
  
  private lightTypeControllers: Map<string, {
    basicFolder: GUI;
    shadowFolder: GUI;
    colorFolder: GUI;
  }> = new Map();
  
  constructor() {
    this.gui = new GUI({ title: '照明控制面板' });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '10px';
    this.gui.domElement.style.right = 'auto';
    this.gui.domElement.style.left = '340px';
    this.gui.domElement.style.zIndex = '999';
    
    this.createRoomControls();
    this.createLightControls();
    this.setupEventListeners();
    this.setupMobileControls();
    this.setupHeatmapToggle();
  }
  
  private setupEventListeners(): void {
    eventBus.on<{ light: LightState }>(Events.SCENE_UPDATED, () => {
      this.updateLightList();
    });
    
    eventBus.on<{ message: string; type: string }>(Events.PERFORMANCE_WARNING, (warning) => {
      this.showNotification(warning.message);
    });
  }
  
  private setupMobileControls(): void {
    const addBtn = document.getElementById('btn-add-light');
    const heatmapBtn = document.getElementById('btn-toggle-heatmap');
    const settingsBtn = document.getElementById('btn-settings');
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        eventBus.emit(Events.LIGHT_ADDED, 'point' as LightType);
      });
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        const guiEl = this.gui.domElement;
        if (guiEl.style.display === 'none' || guiEl.style.display === '') {
          guiEl.style.display = 'block';
          guiEl.style.left = '50%';
          guiEl.style.transform = 'translateX(-50%)';
        } else {
          guiEl.style.display = 'none';
        }
      });
    }
  }
  
  private setupHeatmapToggle(): void {
    const heatmapOverlay = document.getElementById('heatmap-overlay');
    const floatingToggle = document.getElementById('floating-heatmap-toggle');
    const heatmapBtn = document.getElementById('btn-toggle-heatmap');
    
    if (heatmapOverlay) {
      heatmapOverlay.addEventListener('click', (e) => {
        if (window.innerWidth <= 1440 && window.innerWidth > 768) {
          heatmapOverlay.classList.toggle('expanded');
        }
      });
    }
    
    if (floatingToggle && heatmapOverlay) {
      floatingToggle.addEventListener('click', () => {
        heatmapOverlay.classList.toggle('visible');
      });
    }
    
    if (heatmapBtn && heatmapOverlay) {
      heatmapBtn.addEventListener('click', () => {
        heatmapOverlay.classList.toggle('visible');
      });
    }
  }
  
  private createRoomControls(): void {
    this.roomFolder = this.gui.addFolder('房间设置');
    this.roomFolder.open();
    
    const roomParams = {
      width: 8,
      depth: 5,
      height: 3,
      walls: 'white_latex' as MaterialPreset,
      floor: 'wood_grain' as MaterialPreset,
      ceiling: 'white_latex' as MaterialPreset,
    };
    
    this.roomFolder.add(roomParams, 'width', 6, 12, 0.5)
      .name('房间长度 (米)')
      .onChange(() => this.emitRoomSize(roomParams));
    
    this.roomFolder.add(roomParams, 'depth', 4, 8, 0.5)
      .name('房间宽度 (米)')
      .onChange(() => this.emitRoomSize(roomParams));
    
    this.roomFolder.add(roomParams, 'height', 2.5, 4, 0.1)
      .name('房间高度 (米)')
      .onChange(() => this.emitRoomSize(roomParams));
    
    const materialOptions = Object.fromEntries(
      Object.entries(MATERIAL_PRESETS).map(([key, config]) => [config.name, key])
    );
    
    this.roomFolder.add(roomParams, 'walls', materialOptions as Record<string, string>)
      .name('墙壁材质')
      .onChange((value: string) => {
        eventBus.emit(Events.ROOM_MATERIAL_CHANGED, {
          surface: 'walls',
          material: value as MaterialPreset,
        });
      });
    
    this.roomFolder.add(roomParams, 'floor', materialOptions as Record<string, string>)
      .name('地板材质')
      .onChange((value: string) => {
        eventBus.emit(Events.ROOM_MATERIAL_CHANGED, {
          surface: 'floor',
          material: value as MaterialPreset,
        });
      });
    
    this.roomFolder.add(roomParams, 'ceiling', materialOptions as Record<string, string>)
      .name('天花板材质')
      .onChange((value: string) => {
        eventBus.emit(Events.ROOM_MATERIAL_CHANGED, {
          surface: 'ceiling',
          material: value as MaterialPreset,
        });
      });
  }
  
  private emitRoomSize(params: { width: number; depth: number; height: number }): void {
    eventBus.emit<RoomSize>(Events.ROOM_SIZE_CHANGED, {
      width: params.width,
      depth: params.depth,
      height: params.height,
    });
  }
  
  private createLightControls(): void {
    this.lightsFolder = this.gui.addFolder('光源管理');
    this.lightsFolder.open();
    
    const addLight = {
      addPoint: () => eventBus.emit(Events.LIGHT_ADDED, 'point' as LightType),
      addSpot: () => eventBus.emit(Events.LIGHT_ADDED, 'spot' as LightType),
      addDirectional: () => eventBus.emit(Events.LIGHT_ADDED, 'directional' as LightType),
      addAmbient: () => eventBus.emit(Events.LIGHT_ADDED, 'ambient' as LightType),
    };
    
    this.lightsFolder.add(addLight, 'addPoint').name('+ 添加点光源');
    this.lightsFolder.add(addLight, 'addSpot').name('+ 添加聚光灯');
    this.lightsFolder.add(addLight, 'addDirectional').name('+ 添加方向光');
    this.lightsFolder.add(addLight, 'addAmbient').name('+ 添加环境光');
    
    this.selectedLightFolder = this.gui.addFolder('选中光源参数');
    this.selectedLightFolder.close();
    
    this.updateLightList();
  }
  
  private updateLightList(): void {
    this.lightTypeControllers.forEach((_, id) => {
      const folder = this.lightsFolder.folders.find(f => f._title && f._title.includes(id.substring(0, 5)));
      if (folder) {
        (this.lightsFolder as any).removeFolder(folder);
      }
    });
    this.lightTypeControllers.clear();
    
    if (this.lights.length === 0) {
      this.selectedLightFolder.hide();
      return;
    }
    
    this.lights.forEach((light) => {
      const lightName = `${this.getLightTypeName(light.type)} ${light.id.substring(0, 5)}`;
      const lightFolder = this.lightsFolder.addFolder(lightName);
      
      const selectParam = { selected: this.selectedLightIds.includes(light.id) };
      lightFolder.add(selectParam, 'selected')
        .name('选中')
        .onChange((value: boolean) => {
          if (value) {
            if (!this.selectedLightIds.includes(light.id)) {
              this.selectedLightIds.push(light.id);
            }
          } else {
            this.selectedLightIds = this.selectedLightIds.filter(id => id !== light.id);
          }
          this.updateSelectedLightControls();
        });
      
      lightFolder.add({ delete: () => this.deleteLight(light.id) }, 'delete')
        .name('删除');
      
      const basicFolder = lightFolder.addFolder('基础参数');
      basicFolder.close();
      
      const shadowFolder = lightFolder.addFolder('阴影设置');
      shadowFolder.close();
      
      const colorFolder = lightFolder.addFolder('颜色设置');
      colorFolder.close();
      
      this.createLightParamControls(light, basicFolder, shadowFolder, colorFolder);
      
      this.lightTypeControllers.set(light.id, { basicFolder, shadowFolder, colorFolder });
    });
    
    this.updateSelectedLightControls();
  }
  
  private createLightParamControls(
    light: LightState,
    basicFolder: GUI,
    shadowFolder: GUI,
    colorFolder: GUI
  ): void {
    const params = {
      intensity: light.intensity,
      distance: light.distance,
      angle: light.angle,
      penumbra: light.penumbra,
      decay: light.decay,
      posX: light.position.x,
      posY: light.position.y,
      posZ: light.position.z,
      color: '#' + light.color.toString(16).padStart(6, '0'),
      castShadow: light.castShadow,
      shadowMapSize: light.shadowMapSize,
    };
    
    basicFolder.add(params, 'intensity', 0, 10, 0.1)
      .name('强度')
      .onChange((value: number) => this.updateSingleLight(light.id, { intensity: value }));
    
    basicFolder.add(params, 'distance', 0, 20, 0.5)
      .name('衰减距离')
      .onChange((value: number) => this.updateSingleLight(light.id, { distance: value }));
    
    if (light.type === 'spot') {
      basicFolder.add(params, 'angle', 0, 360, 1)
        .name('照射角度')
        .onChange((value: number) => this.updateSingleLight(light.id, { angle: value }));
      
      basicFolder.add(params, 'penumbra', 0, 1, 0.05)
        .name('半影')
        .onChange((value: number) => this.updateSingleLight(light.id, { penumbra: value }));
    }
    
    basicFolder.add(params, 'decay', 0, 2, 0.1)
      .name('衰减系数')
      .onChange((value: number) => this.updateSingleLight(light.id, { decay: value }));
    
    const positionFolder = basicFolder.addFolder('位置');
    positionFolder.close();
    
    positionFolder.add(params, 'posX', -10, 10, 0.5)
      .name('X')
      .onChange((value: number) => this.updateLightPosition(light.id, value, params.posY, params.posZ));
    
    positionFolder.add(params, 'posY', 0, 5, 0.5)
      .name('Y')
      .onChange((value: number) => this.updateLightPosition(light.id, params.posX, value, params.posZ));
    
    positionFolder.add(params, 'posZ', -10, 10, 0.5)
      .name('Z')
      .onChange((value: number) => this.updateLightPosition(light.id, params.posX, params.posY, value));
    
    shadowFolder.add(params, 'castShadow')
      .name('启用阴影')
      .onChange((value: boolean) => this.updateSingleLight(light.id, { castShadow: value }));
    
    shadowFolder.add(params, 'shadowMapSize', SHADOW_MAP_SIZES as unknown as number[])
      .name('阴影贴图分辨率')
      .onChange((value: number) => this.updateSingleLight(light.id, { shadowMapSize: value }));
    
    this.createColorPicker(colorFolder, light.id, params.color);
  }
  
  private createColorPicker(folder: GUI, lightId: string, initialColor: string): void {
    const colorWheelContainer = document.createElement('div');
    colorWheelContainer.className = 'color-picker-wrapper';
    
    const wheelCanvas = createColorWheelCanvas(200);
    wheelCanvas.className = 'color-picker-wheel';
    
    const handle = document.createElement('div');
    handle.className = 'color-picker-handle';
    
    colorWheelContainer.appendChild(wheelCanvas);
    colorWheelContainer.appendChild(handle);
    
    const colorParam = { color: initialColor };
    
    folder.addColor(colorParam, 'color')
      .name('颜色')
      .onChange((value: string) => {
        const colorNum = parseInt(value.replace('#', ''), 16);
        this.updateSingleLight(lightId, { color: colorNum });
      });
    
    folder.domElement.appendChild(colorWheelContainer);
    
    let isDragging = false;
    
    const updateHandlePosition = (color: string) => {
      const canvas = wheelCanvas;
      const ctx = canvas.getContext('2d')!;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      for (let angle = 0; angle < 360; angle++) {
        for (let dist = 0; dist <= 100; dist += 2) {
          const x = centerX + Math.cos(angle * Math.PI / 180) * dist;
          const y = centerY + Math.sin(angle * Math.PI / 180) * dist;
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          if (Math.abs(pixel[0] - r) < 20 && Math.abs(pixel[1] - g) < 20 && Math.abs(pixel[2] - b) < 20) {
            handle.style.left = x + 'px';
            handle.style.top = y + 'px';
            return;
          }
        }
      }
    };
    
    updateHandlePosition(initialColor);
    
    const getColorAtPosition = (e: MouseEvent) => {
      const rect = wheelCanvas.getBoundingClientRect();
      const scaleX = wheelCanvas.width / rect.width;
      const scaleY = wheelCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      const result = pickColorFromWheel(wheelCanvas, x, y);
      handle.style.left = (x / scaleX) + 'px';
      handle.style.top = (y / scaleY) + 'px';
      
      return result;
    };
    
    wheelCanvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      const result = getColorAtPosition(e);
      colorParam.color = '#' + result.color.toString(16).padStart(6, '0');
      this.updateSingleLight(lightId, { color: result.color });
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const result = getColorAtPosition(e);
        colorParam.color = '#' + result.color.toString(16).padStart(6, '0');
        this.updateSingleLight(lightId, { color: result.color });
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    wheelCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const result = getColorAtPosition(touch as unknown as MouseEvent);
      colorParam.color = '#' + result.color.toString(16).padStart(6, '0');
      this.updateSingleLight(lightId, { color: result.color });
    });
    
    wheelCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const result = getColorAtPosition(touch as unknown as MouseEvent);
      colorParam.color = '#' + result.color.toString(16).padStart(6, '0');
      this.updateSingleLight(lightId, { color: result.color });
    });
  }
  
  private updateSelectedLightControls(): void {
    if (this.selectedLightIds.length === 0) {
      this.selectedLightFolder.hide();
      return;
    }
    
    this.selectedLightFolder.show();
    
    while (this.selectedLightFolder.controllers.length > 0) {
      this.selectedLightFolder.controllers[0].destroy();
    }
    while (this.selectedLightFolder.folders.length > 0) {
      (this.selectedLightFolder as any).removeFolder(this.selectedLightFolder.folders[0]);
    }
    
    if (this.selectedLightIds.length === 1) {
      this.selectedLightFolder._title = `光源 ${this.selectedLightIds[0].substring(0, 5)}... 参数`;
    } else {
      this.selectedLightFolder._title = `${this.selectedLightIds.length} 个光源参数`;
    }
    
    const groupParams = {
      intensity: 2,
      color: '#ffee88',
      distance: 10,
      castShadow: false,
      shadowMapSize: 1024,
    };
    
    const basicFolder = this.selectedLightFolder.addFolder('基础参数');
    basicFolder.open();
    
    basicFolder.add(groupParams, 'intensity', 0, 10, 0.1)
      .name('统一强度')
      .onChange((value: number) => {
        this.emitGroupChange({ intensity: value });
      });
    
    basicFolder.add(groupParams, 'distance', 0, 20, 0.5)
      .name('统一衰减距离')
      .onChange((value: number) => {
        this.emitGroupChange({ distance: value });
      });
    
    basicFolder.addColor(groupParams, 'color')
      .name('统一颜色')
      .onChange((value: string) => {
        const colorNum = parseInt(value.replace('#', ''), 16);
        this.emitGroupChange({ color: colorNum });
      });
    
    const shadowFolder = this.selectedLightFolder.addFolder('阴影设置');
    shadowFolder.open();
    
    shadowFolder.add(groupParams, 'castShadow')
      .name('统一启用阴影')
      .onChange((value: boolean) => {
        this.emitGroupChange({ castShadow: value });
      });
    
    shadowFolder.add(groupParams, 'shadowMapSize', SHADOW_MAP_SIZES as unknown as number[])
      .name('统一阴影分辨率')
      .onChange((value: number) => {
        this.emitGroupChange({ shadowMapSize: value });
      });
  }
  
  private emitGroupChange(params: Partial<LightParams>): void {
    const change: GroupLightChange = {
      lightIds: this.selectedLightIds,
      params,
    };
    eventBus.emit(Events.LIGHTS_GROUP_CHANGED, change);
  }
  
  private updateSingleLight(id: string, params: Partial<LightParams>): void {
    eventBus.emit(Events.LIGHT_PARAMS_CHANGED, { id, ...params });
  }
  
  private updateLightPosition(id: string, x: number, y: number, z: number): void {
    eventBus.emit(Events.LIGHT_PARAMS_CHANGED, {
      id,
      position: new THREE.Vector3(x, y, z),
    });
  }
  
  private deleteLight(id: string): void {
    this.selectedLightIds = this.selectedLightIds.filter(selectedId => selectedId !== id);
    eventBus.emit(Events.LIGHT_REMOVED, id);
    this.updateSelectedLightControls();
  }
  
  private getLightTypeName(type: LightType): string {
    const names: Record<LightType, string> = {
      point: '点光源',
      spot: '聚光灯',
      directional: '方向光',
      ambient: '环境光',
    };
    return names[type];
  }
  
  public updateLights(lights: LightState[]): void {
    this.lights = lights;
    this.updateLightList();
  }
  
  private showNotification(message: string): void {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  public dispose(): void {
    this.gui.destroy();
  }
}
