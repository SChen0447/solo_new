import type { SceneManager } from './SceneManager';
import { MoleculeParser, type MoleculeData } from './MoleculeParser';

interface UIPanelCallbacks {
  onMoleculeLoaded: (data: MoleculeData) => void;
  onResetView: () => void;
  onLoadDemo: () => void;
}

interface SliderState {
  element: string;
  value: number;
  timeout: number | null;
}

export class UIPanel {
  private sceneManager: SceneManager;
  private parser: MoleculeParser;
  private callbacks: UIPanelCallbacks;
  
  private fileInput: HTMLInputElement;
  private loadBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private demoBtn: HTMLButtonElement;
  private statusText: HTMLElement;
  private slidersContainer: HTMLElement;
  
  private sliders: Map<string, SliderState>;
  private currentMoleculeData: MoleculeData | null;
  
  constructor(
    sceneManager: SceneManager,
    parser: MoleculeParser,
    callbacks: UIPanelCallbacks
  ) {
    this.sceneManager = sceneManager;
    this.parser = parser;
    this.callbacks = callbacks;
    
    this.sliders = new Map();
    this.currentMoleculeData = null;
    
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.demoBtn = document.getElementById('demo-btn') as HTMLButtonElement;
    this.statusText = document.getElementById('status-text') as HTMLElement;
    this.slidersContainer = document.getElementById('sliders-container') as HTMLElement;
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.loadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.loadMoleculeFile(file);
      }
    });
    
    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
    
    this.demoBtn.addEventListener('click', () => {
      this.callbacks.onLoadDemo();
    });
  }
  
  private async loadMoleculeFile(file: File): Promise<void> {
    try {
      this.setStatus(`正在加载文件: ${file.name}...`);
      
      const text = await file.text();
      const data = this.parser.parse(text);
      
      if (data.atoms.length === 0) {
        throw new Error('未解析到原子数据');
      }
      
      this.setStatus(
        `加载成功: ${data.atoms.length} 个原子, ${data.bonds.length} 条化学键`
      );
      
      this.callbacks.onMoleculeLoaded(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      this.setStatus(`加载失败: ${message}`, true);
    }
    
    this.fileInput.value = '';
  }
  
  updateSliders(): void {
    const elements = this.sceneManager.getElements();
    
    this.slidersContainer.innerHTML = '';
    this.sliders.clear();
    
    elements.forEach(element => {
      const sliderState: SliderState = {
        element,
        value: 100,
        timeout: null
      };
      
      this.sliders.set(element, sliderState);
      this.createSlider(element, sliderState);
    });
  }
  
  private createSlider(element: string, state: SliderState): void {
    const group = document.createElement('div');
    group.className = 'slider-group';
    
    const header = document.createElement('div');
    header.className = 'slider-header';
    
    const label = document.createElement('span');
    label.className = 'slider-label';
    
    const dot = document.createElement('span');
    dot.className = 'element-dot';
    dot.style.backgroundColor = this.parser.getElementColor(element);
    
    const labelText = document.createTextNode(` ${element} (${this.getElementCount(element)})`);
    
    label.appendChild(dot);
    label.appendChild(labelText);
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = '100%';
    
    header.appendChild(label);
    header.appendChild(valueSpan);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '10';
    slider.max = '100';
    slider.value = '100';
    
    slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      state.value = value;
      valueSpan.textContent = `${value}%`;
      
      const opacity = this.mapValueToOpacity(value);
      this.sceneManager.setElementOpacity(element, opacity);
    });
    
    slider.addEventListener('change', () => {
      if (state.timeout) {
        window.clearTimeout(state.timeout);
      }
      
      state.timeout = window.setTimeout(() => {
        const opacity = this.mapValueToOpacity(state.value);
        this.sceneManager.setElementOpacity(element, opacity);
        state.timeout = null;
      }, 500);
    });
    
    group.appendChild(header);
    group.appendChild(slider);
    this.slidersContainer.appendChild(group);
  }
  
  setMoleculeData(data: MoleculeData): void {
    this.currentMoleculeData = data;
  }
  
  private getElementCount(element: string): number {
    const data = this.currentMoleculeData ?? this.parser.getDemoMoleculeData();
    return data.atoms.filter(a => a.element === element).length;
  }
  
  private mapValueToOpacity(value: number): number {
    const minOpacity = 0.1;
    const maxOpacity = 1;
    const normalized = value / 100;
    return minOpacity + normalized * (maxOpacity - minOpacity);
  }
  
  resetSliders(): void {
    this.sliders.forEach((state, element) => {
      state.value = 100;
      this.sceneManager.setElementOpacity(element, 1);
    });
    
    const sliders = this.slidersContainer.querySelectorAll('input[type="range"]');
    const values = this.slidersContainer.querySelectorAll('.slider-value');
    
    sliders.forEach((slider, index) => {
      (slider as HTMLInputElement).value = '100';
      if (values[index]) {
        values[index].textContent = '100%';
      }
    });
  }
  
  setStatus(text: string, isError: boolean = false): void {
    this.statusText.textContent = text;
    this.statusText.style.color = isError ? '#ff6b6b' : '#888888';
  }
  
  updateStatus(): void {
    const atomCount = this.sceneManager.getAtomCount();
    const bondCount = this.sceneManager.getBondCount();
    
    if (atomCount > 0) {
      this.setStatus(`当前分子: ${atomCount} 个原子, ${bondCount} 条化学键`);
    }
  }
}
