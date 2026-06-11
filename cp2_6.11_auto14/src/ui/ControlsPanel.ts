import { ParticleMode } from '../types';
import type { AudioState, ControlsPanelCallbacks } from '../types';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export class ControlsPanel {
  private container: HTMLDivElement;
  private callbacks: ControlsPanelCallbacks;

  private fileInput: HTMLInputElement;
  private uploadBtn: HTMLButtonElement;
  private playPauseBtn: HTMLButtonElement;
  private playPauseIcon: HTMLSpanElement;
  private playPauseLabel: HTMLSpanElement;
  private progressBar: HTMLInputElement;
  private currentTimeLabel: HTMLSpanElement;
  private durationLabel: HTMLSpanElement;
  private volumeSlider: HTMLInputElement;
  private volumeLabel: HTMLSpanElement;
  private modeBtn: HTMLButtonElement;
  private modeLabel: HTMLSpanElement;
  private fileLabel: HTMLSpanElement;

  private hamburgerBtn: HTMLButtonElement | null = null;
  private controlsRow: HTMLDivElement;
  private menuOpen = false;
  private seeking = false;

  constructor(callbacks: ControlsPanelCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.className = 'controls-panel';

    this.hamburgerBtn = document.createElement('button');
    this.hamburgerBtn.className = 'hamburger-btn';
    this.hamburgerBtn.innerHTML = '&#9776;';
    this.hamburgerBtn.title = '菜单';
    this.hamburgerBtn.addEventListener('click', () => this.toggleMenu());

    this.controlsRow = document.createElement('div');
    this.controlsRow.className = 'controls-row';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/*,.mp3,.wav';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) {
        this.fileLabel.textContent = f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name;
        this.callbacks.onFileSelected(f);
      }
    });

    this.uploadBtn = document.createElement('button');
    this.uploadBtn.className = 'ctrl-btn';
    this.uploadBtn.innerHTML = '<span class="icon">&#8613;</span><span class="label">上传音频</span>';
    this.uploadBtn.title = '上传 MP3/WAV 音频';
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());

    this.fileLabel = document.createElement('span');
    this.fileLabel.className = 'file-label';
    this.fileLabel.textContent = '未选择文件';

    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.className = 'ctrl-btn primary';
    this.playPauseBtn.disabled = true;
    this.playPauseIcon = document.createElement('span');
    this.playPauseIcon.className = 'icon';
    this.playPauseIcon.textContent = '\u25B6';
    this.playPauseLabel = document.createElement('span');
    this.playPauseLabel.className = 'label';
    this.playPauseLabel.textContent = '播放';
    this.playPauseBtn.appendChild(this.playPauseIcon);
    this.playPauseBtn.appendChild(this.playPauseLabel);
    this.playPauseBtn.addEventListener('click', () => this.callbacks.onPlayPause());

    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress-wrap';
    this.currentTimeLabel = document.createElement('span');
    this.currentTimeLabel.className = 'time-label';
    this.currentTimeLabel.textContent = '00:00';
    this.progressBar = document.createElement('input');
    this.progressBar.type = 'range';
    this.progressBar.min = '0';
    this.progressBar.max = '100';
    this.progressBar.step = '0.01';
    this.progressBar.value = '0';
    this.progressBar.className = 'progress-bar';
    this.progressBar.disabled = true;
    this.progressBar.addEventListener('mousedown', () => { this.seeking = true; });
    this.progressBar.addEventListener('touchstart', () => { this.seeking = true; });
    this.progressBar.addEventListener('mouseup', () => {
      if (this.seeking) { this.seeking = false; this.emitSeek(); }
    });
    this.progressBar.addEventListener('touchend', () => {
      if (this.seeking) { this.seeking = false; this.emitSeek(); }
    });
    this.progressBar.addEventListener('change', () => { if (!this.seeking) this.emitSeek(); });
    this.durationLabel = document.createElement('span');
    this.durationLabel.className = 'time-label';
    this.durationLabel.textContent = '00:00';
    progressWrap.appendChild(this.currentTimeLabel);
    progressWrap.appendChild(this.progressBar);
    progressWrap.appendChild(this.durationLabel);

    const volumeWrap = document.createElement('div');
    volumeWrap.className = 'volume-wrap';
    const volumeIcon = document.createElement('span');
    volumeIcon.className = 'icon';
    volumeIcon.innerHTML = '&#128266;';
    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '1';
    this.volumeSlider.step = '0.01';
    this.volumeSlider.value = '0.8';
    this.volumeSlider.className = 'volume-slider';
    this.volumeSlider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onVolumeChange(v);
    });
    this.volumeLabel = document.createElement('span');
    this.volumeLabel.className = 'volume-label label';
    this.volumeLabel.textContent = '80%';
    volumeWrap.appendChild(volumeIcon);
    volumeWrap.appendChild(this.volumeSlider);
    volumeWrap.appendChild(this.volumeLabel);

    this.modeBtn = document.createElement('button');
    this.modeBtn.className = 'ctrl-btn';
    this.modeBtn.title = '切换可视化模式';
    const modeIcon = document.createElement('span');
    modeIcon.className = 'icon';
    modeIcon.innerHTML = '&#9679;';
    this.modeLabel = document.createElement('span');
    this.modeLabel.className = 'label';
    this.modeLabel.textContent = '球体模式';
    this.modeBtn.appendChild(modeIcon);
    this.modeBtn.appendChild(this.modeLabel);
    this.modeBtn.addEventListener('click', () => this.callbacks.onModeToggle());

    this.controlsRow.appendChild(this.fileInput);
    this.controlsRow.appendChild(this.uploadBtn);
    this.controlsRow.appendChild(this.fileLabel);
    this.controlsRow.appendChild(this.playPauseBtn);
    this.controlsRow.appendChild(progressWrap);
    this.controlsRow.appendChild(volumeWrap);
    this.controlsRow.appendChild(this.modeBtn);

    this.container.appendChild(this.hamburgerBtn);
    this.container.appendChild(this.controlsRow);
  }

  private emitSeek(): void {
    const value = parseFloat(this.progressBar.value);
    const duration = parseFloat(this.progressBar.dataset.duration || '0');
    const max = parseFloat(this.progressBar.max);
    const t = max === 100 ? (value / 100) * duration : value;
    this.callbacks.onSeek(t);
  }

  private toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.controlsRow.classList.add('open');
    } else {
      this.controlsRow.classList.remove('open');
    }
  }

  attach(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  setAudioState(state: AudioState): void {
    this.playPauseBtn.disabled = !state.isLoaded;
    this.progressBar.disabled = !state.isLoaded;
    this.playPauseIcon.textContent = state.isPlaying ? '\u23F8' : '\u25B6';
    this.playPauseLabel.textContent = state.isPlaying ? '暂停' : '播放';
    if (state.duration > 0) {
      this.durationLabel.textContent = formatTime(state.duration);
      this.progressBar.dataset.duration = state.duration.toString();
      if (!this.seeking) {
        this.progressBar.max = state.duration.toString();
        this.progressBar.value = state.currentTime.toString();
      }
      this.currentTimeLabel.textContent = formatTime(state.currentTime);
    } else {
      this.durationLabel.textContent = '00:00';
      this.currentTimeLabel.textContent = '00:00';
      this.progressBar.value = '0';
    }
    const volPct = Math.round(state.volume * 100);
    if (Math.abs(parseFloat(this.volumeSlider.value) - state.volume) > 0.01) {
      this.volumeSlider.value = state.volume.toString();
    }
    this.volumeLabel.textContent = `${volPct}%`;
  }

  setMode(mode: ParticleMode): void {
    if (mode === ParticleMode.SPHERE) {
      this.modeLabel.textContent = '球体模式';
    } else {
      this.modeLabel.textContent = '柱状模式';
    }
  }

  showError(msg: string): void {
    this.fileLabel.textContent = msg;
    this.fileLabel.style.color = '#ff6b6b';
    setTimeout(() => {
      this.fileLabel.style.color = '';
    }, 3000);
  }
}
