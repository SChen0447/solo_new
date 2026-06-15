import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './EventBus';

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private currentTime: number = 12;
  private isPlaying: boolean = false;
  private speed: number = 1;
  private playInterval: number | null = null;
  private sliderHandle: HTMLElement | null = null;
  private timelineTrack: HTMLElement | null = null;
  private timeLabel: HTMLElement | null = null;
  private playBtn: HTMLElement | null = null;
  private isDragging: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.camera = camera;
    this.renderer = renderer;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 800;
    this.controls.target.set(0, 50, 0);

    this.buildTimeline();
    this.buildLoadingSpinner();

    eventBus.on('loadingStart', () => this.showLoading());
    eventBus.on('loadingEnd', () => this.hideLoading());
    eventBus.on('datasetReady', () => {
      this.setTime(12);
    });
  }

  private buildLoadingSpinner(): void {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      border: 4px solid rgba(0, 170, 255, 0.2);
      border-top-color: #00AAFF;
      border-radius: 50%;
      z-index: 200;
      display: none;
      animation: spin 1s linear infinite;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(spinner);
  }

  private showLoading(): void {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  private hideLoading(): void {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  private buildTimeline(): void {
    const timelineContainer = document.createElement('div');
    timelineContainer.id = 'timeline-container';
    timelineContainer.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: 40px;
      background: #222222;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 160px 0 20px;
      box-sizing: border-box;
    `;

    const trackWrapper = document.createElement('div');
    trackWrapper.style.cssText = `
      position: relative;
      flex: 1;
      height: 100%;
      max-width: 1200px;
    `;

    const track = document.createElement('div');
    track.id = 'timeline-track';
    track.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 4px;
      background: #3A3A3A;
      border-radius: 2px;
      transform: translateY(-50%);
      cursor: pointer;
    `;
    this.timelineTrack = track;

    for (let i = 0; i <= 23; i++) {
      const marker = document.createElement('div');
      marker.style.cssText = `
        position: absolute;
        top: 50%;
        left: ${(i / 23) * 100}%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background: #ffffff;
        border-radius: 50%;
        pointer-events: none;
      `;
      track.appendChild(marker);

      if (i % 4 === 0) {
        const label = document.createElement('div');
        label.textContent = `${i}`;
        label.style.cssText = `
          position: absolute;
          top: -18px;
          left: ${(i / 23) * 100}%;
          transform: translateX(-50%);
          color: #ffffff;
          font-size: 10px;
          pointer-events: none;
        `;
        track.appendChild(label);
      }
    }

    const handle = document.createElement('div');
    handle.id = 'timeline-handle';
    handle.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${(this.currentTime / 23) * 100}%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      background: #00AAFF;
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 2px 8px rgba(0, 170, 255, 0.5);
      transition: transform 0.1s ease, box-shadow 0.2s ease;
      z-index: 10;
    `;
    handle.addEventListener('mouseenter', () => {
      handle.style.transform = 'translate(-50%, -50%) scale(1.1)';
    });
    handle.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        handle.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });
    this.sliderHandle = handle;

    const timeLabel = document.createElement('div');
    timeLabel.id = 'timetime-label';
    timeLabel.textContent = `${this.currentTime.toFixed(1)}时`;
    timeLabel.style.cssText = `
      position: absolute;
      top: -32px;
      left: 50%;
      transform: translateX(-50%);
      color: #ffffff;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.6);
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    `;
    handle.appendChild(timeLabel);
    this.timeLabel = timeLabel;

    track.addEventListener('mousedown', (e) => {
      if (e.target === track) {
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        this.setTime(ratio * 23);
      }
      this.isDragging = true;
      handle.style.cursor = 'grabbing';
    });
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isDragging = true;
      handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.timelineTrack) return;
      const rect = this.timelineTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      this.setTime(ratio * 23);
    });
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        handle.style.cursor = 'grab';
        handle.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });

    track.appendChild(handle);
    trackWrapper.appendChild(track);
    timelineContainer.appendChild(trackWrapper);

    const controlsGroup = document.createElement('div');
    controlsGroup.style.cssText = `
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const playBtn = document.createElement('button');
    playBtn.id = 'play-btn';
    playBtn.innerHTML = '&#9654;';
    playBtn.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: #2A2A2A;
      color: #00FF00;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    playBtn.addEventListener('mouseenter', () => {
      playBtn.style.background = '#3A3A3A';
    });
    playBtn.addEventListener('mouseleave', () => {
      playBtn.style.background = '#2A2A2A';
    });
    playBtn.addEventListener('mousedown', () => {
      playBtn.style.transform = 'scale(0.95)';
    });
    playBtn.addEventListener('mouseup', () => {
      playBtn.style.transform = 'scale(1)';
    });
    playBtn.addEventListener('click', () => this.togglePlay());
    this.playBtn = playBtn;

    const speedSelect = document.createElement('select');
    speedSelect.style.cssText = `
      height: 30px;
      background: #2A2A2A;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0 8px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s ease;
    `;
    speedSelect.addEventListener('mouseenter', () => {
      speedSelect.style.background = '#3A3A3A';
    });
    speedSelect.addEventListener('mouseleave', () => {
      speedSelect.style.background = '#2A2A2A';
    });
    ['1x', '2x', '5x'].forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      speedSelect.appendChild(opt);
    });
    speedSelect.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      this.setSpeed(parseInt(val));
    });

    controlsGroup.appendChild(playBtn);
    controlsGroup.appendChild(speedSelect);
    timelineContainer.appendChild(controlsGroup);

    document.body.appendChild(timelineContainer);

    const mq = window.matchMedia('(max-width: 768px)');
    const handleMQ = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        timelineContainer.style.height = '30px';
      } else {
        timelineContainer.style.height = '40px';
      }
    };
    handleMQ(mq);
    mq.addEventListener('change', handleMQ);
  }

  private setTime(time: number): void {
    this.currentTime = time;
    if (this.sliderHandle) {
      this.sliderHandle.style.left = `${(time / 23) * 100}%`;
    }
    if (this.timeLabel) {
      this.timeLabel.textContent = `${time.toFixed(1)}时`;
    }
    eventBus.emit('timeUpdate', { timeIndex: time });
  }

  private setSpeed(speed: number): void {
    this.speed = speed;
    eventBus.emit('speedChange', { speed });
    if (this.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private play(): void {
    this.isPlaying = true;
    if (this.playBtn) {
      this.playBtn.innerHTML = '&#9208;';
      this.playBtn.style.color = '#FFAA00';
    }
    eventBus.emit('playStateChange', { isPlaying: true });
    this.startPlayback();
  }

  private pause(): void {
    this.isPlaying = false;
    if (this.playBtn) {
      this.playBtn.innerHTML = '&#9654;';
      this.playBtn.style.color = '#00FF00';
    }
    eventBus.emit('playStateChange', { isPlaying: false });
    this.stopPlayback();
  }

  private startPlayback(): void {
    if (this.playInterval !== null) return;
    const intervalMs = 100 / this.speed;
    this.playInterval = window.setInterval(() => {
      let newTime = this.currentTime + 0.1;
      if (newTime > 23) newTime = 0;
      this.setTime(newTime);
    }, intervalMs);
  }

  private stopPlayback(): void {
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.stopPlayback();
    this.controls.dispose();
  }
}
