import { MaterialLayer, MATERIAL_TYPES } from '../modules/TerrainBuilder';
import { PollutionSource, FlowConfig, MonitoringWell, ConcentrationRecord } from '../modules/PollutionSimulator';
import { WallConfig, AbsorbentConfig } from '../modules/InterventionHandler';

export interface ControlPanelCallbacks {
  onLayersChange: (layers: MaterialLayer[]) => void;
  onSourceChange: (source: Partial<PollutionSource>) => void;
  onFlowChange: (flow: Partial<FlowConfig>) => void;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
  onWallChange: (wall: Partial<WallConfig>) => void;
  onAbsorbentChange: (absorbent: Partial<AbsorbentConfig>) => void;
  onWellsChange: (wells: MonitoringWell[]) => void;
  onExportCSV: () => void;
  onToggleWells: (visible: boolean) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private layers: MaterialLayer[];
  private wells: MonitoringWell[] = [];
  private records: ConcentrationRecord[] = [];
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private panelCollapsed: boolean = false;
  private wellColors = [
    '#E57373',
    '#81C784',
    '#64B5F6',
    '#FFB74D',
    '#BA68C8',
  ];

  constructor(container: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.layers = MATERIAL_TYPES.slice(0, 3).map((mat, i) => ({
      ...mat,
      thickness: i === 0 ? 10 : i === 1 ? 12 : 8,
    }));

    const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
    this.chartCanvas = canvas;
    this.chartCtx = canvas.getContext('2d')!;

    this.initMaterialControls();
    this.initSourceControls();
    this.initFlowControls();
    this.initSimulationControls();
    this.initInterventionControls();
    this.initWellControls();
    this.initPanelToggle();
    this.resizeChart();
    window.addEventListener('resize', () => this.resizeChart());

    this.wells = [
      { id: 'well1', x: 15, y: 15, z: 15, color: this.wellColors[0] },
      { id: 'well2', x: 35, y: 25, z: 15, color: this.wellColors[1] },
      { id: 'well3', x: 25, y: 35, z: 15, color: this.wellColors[2] },
      { id: 'well4', x: 40, y: 10, z: 15, color: this.wellColors[3] },
    ];
    this.callbacks.onWellsChange(this.wells);
    this.updateLegend();
  }

  private initMaterialControls(): void {
    const container = document.getElementById('material-controls')!;
    container.innerHTML = '';

    this.layers.forEach((layer, index) => {
      const div = document.createElement('div');
      div.className = 'control-item';
      div.innerHTML = `
        <label>${layer.name}厚度 <span class="value-display" id="layer-thick-val-${index}">${layer.thickness}</span> m</label>
        <input type="range" id="layer-thick-${index}" min="1" max="20" step="1" value="${layer.thickness}">
      `;
      container.appendChild(div);

      const slider = document.getElementById(`layer-thick-${index}`) as HTMLInputElement;
      const valDisplay = document.getElementById(`layer-thick-val-${index}`) as HTMLElement;

      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        valDisplay.textContent = value.toString();
        this.layers[index].thickness = value;
        this.callbacks.onLayersChange([...this.layers]);
      });
    });
  }

  private initSourceControls(): void {
    const sourceX = document.getElementById('source-x') as HTMLInputElement;
    const sourceY = document.getElementById('source-y') as HTMLInputElement;
    const sourceZ = document.getElementById('source-z') as HTMLInputElement;
    const sourceConc = document.getElementById('source-conc') as HTMLInputElement;

    const sourceXVal = document.getElementById('source-x-val')!;
    const sourceYVal = document.getElementById('source-y-val')!;
    const sourceZVal = document.getElementById('source-z-val')!;

    sourceX.addEventListener('input', () => {
      sourceXVal.textContent = sourceX.value;
      this.callbacks.onSourceChange({ x: parseFloat(sourceX.value) });
    });

    sourceY.addEventListener('input', () => {
      sourceYVal.textContent = sourceY.value;
      this.callbacks.onSourceChange({ z: parseFloat(sourceY.value) });
    });

    sourceZ.addEventListener('input', () => {
      sourceZVal.textContent = sourceZ.value;
      this.callbacks.onSourceChange({ y: parseFloat(sourceZ.value) });
    });

    sourceConc.addEventListener('change', () => {
      const val = parseFloat(sourceConc.value);
      if (isNaN(val) || val < 100 || val > 5000) {
        sourceConc.classList.add('invalid');
        setTimeout(() => sourceConc.classList.remove('invalid'), 300);
        return;
      }
      this.callbacks.onSourceChange({ concentration: val });
    });
  }

  private initFlowControls(): void {
    const flowXY = document.getElementById('flow-xy') as HTMLInputElement;
    const flowZ = document.getElementById('flow-z') as HTMLInputElement;
    const flowSpeed = document.getElementById('flow-speed') as HTMLInputElement;

    const flowXYVal = document.getElementById('flow-xy-val')!;
    const flowZVal = document.getElementById('flow-z-val')!;

    flowXY.addEventListener('input', () => {
      flowXYVal.textContent = flowXY.value;
      this.callbacks.onFlowChange({ angleXY: parseFloat(flowXY.value) });
    });

    flowZ.addEventListener('input', () => {
      flowZVal.textContent = flowZ.value;
      this.callbacks.onFlowChange({ angleZ: parseFloat(flowZ.value) });
    });

    flowSpeed.addEventListener('change', () => {
      const val = parseFloat(flowSpeed.value);
      if (isNaN(val) || val < 0.1 || val > 10) {
        flowSpeed.classList.add('invalid');
        setTimeout(() => flowSpeed.classList.remove('invalid'), 300);
        return;
      }
      this.callbacks.onFlowChange({ speed: val });
    });
  }

  private initSimulationControls(): void {
    const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
    const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

    btnStart.addEventListener('click', () => {
      this.callbacks.onStartSimulation();
    });

    btnReset.addEventListener('click', () => {
      this.callbacks.onResetSimulation();
      this.records = [];
      this.drawChart();
    });
  }

  private initInterventionControls(): void {
    const toggleWall = document.getElementById('toggle-wall') as HTMLElement;
    const wallControls = document.getElementById('wall-controls') as HTMLElement;
    const wallHeightCtrl = document.getElementById('wall-height-ctrl') as HTMLElement;
    const wallX = document.getElementById('wall-x') as HTMLInputElement;
    const wallH = document.getElementById('wall-h') as HTMLInputElement;
    const wallXVal = document.getElementById('wall-x-val')!;
    const wallHVal = document.getElementById('wall-h-val')!;

    toggleWall.addEventListener('click', () => {
      const isActive = toggleWall.classList.toggle('active');
      wallControls.style.display = isActive ? 'block' : 'none';
      wallHeightCtrl.style.display = isActive ? 'block' : 'none';
      this.callbacks.onWallChange({ enabled: isActive });
    });

    wallX.addEventListener('input', () => {
      wallXVal.textContent = wallX.value;
      this.callbacks.onWallChange({ x: parseFloat(wallX.value) });
    });

    wallH.addEventListener('input', () => {
      wallHVal.textContent = wallH.value;
      this.callbacks.onWallChange({ height: parseFloat(wallH.value) });
    });

    const toggleAbsorbent = document.getElementById('toggle-absorbent') as HTMLElement;
    const absorbentControls = document.getElementById('absorbent-controls') as HTMLElement;
    const absThickCtrl = document.getElementById('abs-thick-ctrl') as HTMLElement;
    const absZ = document.getElementById('abs-z') as HTMLInputElement;
    const absT = document.getElementById('abs-t') as HTMLInputElement;
    const absZVal = document.getElementById('abs-z-val')!;
    const absTVal = document.getElementById('abs-t-val')!;

    toggleAbsorbent.addEventListener('click', () => {
      const isActive = toggleAbsorbent.classList.toggle('active');
      absorbentControls.style.display = isActive ? 'block' : 'none';
      absThickCtrl.style.display = isActive ? 'block' : 'none';
      this.callbacks.onAbsorbentChange({ enabled: isActive });
    });

    absZ.addEventListener('input', () => {
      absZVal.textContent = absZ.value;
      this.callbacks.onAbsorbentChange({ z: parseFloat(absZ.value) });
    });

    absT.addEventListener('input', () => {
      absTVal.textContent = absT.value;
      this.callbacks.onAbsorbentChange({ thickness: parseFloat(absT.value) });
    });
  }

  private initWellControls(): void {
    const toggleWells = document.getElementById('toggle-wells') as HTMLElement;
    toggleWells.addEventListener('click', () => {
      const isActive = toggleWells.classList.toggle('active');
      this.callbacks.onToggleWells(isActive);
    });

    const wellControls = document.getElementById('well-controls')!;
    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn btn-secondary';
    btnAdd.style.fontSize = '11px';
    btnAdd.style.padding = '4px 8px';
    btnAdd.textContent = '+ 添加监测井';
    btnAdd.addEventListener('click', () => {
      if (this.wells.length >= 5) {
        alert('最多只能添加5个监测井');
        return;
      }
      const newWell: MonitoringWell = {
        id: `well${this.wells.length + 1}`,
        x: 25,
        y: 25,
        z: 15,
        color: this.wellColors[this.wells.length],
      };
      this.wells.push(newWell);
      this.callbacks.onWellsChange([...this.wells]);
      this.updateLegend();
      this.renderWellControls();
    });
    wellControls.appendChild(btnAdd);

    this.renderWellControls();
  }

  private renderWellControls(): void {
    const wellControls = document.getElementById('well-controls')!;
    const existingControls = wellControls.querySelectorAll('.well-control-item');
    existingControls.forEach(el => el.remove());

    this.wells.forEach((well, index) => {
      const div = document.createElement('div');
      div.className = 'well-control-item';
      div.style.cssText = 'padding:6px;background:rgba(0,0,0,0.2);border-radius:4px;margin-top:4px;';
      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:${well.color};">监测井 ${index + 1}</span>
          <button class="well-remove" data-id="${well.id}" style="background:none;border:none;color:#E57373;font-size:11px;cursor:pointer;">删除</button>
        </div>
        <div style="display:flex;gap:4px;">
          <input type="number" class="well-x" data-id="${well.id}" value="${well.x.toFixed(0)}" style="width:33%;padding:3px;font-size:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:3px;" placeholder="X">
          <input type="number" class="well-y" data-id="${well.id}" value="${well.y.toFixed(0)}" style="width:33%;padding:3px;font-size:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:3px;" placeholder="Y">
          <input type="number" class="well-z" data-id="${well.id}" value="${well.z.toFixed(0)}" style="width:33%;padding:3px;font-size:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:3px;" placeholder="Z">
        </div>
      `;
      wellControls.appendChild(div);
    });

    wellControls.querySelectorAll('.well-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id!;
        this.wells = this.wells.filter(w => w.id !== id);
        this.callbacks.onWellsChange([...this.wells]);
        this.updateLegend();
        this.renderWellControls();
      });
    });

    wellControls.querySelectorAll('.well-x, .well-y, .well-z').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.dataset.id!;
        const well = this.wells.find(w => w.id === id);
        if (well) {
          const val = parseFloat(target.value);
          if (isNaN(val) || val < 0 || val > 50) {
            target.classList.add('invalid');
            setTimeout(() => target.classList.remove('invalid'), 300);
            return;
          }
          if (target.classList.contains('well-x')) well.x = val;
          if (target.classList.contains('well-y')) well.y = val;
          if (target.classList.contains('well-z')) well.z = val;
          this.callbacks.onWellsChange([...this.wells]);
        }
      });
    });
  }

  private initPanelToggle(): void {
    const toggleBtn = document.getElementById('panel-toggle') as HTMLButtonElement;
    const panel = document.getElementById('control-panel') as HTMLElement;

    toggleBtn.addEventListener('click', () => {
      this.panelCollapsed = !this.panelCollapsed;
      panel.classList.toggle('collapsed', this.panelCollapsed);
      toggleBtn.textContent = this.panelCollapsed ? '▶' : '◀';
    });
  }

  private resizeChart(): void {
    const container = document.getElementById('chart-container')!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.chartCanvas.width = rect.width * dpr;
    this.chartCanvas.height = rect.height * dpr;
    this.chartCanvas.style.width = rect.width + 'px';
    this.chartCanvas.style.height = rect.height + 'px';
    this.chartCtx.scale(dpr, dpr);

    this.drawChart();
  }

  public updateRecords(records: ConcentrationRecord[]): void {
    this.records = records.slice(-500);
    this.drawChart();
  }

  private drawChart(): void {
    const ctx = this.chartCtx;
    const container = document.getElementById('chart-container')!;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 25, left: 40 };

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 1; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    if (this.records.length === 0 || this.wells.length === 0) return;

    const maxConc = Math.max(
      100,
      ...this.records.flatMap(r => r.concentrations.map(c => c.concentration))
    );

    const maxTime = Math.max(1, this.records[this.records.length - 1]?.time || 1);

    this.wells.forEach((well, wellIndex) => {
      ctx.strokeStyle = well.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      this.records.forEach((record, i) => {
        const concEntry = record.concentrations.find(c => c.wellId === well.id);
        if (!concEntry) return;

        const x = padding.left + (i / Math.max(1, this.records.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (concEntry.concentration / maxConc) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartHeight - (chartHeight / 4) * i;
      const val = (maxConc / 4) * i;
      ctx.fillText(val.toFixed(0), padding.left - 4, y + 3);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('时间步', padding.left + chartWidth / 2, height - 6);

    ctx.save();
    ctx.translate(12, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('浓度 (mg/L)', 0, 0);
    ctx.restore();
  }

  private updateLegend(): void {
    const legend = document.getElementById('chart-legend')!;
    legend.innerHTML = '';

    this.wells.forEach((well, index) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-color" style="background:${well.color};"></span>井${index + 1}`;
      legend.appendChild(item);
    });
  }

  public updateStartButton(running: boolean): void {
    const btn = document.getElementById('btn-start') as HTMLButtonElement;
    btn.textContent = running ? '暂停模拟' : '开始模拟';
  }

  public updateFPS(fps: number): void {
    const el = document.getElementById('fps-display');
    if (el) {
      el.textContent = fps.toFixed(0);
    }
  }

  public updateParticleCount(count: number): void {
    const el = document.getElementById('particle-count');
    if (el) {
      el.textContent = count.toFixed(0);
    }
  }

  public updateSimTime(time: number): void {
    const el = document.getElementById('sim-time');
    if (el) {
      el.textContent = time.toFixed(1);
    }
  }

  public updatePollutionArea(area: number): void {
    const el = document.getElementById('pollution-area');
    if (el) {
      el.textContent = area.toFixed(1);
    }
  }

  public showMaterialInfo(layer: MaterialLayer | null): void {
    const panel = document.getElementById('material-info') as HTMLElement;
    if (!layer) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    const nameEl = document.getElementById('mi-name')!;
    const permEl = document.getElementById('mi-perm')!;
    const poroEl = document.getElementById('mi-poro')!;

    nameEl.textContent = layer.name;
    permEl.textContent = layer.permeability.toFixed(3) + ' m/d';
    poroEl.textContent = (layer.porosity * 100).toFixed(1) + '%';
  }

  public getLayers(): MaterialLayer[] {
    return [...this.layers];
  }

  public exportCSV(): string {
    let csv = '时间步';
    this.wells.forEach(well => {
      csv += `,${well.id} (mg/L)`;
    });
    csv += '\n';

    this.records.forEach(record => {
      csv += record.time.toFixed(2);
      this.wells.forEach(well => {
        const entry = record.concentrations.find(c => c.wellId === well.id);
        csv += `,${entry ? entry.concentration.toFixed(2) : '0'}`;
      });
      csv += '\n';
    });

    return csv;
  }
}
