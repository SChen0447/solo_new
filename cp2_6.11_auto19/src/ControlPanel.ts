import type { RenderMode } from './ModuleLoader';
import { loadMoleculeFromFile } from './ModuleLoader';

type ControlEventCallback = (event: string, data?: unknown) => void;

export class ControlPanel {
  private _callback: ControlEventCallback | null = null;
  private _fileInput: HTMLInputElement;
  private _btnUpload: HTMLButtonElement;
  private _btnBallStick: HTMLButtonElement;
  private _btnSpaceFill: HTMLButtonElement;
  private _btnWireframe: HTMLButtonElement;
  private _btnLabels: HTMLButtonElement;
  private _btnReset: HTMLButtonElement;
  private _btnCompare: HTMLButtonElement;
  private _mobileToggle: HTMLButtonElement;
  private _controlBar: HTMLElement;
  private _modeButtons: HTMLButtonElement[];
  private _currentMode: RenderMode = 'ball-and-stick';
  private _labelsOn: boolean = false;
  private _compareOn: boolean = false;
  private _uploadForCompare: boolean = false;

  constructor() {
    this._fileInput = document.getElementById('file-input') as HTMLInputElement;
    this._btnUpload = document.getElementById('btn-upload') as HTMLButtonElement;
    this._btnBallStick = document.getElementById('btn-ball-stick') as HTMLButtonElement;
    this._btnSpaceFill = document.getElementById('btn-space-fill') as HTMLButtonElement;
    this._btnWireframe = document.getElementById('btn-wireframe') as HTMLButtonElement;
    this._btnLabels = document.getElementById('btn-labels') as HTMLButtonElement;
    this._btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this._btnCompare = document.getElementById('btn-compare') as HTMLButtonElement;
    this._mobileToggle = document.getElementById('mobile-toggle') as HTMLButtonElement;
    this._controlBar = document.getElementById('control-bar') as HTMLElement;
    this._modeButtons = [this._btnBallStick, this._btnSpaceFill, this._btnWireframe];

    this._bindEvents();
  }

  private _bindEvents(): void {
    this._btnUpload.addEventListener('click', () => {
      this._uploadForCompare = false;
      this._fileInput.click();
    });

    this._fileInput.addEventListener('change', async () => {
      const file = this._fileInput.files?.[0];
      if (!file) return;

      this._showLoading(true);

      try {
        const data = await loadMoleculeFromFile(file);
        if (this._uploadForCompare) {
          this._emit('compare-file-loaded', { data, fileName: file.name });
        } else {
          this._emit('file-loaded', { data, fileName: file.name });
        }
      } catch (e) {
        console.error('Failed to load file:', e);
      } finally {
        this._showLoading(false);
        this._fileInput.value = '';
        this._uploadForCompare = false;
      }
    });

    this._btnBallStick.addEventListener('click', () => this._setMode('ball-and-stick'));
    this._btnSpaceFill.addEventListener('click', () => this._setMode('space-filling'));
    this._btnWireframe.addEventListener('click', () => this._setMode('wireframe'));

    this._btnLabels.addEventListener('click', () => {
      this._labelsOn = !this._labelsOn;
      this._btnLabels.classList.toggle('active', this._labelsOn);
      this._emit('labels-toggled', this._labelsOn);
    });

    this._btnReset.addEventListener('click', () => {
      this._emit('view-reset');
    });

    this._btnCompare.addEventListener('click', () => {
      this._compareOn = !this._compareOn;
      this._btnCompare.classList.toggle('active', this._compareOn);
      this._emit('compare-mode-toggled', this._compareOn);
    });

    this._mobileToggle.addEventListener('click', () => {
      this._controlBar.classList.toggle('mobile-open');
    });
  }

  private _setMode(mode: RenderMode): void {
    if (mode === this._currentMode) return;
    this._currentMode = mode;

    for (const btn of this._modeButtons) {
      btn.classList.remove('active');
    }

    const activeBtn = this._modeButtons.find(b => b.dataset.mode === mode);
    if (activeBtn) activeBtn.classList.add('active');

    this._emit('mode-changed', mode);
  }

  private _showLoading(visible: boolean): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('visible', visible);
    }
  }

  private _emit(event: string, data?: unknown): void {
    if (this._callback) {
      this._callback(event, data);
    }
  }

  onEvent(callback: ControlEventCallback): void {
    this._callback = callback;
  }

  setCompareMode(active: boolean): void {
    this._compareOn = active;
    this._btnCompare.classList.toggle('active', active);
  }

  triggerFileUpload(forCompare: boolean = false): void {
    this._uploadForCompare = forCompare;
    this._fileInput.click();
  }
}
