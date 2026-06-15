import GUI from 'lil-gui';
import { EventBus, SimParams, WaveType } from './eventBus';

const DEFAULT_DEPTH = 15;
const DEFAULT_MAG = 6;
const DEFAULT_WAVES: WaveType[] = ['P', 'S', 'L'];

export class UIController {
  private bus: EventBus;
  private gui: GUI;
  private simulating = false;

  private params: SimParams = {
    depth: DEFAULT_DEPTH,
    magnitude: DEFAULT_MAG,
    waveTypes: new Set<WaveType>(DEFAULT_WAVES)
  };

  private depthSlider!: HTMLInputElement;
  private magSlider!: HTMLInputElement;
  private depthVal!: HTMLElement;
  private magVal!: HTMLElement;
  private progFill!: HTMLElement;
  private progPct!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private waveBtns!: NodeListOf<HTMLButtonElement>;

  private mDepth!: HTMLButtonElement;
  private mMag!: HTMLButtonElement;
  private mWave!: HTMLButtonElement;
  private mStart!: HTMLButtonElement;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.cacheDom();
    this.gui = new GUI({ title: 'Advanced 调试面板', container: document.body });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '80px';
    this.gui.domElement.style.right = '16px';
    this.gui.domElement.style.zIndex = '80';
    this.gui.domElement.style.display = 'none';
    this.bindDomEvents();
    this.buildLilGui();
    this.setupBusListeners();
    this.emitParamsChanged();
  }

  private cacheDom(): void {
    this.depthSlider = document.getElementById('depthSlider') as HTMLInputElement;
    this.magSlider = document.getElementById('magSlider') as HTMLInputElement;
    this.depthVal = document.getElementById('depthVal')!;
    this.magVal = document.getElementById('magVal')!;
    this.progFill = document.getElementById('progFill')!;
    this.progPct = document.getElementById('progPct')!;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.waveBtns = document.querySelectorAll('#waveButtons .wave-btn') as NodeListOf<HTMLButtonElement>;
    this.mDepth = document.getElementById('mDepth') as HTMLButtonElement;
    this.mMag = document.getElementById('mMag') as HTMLButtonElement;
    this.mWave = document.getElementById('mWave') as HTMLButtonElement;
    this.mStart = document.getElementById('mStart') as HTMLButtonElement;
  }

  private bindDomEvents(): void {
    this.depthSlider.addEventListener('input', () => {
      this.params.depth = parseInt(this.depthSlider.value, 10);
      this.depthVal.textContent = String(this.params.depth);
      this.emitParamsChanged();
    });

    this.magSlider.addEventListener('input', () => {
      this.params.magnitude = parseFloat(this.magSlider.value);
      this.magVal.textContent = this.params.magnitude.toFixed(1);
      this.emitParamsChanged();
    });

    this.waveBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const wave = btn.dataset.wave as WaveType;
        if (!wave) return;
        if (this.params.waveTypes.has(wave)) {
          if (this.params.waveTypes.size <= 1) return;
          this.params.waveTypes.delete(wave);
          btn.classList.remove('active');
        } else {
          this.params.waveTypes.add(wave);
          btn.classList.add('active');
        }
        this.emitParamsChanged();
      });
    });

    this.startBtn.addEventListener('click', () => {
      this.startBtn.classList.add('rippling');
      setTimeout(() => this.startBtn.classList.remove('rippling'), 650);
      this.toggleSimulation();
    });

    this.mStart.addEventListener('click', () => this.toggleSimulation());

    this.mDepth.addEventListener('click', () => {
      let d = this.params.depth + 10;
      if (d > 50) d = 5;
      this.params.depth = d;
      this.depthSlider.value = String(d);
      this.depthVal.textContent = String(d);
      this.emitParamsChanged();
      this.mDepth.classList.add('active');
      setTimeout(() => this.mDepth.classList.remove('active'), 280);
    });

    this.mMag.addEventListener('click', () => {
      let m = +(this.params.magnitude + 1).toFixed(1);
      if (m > 9) m = 3;
      this.params.magnitude = m;
      this.magSlider.value = String(m);
      this.magVal.textContent = m.toFixed(1);
      this.emitParamsChanged();
      this.mMag.classList.add('active');
      setTimeout(() => this.mMag.classList.remove('active'), 280);
    });

    const waveCycle: WaveType[] = ['P', 'S', 'L'];
    let wIdx = 0;
    this.mWave.addEventListener('click', () => {
      const next = waveCycle[wIdx % waveCycle.length];
      wIdx++;
      this.params.waveTypes = new Set([next]);
      this.waveBtns.forEach((b) => {
        b.classList.toggle('active', b.dataset.wave === next);
      });
      this.emitParamsChanged();
      this.mWave.classList.add('active');
      setTimeout(() => this.mWave.classList.remove('active'), 280);
    });
  }

  private buildLilGui(): void {
    const state: Record<string, any> = {
      震源深度_km: this.params.depth,
      震级_M: this.params.magnitude,
      纵波_P: this.params.waveTypes.has('P'),
      横波_S: this.params.waveTypes.has('S'),
      面波_L: this.params.waveTypes.has('L'),
      调试模式: false
    };

    this.gui
      .add(state, '震源深度_km', 5, 50, 1)
      .onChange((v: number) => {
        this.params.depth = v;
        this.depthSlider.value = String(v);
        this.depthVal.textContent = String(Math.round(v));
        this.emitParamsChanged();
      })
      .name('Depth (km)');

    this.gui
      .add(state, '震级_M', 3, 9, 0.1)
      .onChange((v: number) => {
        this.params.magnitude = v;
        this.magSlider.value = String(v);
        this.magVal.textContent = v.toFixed(1);
        this.emitParamsChanged();
      })
      .name('Magnitude');

    const syncWave = (w: WaveType) => (on: boolean) => {
      if (on) this.params.waveTypes.add(w);
      else if (this.params.waveTypes.size > 1) this.params.waveTypes.delete(w);
      this.waveBtns.forEach((b) => {
        if (b.dataset.wave === w) b.classList.toggle('active', this.params.waveTypes.has(w));
      });
      state[w === 'P' ? '纵波_P' : w === 'S' ? '横波_S' : '面波_L'] = this.params.waveTypes.has(w);
      this.emitParamsChanged();
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    };

    const wavesFolder = this.gui.addFolder('Wave Types 波形');
    wavesFolder.add(state, '纵波_P').onChange(syncWave('P')).name('P Wave');
    wavesFolder.add(state, '横波_S').onChange(syncWave('S')).name('S Wave');
    wavesFolder.add(state, '面波_L').onChange(syncWave('L')).name('L Wave');
    wavesFolder.open();

    this.gui
      .add(state, '调试模式')
      .onChange((v: boolean) => {
        this.gui.domElement.style.display = v ? '' : 'none';
      })
      .name('Debug Panel');

    this.gui.add(
      {
        开始模拟: () => this.toggleSimulation()
      },
      '开始模拟'
    ).name('Toggle Sim ▶');
  }

  private setupBusListeners(): void {
    this.bus.on('simulation:progress', ({ progress }) => {
      const pct = Math.round(progress * 100);
      this.progFill.style.width = `${pct}%`;
      this.progPct.textContent = `${pct}%`;
    });
    this.bus.on('simulation:complete', () => {
      this.simulating = false;
      this.startBtn.classList.remove('running');
      const firstSpan = this.startBtn.querySelector('span:first-child') as HTMLElement | null;
      if (firstSpan) firstSpan.textContent = '▶';
      this.mStart.textContent = '▶';
      this.mStart.classList.remove('active');
    });
  }

  private emitParamsChanged(): SimParams {
    const p: SimParams = {
      depth: this.params.depth,
      magnitude: this.params.magnitude,
      waveTypes: new Set(this.params.waveTypes)
    };
    this.bus.emit('params:changed', p);
    return p;
  }

  private toggleSimulation(): void {
    if (this.simulating) {
      this.simulating = false;
      this.stopSimulation();
      return;
    }
    this.simulating = true;
    const p = this.emitParamsChanged();
    this.bus.emit('simulation:start', p);
    this.startBtn.classList.add('running');
    const firstSpan = this.startBtn.querySelector('span:first-child') as HTMLElement | null;
    if (firstSpan) firstSpan.textContent = '■';
    this.mStart.textContent = '■';
    this.mStart.classList.add('active');
  }

  private stopSimulation(): void {
    this.bus.emit('simulation:complete', undefined as unknown as void);
  }

  setSimulationRunning(running: boolean): void {
    this.simulating = running;
    const firstSpan = this.startBtn.querySelector('span:first-child') as HTMLElement | null;
    if (running) {
      this.startBtn.classList.add('running');
      if (firstSpan) firstSpan.textContent = '■';
    } else {
      this.startBtn.classList.remove('running');
      if (firstSpan) firstSpan.textContent = '▶';
    }
  }

  isSimulating(): boolean {
    return this.simulating;
  }

  dispose(): void {
    this.gui.destroy();
  }
}
