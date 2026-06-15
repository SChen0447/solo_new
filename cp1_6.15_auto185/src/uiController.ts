import { AudioAnalyzer } from './audioAnalyzer';
import type { DisplayMode } from './sculptureRenderer';

type UICallbacks = {
  onFileSelected: (file: File) => void;
  onPlayToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onSeek: (time: number) => void;
};

export class UIController {
  private audioAnalyzer: AudioAnalyzer;
  private callbacks: UICallbacks;

  private btnUpload: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private btnPlay: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private btnModeDefault: HTMLButtonElement;
  private btnModeLow: HTMLButtonElement;
  private btnModeHigh: HTMLButtonElement;
  private loadingOverlay: HTMLDivElement;
  private loadingProgressBar: HTMLDivElement;
  private timeDisplay: HTMLSpanElement;
  private waveformProgress: HTMLDivElement;
  private waveformProgressFill: HTMLDivElement;

  private isPlaying = false;

  constructor(audioAnalyzer: AudioAnalyzer, callbacks: UICallbacks) {
    this.audioAnalyzer = audioAnalyzer;
    this.callbacks = callbacks;

    this.btnUpload = document.getElementById('btn-upload') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.btnModeDefault = document.getElementById('btn-mode-default') as HTMLButtonElement;
    this.btnModeLow = document.getElementById('btn-mode-low') as HTMLButtonElement;
    this.btnModeHigh = document.getElementById('btn-mode-high') as HTMLButtonElement;
    this.loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;
    this.loadingProgressBar = document.getElementById('loading-progress-bar') as HTMLDivElement;
    this.timeDisplay = document.getElementById('time-display') as HTMLSpanElement;
    this.waveformProgress = document.getElementById('waveform-progress') as HTMLDivElement;
    this.waveformProgressFill = document.getElementById('waveform-progress-fill') as HTMLDivElement;

    this.bindEvents();
    this.updateTimeDisplay();
  }

  private bindEvents(): void {
    this.btnUpload.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.callbacks.onFileSelected(file);
      }
      target.value = '';
    });

    this.btnPlay.addEventListener('click', () => {
      this.callbacks.onPlayToggle();
    });

    this.volumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.callbacks.onVolumeChange(value / 100);
    });

    this.btnModeDefault.addEventListener('click', () => {
      this.setDisplayMode('default');
    });

    this.btnModeLow.addEventListener('click', () => {
      this.setDisplayMode('low');
    });

    this.btnModeHigh.addEventListener('click', () => {
      this.setDisplayMode('high');
    });

    this.waveformProgress.addEventListener('click', (e) => {
      if (!this.audioAnalyzer.isAudioReady()) return;
      const rect = this.waveformProgress.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = ratio * this.audioAnalyzer.getDuration();
      this.callbacks.onSeek(time);
    });

    this.audioAnalyzer.on('ready', () => {
      this.hideLoading();
      this.btnPlay.disabled = false;
      this.updateTimeDisplay();
    });

    this.audioAnalyzer.on('play', () => {
      this.isPlaying = true;
      this.btnPlay.textContent = '暂停';
    });

    this.audioAnalyzer.on('pause', () => {
      this.isPlaying = false;
      this.btnPlay.textContent = '播放';
    });

    this.audioAnalyzer.on('ended', () => {
      this.isPlaying = false;
      this.btnPlay.textContent = '播放';
      this.updateTimeDisplay();
    });

    this.audioAnalyzer.on('timeupdate', () => {
      this.updateTimeDisplay();
    });
  }

  private setDisplayMode(mode: DisplayMode): void {
    this.btnModeDefault.classList.toggle('active', mode === 'default');
    this.btnModeLow.classList.toggle('active', mode === 'low');
    this.btnModeHigh.classList.toggle('active', mode === 'high');
    this.callbacks.onDisplayModeChange(mode);
  }

  showLoading(): void {
    this.loadingOverlay.classList.add('active');
    this.setLoadingProgress(0);
  }

  hideLoading(): void {
    this.loadingOverlay.classList.remove('active');
  }

  setLoadingProgress(progress: number): void {
    const pct = Math.max(0, Math.min(100, progress * 100));
    this.loadingProgressBar.style.width = `${pct}%`;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateTimeDisplay(): void {
    const current = this.audioAnalyzer.getCurrentTime();
    const duration = this.audioAnalyzer.getDuration();
    this.timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;

    if (duration > 0) {
      const ratio = (current / duration) * 100;
      this.waveformProgressFill.style.width = `${Math.min(100, ratio)}%`;
    }
  }

  dispose(): void {
  }
}
