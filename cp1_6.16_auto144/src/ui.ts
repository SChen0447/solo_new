import * as THREE from 'three';
import { Fault } from './fault';
import { Vein, VeinType } from './vein';

export interface UICallbacks {
  onAddFault: () => void;
  onRemoveFault: (id: string) => void;
  onAddVein: (type: VeinType) => void;
  onRemoveVein: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
  onFaultParamChange: (id: string, param: 'strike' | 'dip' | 'throw', value: number) => void;
}

export class UI {
  private container: HTMLElement;
  private sidePanel: HTMLElement;
  private infoCard: HTMLElement;
  private controlPanel: HTMLElement;
  private faultList: HTMLElement;
  private veinList: HTMLElement;
  private tooltip: HTMLElement;
  private callbacks: UICallbacks;

  private faults: Fault[] = [];
  private veins: Vein[] = [];
  private selectedObject: Fault | Vein | null = null;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.sidePanel = this.createElement('div', {
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '320px',
      maxHeight: 'calc(100vh - 40px)',
      background: 'rgba(34, 34, 34, 0.95)',
      borderRadius: '8px',
      padding: '16px',
      color: '#EEE',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      fontSize: '13px',
      overflowY: 'auto',
      zIndex: '100',
      backdropFilter: 'blur(10px)'
    });

    this.infoCard = this.createElement('div', {
      background: '#2a2a2a',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
      minHeight: '60px',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    this.sidePanel.appendChild(this.infoCard);

    const title = this.createElement('h2', {
      margin: '0 0 12px 0',
      fontSize: '16px',
      fontWeight: '600',
      color: '#FF5252',
      borderBottom: '1px solid #444',
      paddingBottom: '8px'
    });
    title.textContent = '三维地质模拟器';
    this.sidePanel.appendChild(title);

    const faultSection = this.createSection('断层管理');
    const addFaultBtn = this.createButton('+ 添加断层', () => this.callbacks.onAddFault());
    faultSection.appendChild(addFaultBtn);
    this.faultList = this.createElement('div', { marginTop: '10px' });
    faultSection.appendChild(this.faultList);
    this.sidePanel.appendChild(faultSection);

    const veinSection = this.createSection('矿脉管理');
    const veinBtns = this.createElement('div', { display: 'flex', gap: '6px', flexWrap: 'wrap' });
    veinBtns.appendChild(this.createButton('+ 金矿', () => this.callbacks.onAddVein('gold'), '#FFD700'));
    veinBtns.appendChild(this.createButton('+ 铁矿', () => this.callbacks.onAddVein('iron'), '#A1887F'));
    veinBtns.appendChild(this.createButton('+ 铜矿', () => this.callbacks.onAddVein('copper'), '#FF7043'));
    veinSection.appendChild(veinBtns);
    this.veinList = this.createElement('div', { marginTop: '10px' });
    veinSection.appendChild(this.veinList);
    this.sidePanel.appendChild(veinSection);

    this.controlPanel = this.createElement('div', {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(34, 34, 34, 0.9)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      gap: '12px',
      zIndex: '100',
      backdropFilter: 'blur(10px)'
    });

    const resetBtn = this.createCircularButton('↺', '#E53935', '#C62828', () => this.callbacks.onReset());
    resetBtn.title = '重置场景';
    const exportBtn = this.createCircularButton('⬇', '#1565C0', '#0D47A1', () => this.callbacks.onExport());
    exportBtn.title = '导出配置';

    this.controlPanel.appendChild(resetBtn);
    this.controlPanel.appendChild(exportBtn);

    this.tooltip = this.createElement('div', {
      position: 'fixed',
      background: '#333',
      color: '#FFF',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.15s',
      zIndex: '1000'
    });

    this.container.appendChild(this.sidePanel);
    this.container.appendChild(this.controlPanel);
    this.container.appendChild(this.tooltip);
  }

  private createElement(tag: string, style: Record<string, string>): HTMLElement {
    const el = document.createElement(tag);
    Object.assign(el.style, style);
    return el;
  }

  private createSection(title: string): HTMLElement {
    const section = this.createElement('div', { marginBottom: '16px' });
    const header = this.createElement('h3', {
      margin: '0 0 8px 0',
      fontSize: '14px',
      fontWeight: '600',
      color: '#CCC'
    });
    header.textContent = title;
    section.appendChild(header);
    return section;
  }

  private createButton(text: string, onClick: () => void, bgColor?: string): HTMLElement {
    const btn = this.createElement('button', {
      background: bgColor || '#333',
      color: '#EEE',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'background 0.2s',
      flex: '1',
      minWidth: '80px'
    });
    btn.textContent = text;
    btn.addEventListener('mouseenter', () => {
      if (!bgColor) btn.style.background = '#444';
    });
    btn.addEventListener('mouseleave', () => {
      if (!bgColor) btn.style.background = '#333';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createCircularButton(text: string, bg: string, hoverBg: string, onClick: () => void): HTMLElement {
    const btn = this.createElement('button', {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: bg,
      color: '#FFF',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: 'bold',
      transition: 'background 0.2s, transform 0.1s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    btn.textContent = text;
    btn.addEventListener('mouseenter', () => btn.style.background = hoverBg);
    btn.addEventListener('mouseleave', () => btn.style.background = bg);
    btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
    btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (v: number) => void
  ): HTMLElement {
    const wrapper = this.createElement('div', { marginBottom: '10px' });

    const labelRow = this.createElement('div', {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      fontSize: '12px'
    });
    const labelEl = this.createElement('span', { color: '#BBB' });
    labelEl.textContent = label;
    const valueEl = this.createElement('span', {
      color: '#FF5252',
      fontWeight: '500',
      minWidth: '40px',
      textAlign: 'right',
      transition: 'color 0.1s'
    });
    valueEl.textContent = value.toFixed(step < 1 ? 1 : 0);
    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    wrapper.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      WebkitAppearance: 'none',
      appearance: 'none',
      background: '#555',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer'
    });

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #FF5252;
        cursor: pointer;
        transition: transform 0.1s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #FF5252;
        cursor: pointer;
        border: none;
      }
    `;
    if (!document.querySelector('style[data-slider-style]')) {
      styleSheet.setAttribute('data-slider-style', 'true');
      document.head.appendChild(styleSheet);
    }

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = v.toFixed(step < 1 ? 1 : 0);
      valueEl.style.color = '#FFF';
      setTimeout(() => valueEl.style.color = '#FF5252', 100);
      onChange(v);
    });

    wrapper.appendChild(slider);
    return wrapper;
  }

  public updateFaults(faults: Fault[]): void {
    this.faults = faults;
    this.faultList.innerHTML = '';
    faults.forEach((fault, index) => {
      const item = this.createElement('div', {
        background: '#2a2a2a',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '8px',
        border: this.selectedObject === fault ? '1px solid #FF5252' : '1px solid transparent',
        transition: 'border-color 0.2s'
      });
      item.style.cursor = 'pointer';

      const header = this.createElement('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      });
      const name = this.createElement('span', { fontWeight: '500' });
      name.textContent = `断层 ${index + 1}`;
      const removeBtn = this.createElement('button', {
        background: 'transparent',
        color: '#E53935',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '2px 6px',
        borderRadius: '4px'
      });
      removeBtn.textContent = '×';
      removeBtn.title = '删除断层';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onRemoveFault(fault.id);
      });
      header.appendChild(name);
      header.appendChild(removeBtn);
      item.appendChild(header);

      item.appendChild(this.createSlider('走向 (°)', 0, 360, 1, fault.strike, (v) => {
        this.callbacks.onFaultParamChange(fault.id, 'strike', v);
      }));
      item.appendChild(this.createSlider('倾角 (°)', 0, 90, 1, fault.dip, (v) => {
        this.callbacks.onFaultParamChange(fault.id, 'dip', v);
      }));
      item.appendChild(this.createSlider('断距', 0, 30, 0.5, fault.throw, (v) => {
        this.callbacks.onFaultParamChange(fault.id, 'throw', v);
      }));

      item.addEventListener('click', () => this.setSelectedObject(fault));
      this.faultList.appendChild(item);
    });
  }

  public updateVeins(veins: Vein[], faults: Fault[]): void {
    this.veins = veins;
    this.veinList.innerHTML = '';
    veins.forEach((vein, index) => {
      const item = this.createElement('div', {
        background: '#2a2a2a',
        borderRadius: '6px',
        padding: '10px',
        marginBottom: '8px',
        border: this.selectedObject === vein ? '1px solid #FF5252' : '1px solid transparent',
        transition: 'border-color 0.2s',
        cursor: 'pointer'
      });

      const header = this.createElement('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      });
      const nameWrapper = this.createElement('div', { display: 'flex', alignItems: 'center', gap: '8px' });
      const colorDot = this.createElement('div', {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: `#${vein.getColor().toString(16).padStart(6, '0')}`
      });
      const name = this.createElement('span', { fontWeight: '500' });
      name.textContent = `${vein.getName()} ${index + 1}`;
      nameWrapper.appendChild(colorDot);
      nameWrapper.appendChild(name);

      const removeBtn = this.createElement('button', {
        background: 'transparent',
        color: '#E53935',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '2px 6px',
        borderRadius: '4px'
      });
      removeBtn.textContent = '×';
      removeBtn.title = '删除矿脉';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onRemoveVein(vein.id);
      });
      header.appendChild(nameWrapper);
      header.appendChild(removeBtn);
      item.appendChild(header);

      const info = this.createElement('div', {
        fontSize: '11px',
        color: '#888',
        marginTop: '6px'
      });
      info.textContent = `${vein.shape === 'tube' ? '管状' : '透镜状'} · ${(vein.volume).toFixed(1)} 立方单位`;
      item.appendChild(info);

      item.addEventListener('click', () => this.setSelectedObject(vein, faults));
      this.veinList.appendChild(item);
    });
  }

  public setSelectedObject(obj: Fault | Vein | null, faults: Fault[] = []): void {
    this.selectedObject = obj;

    if (obj === null) {
      this.infoCard.style.opacity = '0';
      setTimeout(() => this.infoCard.innerHTML = '', 300);
    } else {
      this.infoCard.style.opacity = '1';
      if (obj instanceof Fault) {
        this.infoCard.innerHTML = `
          <div style="font-weight:600;color:#FF5252;margin-bottom:8px;">断层信息</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <span style="color:#888;">走向:</span><span>${obj.strike.toFixed(1)}°</span>
            <span style="color:#888;">倾角:</span><span>${obj.dip.toFixed(1)}°</span>
            <span style="color:#888;">断距:</span><span>${obj.throw.toFixed(1)} 单位</span>
          </div>
        `;
      } else {
        this.infoCard.innerHTML = `
          <div style="font-weight:600;color:#${(obj as Vein).getColor().toString(16).padStart(6, '0')};margin-bottom:8px;">${(obj as Vein).getName()}信息</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <span style="color:#888;">矿种:</span><span>${(obj as Vein).getName()}</span>
            <span style="color:#888;">形状:</span><span>${(obj as Vein).shape === 'tube' ? '管状' : '透镜状'}</span>
            <span style="color:#888;">体积:</span><span>${(obj as Vein).volume.toFixed(1)}</span>
            <span style="color:#888;">相交断层:</span><span>${(obj as Vein).getIntersectingFaultCount(faults)} 条</span>
          </div>
        `;
      }
    }

    this.updateFaults(this.faults);
    this.updateVeins(this.veins, faults);
  }

  public showTooltip(x: number, y: number, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.style.left = (x + 12) + 'px';
    this.tooltip.style.top = (y + 12) + 'px';
    this.tooltip.style.opacity = '1';
  }

  public hideTooltip(): void {
    this.tooltip.style.opacity = '0';
  }

  public dispose(): void {
    this.sidePanel.remove();
    this.controlPanel.remove();
    this.tooltip.remove();
  }
}
