import { Pane } from 'tweakpane';
import type { LightController, LightParams } from './lights';
import type { AudienceManager } from './audience';
import type { SceneManager } from './scene';

type ViewPreset = 'main' | 'drummer' | 'audience' | 'top';

interface LightState {
  hue: number;
  saturation: number;
  lightness: number;
  theta: number;
  phi: number;
  height: number;
  intensity: number;
  enabled: boolean;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface ChangeEvent<T> {
  value: T;
  last?: boolean;
}

export class UIController {
  private container: HTMLElement;
  private lightController: LightController;
  private audienceManager: AudienceManager;
  private sceneManager: SceneManager;
  private pane: any;
  private lightStates: Record<number, LightState> = {};

  private viewButtons: HTMLButtonElement[] = [];
  private currentView: ViewPreset = 'main';

  constructor(
    container: HTMLElement,
    lightController: LightController,
    audienceManager: AudienceManager,
    sceneManager: SceneManager
  ) {
    this.container = container;
    this.lightController = lightController;
    this.audienceManager = audienceManager;
    this.sceneManager = sceneManager;

    this.createViewButtons();
    this.pane = new Pane({ container, title: '' });
    this.setupGlobalControls();
    this.setupLightControls();
    this.setupAudienceControls();
  }

  private createViewButtons() {
    const viewContainer = document.createElement('div');
    viewContainer.className = 'view-buttons';

    const views: { id: ViewPreset; label: string; icon: string }[] = [
      { id: 'main', label: '主视角', icon: '🎬' },
      { id: 'drummer', label: '鼓手', icon: '🥁' },
      { id: 'audience', label: '观众席', icon: '👥' },
      { id: 'top', label: '顶视旋转', icon: '🔄' }
    ];

    views.forEach(view => {
      const btn = document.createElement('button');
      btn.className = 'view-btn';
      btn.innerHTML = `${view.icon} ${view.label}`;
      btn.dataset.view = view.id;
      if (view.id === this.currentView) btn.classList.add('active');

      btn.addEventListener('click', () => {
        this.switchView(view.id);
      });

      viewContainer.appendChild(btn);
      this.viewButtons.push(btn);
    });

    this.container.appendChild(viewContainer);
  }

  private switchView(view: ViewPreset) {
    this.currentView = view;
    this.viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    this.sceneManager.setCameraView(view);
  }

  private hslToHex(h: number, s: number, l: number): string {
    const sN = s / 100;
    const lN = l / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp >= 0 && hp < 1) { r1 = c; g1 = x; b1 = 0; }
    else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; b1 = 0; }
    else if (hp >= 2 && hp < 3) { r1 = 0; g1 = c; b1 = x; }
    else if (hp >= 3 && hp < 4) { r1 = 0; g1 = x; b1 = c; }
    else if (hp >= 4 && hp < 5) { r1 = x; g1 = 0; b1 = c; }
    else if (hp >= 5 && hp < 6) { r1 = c; g1 = 0; b1 = x; }
    const m = lN - c / 2;
    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 100, l: 50 };
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  private setupGlobalControls() {
    const globalFolder = this.pane.addFolder({
      title: '⚙️ 全局设置',
      expanded: true
    });

    const bpmState = { value: 120 };
    globalFolder.addBinding(bpmState, 'value', {
      label: '音乐 BPM',
      min: 60,
      max: 200,
      step: 1
    }).on('change', (ev: ChangeEvent<number>) => {
      const interval = 60 / ev.value;
      this.audienceManager.setBeatInterval(interval);
    });

    globalFolder.addButton({
      title: '🎵 触发节拍'
    }).on('click', () => {
      this.audienceManager.triggerBeat();
    });

    const lightShowState = { value: false };
    globalFolder.addBinding(lightShowState, 'value', {
      label: '✨ 自动灯光秀'
    }).on('change', (ev: ChangeEvent<boolean>) => {
      const isOn = this.lightController.isLightShowActive();
      if (ev.value !== isOn) {
        this.lightController.toggleLightShow();
      }
    });

    const topSpeed = { value: 0.5 };
    globalFolder.addBinding(topSpeed, 'value', {
      label: '顶视旋转速度',
      min: 0,
      max: 3,
      step: 0.1
    }).on('change', (ev: ChangeEvent<number>) => {
      this.sceneManager.setTopRotationSpeed(ev.value);
    });

    globalFolder.addButton({
      title: '💡 全部淡入'
    }).on('click', () => {
      this.lightController.fadeAllIn(0.5);
    });

    globalFolder.addButton({
      title: '🌑 全部淡出'
    }).on('click', () => {
      this.lightController.fadeAllOut(0.5);
    });
  }

  private setupLightControls() {
    const lightsFolder = this.pane.addFolder({
      title: '💡 灯光控制 (8盏)',
      expanded: false
    });

    for (let i = 0; i < this.lightController.lightCount; i++) {
      const params = this.lightController.getLightParams(i);
      const state: LightState = {
        hue: params.hue,
        saturation: params.saturation,
        lightness: params.lightness,
        theta: params.theta,
        phi: params.phi,
        height: params.height,
        intensity: params.intensity,
        enabled: params.enabled,
        targetX: 0,
        targetY: 0.5,
        targetZ: 0
      };
      this.lightStates[i] = state;

      const lightFolder = lightsFolder.addFolder({
        title: `聚光灯 #${i + 1}`,
        expanded: i === 0
      });

      lightFolder.addBinding(state, 'enabled', {
        label: '启用'
      }).on('change', (ev: ChangeEvent<boolean>) => {
        this.lightController.setLightParams(i, { enabled: ev.value });
      });

      const colorHex = { value: this.hslToHex(state.hue, state.saturation, state.lightness) };
      lightFolder.addBinding(colorHex, 'value', {
        label: '颜色',
        picker: 'inline',
        expanded: true
      }).on('change', (ev: ChangeEvent<string>) => {
        const hsl = this.hexToHsl(ev.value);
        state.hue = hsl.h;
        state.saturation = hsl.s;
        state.lightness = hsl.l;
        this.lightController.setLightParams(i, {
          hue: hsl.h,
          saturation: hsl.s,
          lightness: hsl.l
        });
      });

      const posFolder = lightFolder.addFolder({
        title: '位置 (球坐标)',
        expanded: false
      });

      posFolder.addBinding(state, 'theta', {
        label: '方位角 θ (°)',
        min: 0,
        max: 360,
        step: 1
      }).on('change', (ev: ChangeEvent<number>) => {
        this.lightController.setLightParams(i, { theta: ev.value });
      });

      posFolder.addBinding(state, 'phi', {
        label: '仰角 φ (°)',
        min: 15,
        max: 85,
        step: 1
      }).on('change', (ev: ChangeEvent<number>) => {
        this.lightController.setLightParams(i, { phi: ev.value });
      });

      posFolder.addBinding(state, 'height', {
        label: '高度',
        min: 3,
        max: 20,
        step: 0.5
      }).on('change', (ev: ChangeEvent<number>) => {
        this.lightController.setLightParams(i, { height: ev.value });
      });

      lightFolder.addBinding(state, 'intensity', {
        label: '强度',
        min: 0,
        max: 500,
        step: 10
      }).on('change', (ev: ChangeEvent<number>) => {
        this.lightController.setLightParams(i, { intensity: ev.value });
      });

      const targetFolder = lightFolder.addFolder({
        title: '投射目标',
        expanded: false
      });
      targetFolder.addBinding(state, 'targetX', { min: -5, max: 5, step: 0.1, label: 'X' })
        .on('change', (ev: ChangeEvent<number>) => this.lightController.setLightTarget(i, ev.value, state.targetY, state.targetZ));
      targetFolder.addBinding(state, 'targetY', { min: 0, max: 5, step: 0.1, label: 'Y' })
        .on('change', (ev: ChangeEvent<number>) => this.lightController.setLightTarget(i, state.targetX, ev.value, state.targetZ));
      targetFolder.addBinding(state, 'targetZ', { min: -5, max: 5, step: 0.1, label: 'Z' })
        .on('change', (ev: ChangeEvent<number>) => this.lightController.setLightTarget(i, state.targetX, state.targetY, ev.value));
    }
  }

  private setupAudienceControls() {
    const audienceFolder = this.pane.addFolder({
      title: '👥 观众设置',
      expanded: false
    });

    const infoState = { value: `共 ${this.audienceManager.getAudienceCount()} 人` };
    audienceFolder.addBinding(infoState, 'value', {
      label: '观众总数',
      readonly: true
    });

    const zoneState = { value: '红#FF4444 / 蓝#4444FF / 绿#44FF44 / 金#FFD700' };
    audienceFolder.addBinding(zoneState, 'value', {
      label: '分区颜色',
      readonly: true
    });

    const intervalState = { value: this.audienceManager.getBeatInterval() };
    audienceFolder.addBinding(intervalState, 'value', {
      label: '节拍间隔 (秒)',
      min: 0.1,
      max: 2,
      step: 0.05
    }).on('change', (ev: ChangeEvent<number>) => {
      this.audienceManager.setBeatInterval(ev.value);
    });

    audienceFolder.addButton({
      title: '👏 欢呼一次'
    }).on('click', () => {
      this.audienceManager.triggerBeat();
    });
  }
}
