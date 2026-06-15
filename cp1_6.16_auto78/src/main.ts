import { EditorModule } from './editorModule';
import { PhysicsModule, type FrameData } from './physicsModule';
import { RenderModule } from './renderModule';

type AppMode = 'edit' | 'drive';

class App {
  private editor: EditorModule;
  private physics: PhysicsModule;
  private renderer: RenderModule;

  private mode: AppMode = 'edit';
  private lastTime = 0;
  private canvas: HTMLCanvasElement;

  constructor() {
    this.editor = new EditorModule();
    this.physics = new PhysicsModule(this.editor);
    this.renderer = new RenderModule(this.editor, this.physics);

    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.editor.bindCanvas(this.canvas);

    this.setupResize();
    this.setupKeyboard();
    this.setupButtons();
    this.setupDragDrop();
    this.setupCanvasClick();

    this.physics.onReplayFinish = () => {
      this.updateModeUI();
    };

    this.renderer.resize();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.mode === 'drive' && !this.physics.isReplaying) {
      this.physics.update(dt);
    } else if (this.mode === 'drive' && this.physics.isReplaying) {
      this.physics.update(dt);
    }

    this.renderer.render(this.mode);
    requestAnimationFrame(this.loop.bind(this));
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        this.physics.handleKeyDown(key);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.physics.handleKeyUp(e.key.toLowerCase());
    });
  }

  private setupCanvasClick(): void {
    this.canvas.addEventListener('click', (e) => {
      if (this.mode !== 'edit') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.editor.handleCanvasClick(mx, my);
    });
  }

  private setupButtons(): void {
    const btnEdit = document.getElementById('btn-edit')!;
    const btnDrive = document.getElementById('btn-drive')!;
    const btnRecord = document.getElementById('btn-record')!;
    const btnClear = document.getElementById('btn-clear')!;

    btnEdit.addEventListener('click', () => {
      this.setMode('edit');
    });

    btnDrive.addEventListener('click', () => {
      if (this.editor.pathPoints.length < 2) {
        alert('请先创建赛道（至少2个控制点）');
        return;
      }
      this.setMode('drive');
    });

    btnRecord.addEventListener('click', () => {
      if (this.mode !== 'drive') {
        alert('请先切换到驾驶模式');
        return;
      }
      if (this.physics.isRecording) {
        const frames = this.physics.stopRecording();
        btnRecord.textContent = '开始录制';
        btnRecord.classList.remove('active');
        this.downloadJSON(frames);
      } else {
        this.physics.startRecording();
        btnRecord.textContent = '停止录制';
        btnRecord.classList.add('active');
      }
    });

    btnClear.addEventListener('click', () => {
      if (this.mode === 'drive') {
        this.setMode('edit');
      }
      this.editor.clearTrack();
    });
  }

  private setMode(mode: AppMode): void {
    this.mode = mode;
    if (mode === 'drive') {
      this.physics.resetCarToStart();
      this.physics.speedHistory = [];
    } else {
      this.physics.stopReplay();
      if (this.physics.isRecording) {
        this.physics.stopRecording();
        const btnRecord = document.getElementById('btn-record')!;
        btnRecord.textContent = '开始录制';
        btnRecord.classList.remove('active');
      }
    }
    this.updateModeUI();
  }

  private updateModeUI(): void {
    const btnEdit = document.getElementById('btn-edit')!;
    const btnDrive = document.getElementById('btn-drive')!;
    const modeIndicator = document.getElementById('mode-indicator')!;

    btnEdit.classList.toggle('active', this.mode === 'edit');
    btnDrive.classList.toggle('active', this.mode === 'drive');
    modeIndicator.textContent = `模式: ${this.mode === 'edit' ? '编辑' : '驾驶'}`;
  }

  private setupDragDrop(): void {
    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.name.endsWith('.json')) {
        alert('请拖入JSON录制文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string) as FrameData[];
          if (!Array.isArray(data) || data.length === 0) {
            alert('无效的录制数据');
            return;
          }
          if (this.editor.pathPoints.length < 2) {
            alert('请先创建赛道');
            return;
          }
          this.setMode('drive');
          this.physics.startReplay(data);
        } catch {
          alert('JSON文件解析失败');
        }
      };
      reader.readAsText(file);
    });
  }

  private downloadJSON(frames: FrameData[]): void {
    const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `racing-recording-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

new App();
