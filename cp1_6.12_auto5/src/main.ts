import { SceneManager } from './sceneManager';
import { UIController, UIControls } from './uicontroller';
import { ThemeType } from './particleSystem';

class App {
  private sceneManager: SceneManager;
  private uiController: UIController;
  private isInitialized = false;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    const controls = this.getUIControls();
    if (!controls) {
      throw new Error('UI controls not found');
    }

    this.sceneManager = new SceneManager(container, 40000);
    this.uiController = new UIController(controls);

    this.setupEventListeners();
    this.isInitialized = true;

    this.sceneManager.start();
    
    const initialTheme = this.sceneManager.getTheme();
    const gradient = this.sceneManager.getBackgroundGradient();
    this.uiController.updateBackground(gradient);
    this.uiController.setTheme(initialTheme);
    
    const initialCount = this.sceneManager.getParticleCount();
    this.uiController.setParticleCount(initialCount);
  }

  private getUIControls(): UIControls | null {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const micBtn = document.getElementById('micBtn') as HTMLButtonElement;
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    const particleSlider = document.getElementById('particleSlider') as HTMLInputElement;
    const sliderValue = document.getElementById('sliderValue') as HTMLElement;
    const fpsDisplay = document.getElementById('fpsDisplay') as HTMLElement;
    const controlPanel = document.getElementById('controlPanel') as HTMLElement;
    const panelHeader = document.getElementById('panelHeader') as HTMLElement;
    const collapseBtn = document.getElementById('collapseBtn') as HTMLButtonElement;
    const fullscreenBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;
    const toastContainer = document.getElementById('toastContainer') as HTMLElement;

    if (!fileInput || !micBtn || !themeSelect || !particleSlider || 
        !sliderValue || !fpsDisplay || !controlPanel || !panelHeader ||
        !collapseBtn || !fullscreenBtn || !toastContainer) {
      return null;
    }

    return {
      fileInput,
      micBtn,
      themeSelect,
      particleSlider,
      sliderValue,
      fpsDisplay,
      controlPanel,
      panelHeader,
      collapseBtn,
      fullscreenBtn,
      toastContainer
    };
  }

  private setupEventListeners(): void {
    this.uiController.addEventListener('fileSelected', (e: Event) => {
      const customEvent = e as CustomEvent<File>;
      this.handleFileUpload(customEvent.detail);
    });

    this.uiController.addEventListener('micToggle', () => {
      this.handleMicToggle();
    });

    this.uiController.addEventListener('themeChanged', (e: Event) => {
      const customEvent = e as CustomEvent<ThemeType>;
      this.handleThemeChange(customEvent.detail);
    });

    this.uiController.addEventListener('particleCountChanged', (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      this.sceneManager.setParticleCount(customEvent.detail);
    });

    this.sceneManager.addEventListener('fpsUpdate', () => {
      const fps = this.sceneManager.getFPS();
      this.uiController.updateFPS(fps);
    });

    this.sceneManager.addEventListener('audioPlay', () => {
      this.uiController.showToast('音频播放开始', 'success');
    });

    this.sceneManager.addEventListener('audioPause', () => {
      this.uiController.showToast('音频已暂停', 'info');
    });

    this.sceneManager.addEventListener('audioStop', () => {
      this.uiController.showToast('音频已停止', 'info');
      this.uiController.setMicActive(false);
      this.uiController.resetFileInput();
    });

    this.sceneManager.addEventListener('themeChanged', () => {
      const gradient = this.sceneManager.getBackgroundGradient();
      this.uiController.updateBackground(gradient);
    });

    this.uiController.addEventListener('fullscreenToggle', () => {
      this.handleFullscreenToggle();
    });

    window.addEventListener('beforeunload', () => {
      this.dispose();
    });

    window.addEventListener('resize', () => {
      this.sceneManager.handleWindowResize();
    });
  }

  private async handleFileUpload(file: File): Promise<void> {
    const audioEngine = this.sceneManager.getAudioEngine();
    
    try {
      await audioEngine.loadFile(file);
      this.uiController.showToast(`已加载: ${file.name}`, 'success');
      
      this.uiController.setMicActive(false);
      
      try {
        await audioEngine.play();
      } catch (playError) {
        console.warn('Auto-play prevented, waiting for user interaction');
        this.uiController.showToast('点击画面开始播放', 'info');
        
        const playOnClick = async () => {
          try {
            await audioEngine.play();
          } catch (e) {
            console.error('Play error:', e);
          }
          document.removeEventListener('click', playOnClick);
        };
        
        setTimeout(() => {
          document.addEventListener('click', playOnClick, { once: true });
        }, 100);
      }
    } catch (error) {
      console.error('File load error:', error);
      this.uiController.showToast('音频文件加载失败', 'error');
    }
  }

  private async handleMicToggle(): Promise<void> {
    const audioEngine = this.sceneManager.getAudioEngine();
    const sourceType = audioEngine.getSourceType();
    
    if (sourceType === 'microphone') {
      audioEngine.stop();
      this.uiController.setMicActive(false);
      this.uiController.showToast('麦克风已关闭', 'info');
    } else {
      try {
        await audioEngine.startMicrophone();
        this.uiController.setMicActive(true);
        this.uiController.showToast('麦克风已开启', 'success');
      } catch (error) {
        console.error('Microphone error:', error);
        this.uiController.showToast('麦克风权限被拒绝', 'error');
      }
    }
  }

  private handleThemeChange(theme: ThemeType): void {
    this.sceneManager.setTheme(theme);
    
    const themeNames: Record<ThemeType, string> = {
      aurora: '极光',
      lava: '熔岩',
      deepSea: '深海',
      neon: '霓虹'
    };
    
    this.uiController.showToast(`已切换到${themeNames[theme]}主题`, 'info');
  }

  private handleFullscreenToggle(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        this.uiController.showToast('无法进入全屏模式', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  }

  dispose(): void {
    if (!this.isInitialized) return;
    
    this.sceneManager.dispose();
    this.uiController.dispose();
    this.isInitialized = false;
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new App();
    console.log('🎵 3D Particle Music Visualizer initialized');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
