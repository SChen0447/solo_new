import { ColorTheme, THEMES } from './galaxy'

interface ControlPanelCallbacks {
  onParticleCountChange: (count: number) => void
  onSpeedChange: (speed: number) => void
  onThemeChange: (theme: ColorTheme) => void
}

export class ControlPanel {
  private container: HTMLElement
  private panel: HTMLElement
  private callbacks: ControlPanelCallbacks
  private currentParticleCount: number = 5000
  private currentSpeed: number = 1
  private currentTheme: ColorTheme = 'nebula-purple'
  private isMobile: boolean = false
  private isPanelOpen: boolean = false
  private particleSlider: HTMLInputElement | null = null
  private speedSlider: HTMLInputElement | null = null
  private particleValueDisplay: HTMLElement | null = null
  private speedValueDisplay: HTMLElement | null = null

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks
    this.container = document.getElementById('app') as HTMLElement
    this.panel = this.createPanel()
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile.bind(this))

    const mobileToggle = document.getElementById('mobile-toggle')
    if (mobileToggle) {
      mobileToggle.addEventListener('click', this.togglePanel.bind(this))
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768
    this.updatePanelPosition()
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'control-panel'
    panel.innerHTML = this.getPanelHTML()
    this.container.appendChild(panel)

    this.particleSlider = panel.querySelector('#particle-count') as HTMLInputElement
    this.speedSlider = panel.querySelector('#rotation-speed') as HTMLInputElement
    this.particleValueDisplay = panel.querySelector('#particle-value') as HTMLElement
    this.speedValueDisplay = panel.querySelector('#speed-value') as HTMLElement

    this.bindEvents(panel)
    this.injectStyles()

    return panel
  }

  private getPanelHTML(): string {
    const themeButtons = Object.entries(THEMES)
      .map(([key, theme]) => {
        const isActive = key === this.currentTheme
        const colorGradient = theme.colors.map((c, i) => `${c} ${i * 33}%`).join(', ')
        return `
          <button 
            class="theme-btn ${isActive ? 'active' : ''}" 
            data-theme="${key}"
            title="${theme.name}"
          >
            <span class="theme-preview" style="background: linear-gradient(135deg, ${colorGradient})"></span>
            <span class="theme-name">${theme.name}</span>
          </button>
        `
      })
      .join('')

    return `
      <div class="panel-header">
        <h2 class="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
          星系控制台
        </h2>
        <button class="close-btn" id="close-panel" aria-label="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="panel-content">
        <div class="control-group">
          <label class="control-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path>
            </svg>
            粒子数量
          </label>
          <div class="slider-container">
            <input 
              type="range" 
              id="particle-count" 
              min="1000" 
              max="10000" 
              step="500" 
              value="${this.currentParticleCount}"
            />
            <span class="slider-value" id="particle-value">${this.currentParticleCount.toLocaleString()}</span>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            旋转速度
          </label>
          <div class="slider-container">
            <input 
              type="range" 
              id="rotation-speed" 
              min="0" 
              max="5" 
              step="0.1" 
              value="${this.currentSpeed}"
            />
            <span class="slider-value" id="speed-value">${this.currentSpeed.toFixed(1)}x</span>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="13.5" cy="6.5" r=".5"></circle>
              <circle cx="17.5" cy="10.5" r=".5"></circle>
              <circle cx="8.5" cy="7.5" r=".5"></circle>
              <circle cx="6.5" cy="12.5" r=".5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
            颜色主题
          </label>
          <div class="theme-buttons">
            ${themeButtons}
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <p class="hint">拖拽旋转视角 · 滚轮缩放</p>
      </div>
    `
  }

  private bindEvents(panel: HTMLElement): void {
    if (this.particleSlider) {
      this.particleSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value)
        this.currentParticleCount = value
        if (this.particleValueDisplay) {
          this.particleValueDisplay.textContent = value.toLocaleString()
        }
      })

      this.particleSlider.addEventListener('change', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value)
        this.callbacks.onParticleCountChange(value)
      })
    }

    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value)
        this.currentSpeed = value
        if (this.speedValueDisplay) {
          this.speedValueDisplay.textContent = value.toFixed(1) + 'x'
        }
        this.callbacks.onSpeedChange(value)
      })
    }

    const themeButtons = panel.querySelectorAll('.theme-btn')
    themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.theme as ColorTheme
        this.setActiveTheme(theme)
        this.callbacks.onThemeChange(theme)
      })
    })

    const closeBtn = panel.querySelector('#close-panel')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.isMobile) {
          this.hide()
        }
      })
    }
  }

  private setActiveTheme(theme: ColorTheme): void {
    this.currentTheme = theme
    const themeButtons = this.panel.querySelectorAll('.theme-btn')
    themeButtons.forEach((btn) => {
      const btnTheme = (btn as HTMLElement).dataset.theme
      if (btnTheme === theme) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }

  private updatePanelPosition(): void {
    if (this.isMobile) {
      this.panel.classList.add('mobile-drawer')
      this.panel.classList.remove('desktop-panel')
      if (!this.isPanelOpen) {
        this.hide()
      }
    } else {
      this.panel.classList.remove('mobile-drawer')
      this.panel.classList.add('desktop-panel')
      this.show()
    }
  }

  private togglePanel(): void {
    if (this.isPanelOpen) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    this.isPanelOpen = true
    this.panel.style.display = 'flex'
    requestAnimationFrame(() => {
      if (this.isMobile) {
        this.panel.style.transform = 'translateY(0)'
      } else {
        this.panel.style.opacity = '1'
        this.panel.style.transform = 'translateX(0)'
      }
    })
  }

  hide(): void {
    this.isPanelOpen = false
    if (this.isMobile) {
      this.panel.style.transform = 'translateY(100%)'
      setTimeout(() => {
        if (!this.isPanelOpen) {
          this.panel.style.display = 'none'
        }
      }, 300)
    } else {
      this.panel.style.opacity = '0'
      this.panel.style.transform = 'translateX(-20px)'
    }
  }

  updateParticleCount(count: number): void {
    this.currentParticleCount = count
    if (this.particleSlider) {
      this.particleSlider.value = count.toString()
    }
    if (this.particleValueDisplay) {
      this.particleValueDisplay.textContent = count.toLocaleString()
    }
  }

  updateSpeed(speed: number): void {
    this.currentSpeed = speed
    if (this.speedSlider) {
      this.speedSlider.value = speed.toString()
    }
    if (this.speedValueDisplay) {
      this.speedValueDisplay.textContent = speed.toFixed(1) + 'x'
    }
  }

  updateTheme(theme: ColorTheme): void {
    this.setActiveTheme(theme)
  }

  private injectStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .control-panel {
        position: fixed;
        display: flex;
        flex-direction: column;
        background: rgba(20, 20, 40, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.9);
        z-index: 150;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .desktop-panel {
        top: 16px;
        left: 16px;
        width: 280px;
        max-height: calc(100vh - 32px);
        opacity: 1;
        transform: translateX(0);
      }

      .mobile-drawer {
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-height: 80vh;
        border-radius: 16px 16px 0 0;
        transform: translateY(100%);
        display: none;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.02);
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        color: rgba(255, 255, 255, 0.95);
      }

      .close-btn {
        display: none;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.3s ease;
        align-items: center;
        justify-content: center;
      }

      .mobile-drawer .close-btn {
        display: flex;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }

      .panel-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .control-group {
        margin-bottom: 24px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12px;
      }

      .slider-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      input[type="range"] {
        flex: 1;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      input[type="range"]:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #8b5cf6, #a78bfa);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        transition: all 0.3s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6);
      }

      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #8b5cf6, #a78bfa);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        transition: all 0.3s ease;
      }

      input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6);
      }

      .slider-value {
        min-width: 60px;
        text-align: right;
        font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        font-size: 14px;
        font-weight: 600;
        color: #a78bfa;
      }

      .theme-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .theme-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: rgba(255, 255, 255, 0.7);
      }

      .theme-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        color: rgba(255, 255, 255, 0.9);
      }

      .theme-btn.active {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.15);
        color: #a78bfa;
      }

      .theme-preview {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .theme-name {
        font-size: 12px;
        font-weight: 500;
      }

      .panel-footer {
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.02);
      }

      .hint {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        text-align: center;
      }

      @media (max-width: 768px) {
        .control-group {
          margin-bottom: 20px;
        }

        .panel-content {
          padding: 16px;
        }

        .panel-header {
          padding: 12px 16px;
        }
      }
    `
    document.head.appendChild(style)
  }

  dispose(): void {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel)
    }
    window.removeEventListener('resize', this.checkMobile.bind(this))
  }
}
