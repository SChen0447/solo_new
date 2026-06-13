import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Terrain, StratumLayer } from '../terrain/terrainGenerator';
import { FossilManager, FossilData } from '../terrain/fossilManager';

export interface InteractionEvents {
  onFossilAdded: (data: FossilData) => void;
  onFossilRemoved: (id: string) => void;
}

export class InteractionController {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: Terrain;
  private fossilManager: FossilManager;
  private events: InteractionEvents;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointerNDC: THREE.Vector2 = new THREE.Vector2();
  private hoveredLayer: StratumLayer | null = null;
  private sliderEl: HTMLInputElement | null = null;
  private sliderWrapper: HTMLDivElement | null = null;
  private compassEl: HTMLDivElement | null = null;
  private compassAngle: number = 0;
  private isDraggingSlider: boolean = false;
  private _sliderValue: number = 0;

  constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls,
    terrain: Terrain,
    fossilManager: FossilManager,
    events: InteractionEvents
  ) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.terrain = terrain;
    this.fossilManager = fossilManager;
    this.events = events;

    this.compassEl = this.buildCompass();
    this.buildFaultSlider();

    const canvas = renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.style.touchAction = 'none';
  }

  private buildCompass(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 22px;
      left: 28px;
      width: 120px;
      height: 120px;
      pointer-events: none;
      z-index: 40;
    `;

    const outerRing = document.createElement('div');
    outerRing.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(40, 45, 60, 0.85), rgba(15, 18, 28, 0.95));
      border: 2px solid rgba(255, 140, 50, 0.35);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), inset 0 0 22px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.5);
    `;

    const tickCount = 36;
    for (let i = 0; i < tickCount; i++) {
      const tick = document.createElement('div');
      const major = i % 9 === 0;
      const ang = (i / tickCount) * Math.PI * 2;
      const rIn = major ? 42 : 48;
      const rOut = 55;
      const x1 = 60 + Math.sin(ang) * rIn;
      const y1 = 60 - Math.cos(ang) * rIn;
      const x2 = 60 + Math.sin(ang) * rOut;
      const y2 = 60 - Math.cos(ang) * rOut;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      tick.style.cssText = `
        position: absolute;
        left: ${midX}px;
        top: ${midY}px;
        width: ${major ? 2.5 : 1.2}px;
        height: ${len}px;
        transform: translate(-50%, -50%) rotate(${ang}rad);
        background: ${major ? '#ffb366' : 'rgba(180, 190, 210, 0.45)'};
        border-radius: 1px;
      `;
      el.appendChild(tick);
    }

    const dirs: Array<[string, number, string]> = [
      ['N', 0, '#ff6a33'],
      ['E', Math.PI / 2, '#b8c4d8'],
      ['S', Math.PI, '#b8c4d8'],
      ['W', -Math.PI / 2, '#b8c4d8']
    ];
    for (const [lbl, ang, color] of dirs) {
      const lblEl = document.createElement('div');
      lblEl.textContent = lbl;
      const r = 30;
      lblEl.style.cssText = `
        position: absolute;
        left: ${60 + Math.sin(ang) * r}px;
        top: ${60 - Math.cos(ang) * r}px;
        transform: translate(-50%, -50%);
        font-size: ${lbl === 'N' ? 18 : 13}px;
        font-weight: 800;
        color: ${color};
        font-family: 'Georgia', serif;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        letter-spacing: 0.5px;
      `;
      el.appendChild(lblEl);
    }

    const needle = document.createElement('div');
    needle.className = 'compass-needle';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');
    const polyN = document.createElementNS(svgNS, 'polygon');
    polyN.setAttribute('points', '50,10 56,50 50,54 44,50');
    polyN.setAttribute('fill', '#ff5a22');
    polyN.setAttribute('stroke', '#8b2a00');
    polyN.setAttribute('stroke-width', '1');
    polyN.setAttribute('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))');
    const polyS = document.createElementNS(svgNS, 'polygon');
    polyS.setAttribute('points', '50,90 56,50 50,46 44,50');
    polyS.setAttribute('fill', '#d0d6e0');
    polyS.setAttribute('stroke', '#4a5060');
    polyS.setAttribute('stroke-width', '1');
    polyS.setAttribute('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))');
    const center = document.createElementNS(svgNS, 'circle');
    center.setAttribute('cx', '50');
    center.setAttribute('cy', '50');
    center.setAttribute('r', '5');
    center.setAttribute('fill', '#2a2a35');
    center.setAttribute('stroke', '#ff9040');
    center.setAttribute('stroke-width', '1.2');
    svg.appendChild(polyN);
    svg.appendChild(polyS);
    svg.appendChild(center);
    svg.style.cssText = `
      position: absolute;
      inset: 10px;
      transition: transform 0.15s linear;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.55));
    `;
    needle.appendChild(svg);
    (needle as any)._svg = svg;
    el.appendChild(outerRing);
    el.appendChild(needle);

    this.container.appendChild(el);
    return el;
  }

  private buildFaultSlider(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      right: 328px;
      bottom: 36px;
      z-index: 45;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: rgba(220, 220, 230, 0.75);
      letter-spacing: 0.4px;
    `;
    label.innerHTML = `
      <span style="font-size:13px">⛰️</span>
      <span>断层模拟</span>
      <span class="slider-val" style="
        color: #ffa866;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        min-width: 30px;
        text-align: right;
      ">0</span>
      <span style="color:rgba(180,180,190,0.5)">%</span>
    `;

    const trackOuter = document.createElement('div');
    trackOuter.style.cssText = `
      position: relative;
      width: 200px;
      height: 18px;
      display: flex;
      align-items: center;
      cursor: pointer;
    `;

    const trackBg = document.createElement('div');
    trackBg.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
    `;

    const trackFill = document.createElement('div');
    trackFill.className = 'slider-fill';
    trackFill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #ff6a22, #ffb366);
      border-radius: 2px;
      box-shadow: 0 0 12px rgba(255, 120, 40, 0.5);
      transition: width 0.05s linear;
    `;
    trackBg.appendChild(trackFill);

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffd090, #ff7030 60%, #c84a10);
      box-shadow: 0 0 0 2px rgba(255, 140, 50, 0.25), 0 0 14px rgba(255, 120, 40, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      transition: box-shadow 0.2s ease, transform 0.1s ease;
    `;
    thumb.addEventListener('mouseenter', () => {
      thumb.style.transform = 'translate(-50%, -50%) scale(1.18)';
      thumb.style.boxShadow = '0 0 0 3px rgba(255, 140, 50, 0.4), 0 0 20px rgba(255, 140, 50, 0.8), inset 0 -1px 2px rgba(0,0,0,0.3)';
    });
    thumb.addEventListener('mouseleave', () => {
      if (!this.isDraggingSlider) thumb.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    trackOuter.appendChild(trackBg);
    trackOuter.appendChild(thumb);
    wrapper.appendChild(label);
    wrapper.appendChild(trackOuter);
    this.container.appendChild(wrapper);

    this.sliderWrapper = wrapper;

    const setValue = (v: number, fromUser: boolean) => {
      const clamped = Math.max(0, Math.min(100, v));
      this._sliderValue = clamped;
      trackFill.style.width = clamped + '%';
      const leftPct = clamped;
      thumb.style.left = `calc(${leftPct}% )`;
      const valEl = label.querySelector('.slider-val');
      if (valEl) valEl.textContent = String(Math.round(clamped));
      if (fromUser) {
        this.terrain.setFaultOffset(clamped);
      }
    };
    setValue(0, false);

    let pointerId: number | null = null;
    const onDown = (ev: PointerEvent) => {
      ev.preventDefault();
      this.isDraggingSlider = true;
      pointerId = ev.pointerId;
      trackOuter.setPointerCapture(ev.pointerId);
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
      updateFromEvent(ev);
    };
    const onMove = (ev: PointerEvent) => {
      if (!this.isDraggingSlider || ev.pointerId !== pointerId) return;
      updateFromEvent(ev);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      this.isDraggingSlider = false;
      pointerId = null;
      thumb.style.transform = 'translate(-50%, -50%) scale(1)';
      this.terrain.releaseFaultSlider();
    };
    const updateFromEvent = (ev: PointerEvent) => {
      const rect = trackOuter.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setValue(pct, true);
    };

    trackOuter.addEventListener('pointerdown', onDown);
    trackOuter.addEventListener('pointermove', onMove);
    trackOuter.addEventListener('pointerup', onUp);
    trackOuter.addEventListener('pointercancel', onUp);
  }

  private getScreenToWorld(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerMove = (ev: PointerEvent): void => {
    this.getScreenToWorld(ev);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.terrain.getAllPickableMeshes(), false);

    let hitLayer: StratumLayer | null = null;
    if (hits.length > 0) {
      hitLayer = this.terrain.getLayerByMesh(hits[0].object);
    }

    if (hitLayer !== this.hoveredLayer) {
      this.hoveredLayer = hitLayer;
      this.terrain.highlightLayer(hitLayer);
      const canvas = this.renderer.domElement;
      canvas.style.cursor = hitLayer ? 'crosshair' : 'grab';
    }
  };

  private onPointerLeave = (): void => {
    if (this.hoveredLayer) {
      this.hoveredLayer = null;
      this.terrain.highlightLayer(null);
    }
  };

  private onPointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return;
    this.getScreenToWorld(ev);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.terrain.getAllPickableMeshes(), false);
    if (hits.length === 0) return;

    const hit = hits[0];
    const layer = this.terrain.getLayerByMesh(hit.object);
    if (!layer) return;

    const worldPoint = hit.point.clone();
    const data = this.fossilManager.addFossil(worldPoint, layer.name);
    if (data) {
      this.events.onFossilAdded(data);
    }
  };

  public update(deltaTime: number, _cam: THREE.Camera): void {
    this.compassAngle += deltaTime * ((Math.PI * 2) / 10);
    if (this.compassEl) {
      const needle = this.compassEl.querySelector('.compass-needle');
      const svg = (needle as any)?._svg as SVGSVGElement | undefined;
      if (svg) {
        svg.style.transform = `rotate(${(this.compassAngle * 180) / Math.PI}deg)`;
      }
    }
  }

  public getFaultSliderValue(): number {
    return this._sliderValue;
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    if (this.compassEl?.parentNode) this.compassEl.parentNode.removeChild(this.compassEl);
    if (this.sliderWrapper?.parentNode) this.sliderWrapper.parentNode.removeChild(this.sliderWrapper);
  }
}
