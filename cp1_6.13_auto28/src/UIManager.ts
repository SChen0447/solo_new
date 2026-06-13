import { Particle, PARTICLE_CONFIG, CameraState, UIControls } from './types'

interface UIManagerCallbacks {
  onParticleSelect: (particleId: number | null) => void
  onCameraRotate: (deltaX: number, deltaY: number) => void
  onCameraZoom: (delta: number) => void
  onResetCamera: () => void
  onTogglePause: () => void
  onResetScene: () => void
  onEnergyThresholdChange: (value: number) => void
  onDecayIntervalChange: (value: number) => void
  getRaycastTarget: (clientX: number, clientY: number) => number | null
}

export class UIManager {
  private container: HTMLElement
  private callbacks: UIManagerCallbacks
  private isDragging: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0
  private leftPanel!: HTMLElement
  private rightPanel!: HTMLElement
  private particleInfoEl!: HTMLElement
  private energySlider!: HTMLInputElement
  private decaySlider!: HTMLInputElement
  private resetBtn!: HTMLButtonElement
  private pauseBtn!: HTMLButtonElement
  private energyValueEl!: HTMLElement
  private decayValueEl!: HTMLElement
  private particleCountEl!: HTMLElement
  private fpsEl!: HTMLElement

  constructor(container: HTMLElement, callbacks: UIManagerCallbacks) {
    this.container = container
    this.callbacks = callbacks
    this.createUI()
    this.bindEvents()
  }

  private createUI(): void {
    this.createLeftPanel()
    this.createRightPanel()
    this.createStatsDisplay()
  }

  private createLeftPanel(): void {
    this.leftPanel = document.createElement('div')
    this.leftPanel.className = 'control-panel left-panel'
    this.leftPanel.innerHTML = `
      <h2 class="panel-title">控制面板</h2>
      <div class="control-group">
        <label class="control-label">
          能量阈值
          <span class="control-value" id="energy-value">0.5</span>
        </label>
        <input type="range" id="energy-slider" min="0.2" max="2.0" step="0.1" value="0.5" class="slider energy-slider" />
        <div class="slider-labels">
          <span>0.2</span>
          <span>2.0</span>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label">
          衰变速率 (秒)
          <span class="control-value" id="decay-value">2</span>
        </label>
        <input type="range" id="decay-slider" min="1" max="5" step="0.5" value="2" class="slider decay-slider" />
        <div class="slider-labels">
          <span>1</span>
          <span>5</span>
        </div>
      </div>
      <div class="control-group button-group">
        <button id="reset-btn" class="btn btn-primary">重置场景</button>
        <button id="pause-btn" class="btn btn-secondary">暂停</button>
      </div>
      <div class="control-group legend">
        <h3 class="legend-title">粒子类型</h3>
        <div class="legend-item">
          <span class="legend-dot" style="background: #3b82f6;"></span>
          <span>μ子 (Muon)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #a855f7;"></span>
          <span>K介子 (Kaon)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #ef4444;"></span>
          <span>π介子 (Pion)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #22c55e;"></span>
          <span>电子 (Electron)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #fbbf24;"></span>
          <span>光子 (Photon)</span>
        </div>
      </div>
      <div class="control-group shortcuts">
        <h3 class="legend-title">快捷键</h3>
        <div class="shortcut-item"><kbd>R</kbd> 重置视角</div>
        <div class="shortcut-item"><kbd>Space</kbd> 暂停/继续</div>
        <div class="shortcut-item"><kbd>鼠标拖拽</kbd> 旋转视角</div>
        <div class="shortcut-item"><kbd>滚轮</kbd> 缩放视角</div>
        <div class="shortcut-item"><kbd>点击粒子</kbd> 查看详情</div>
      </div>
    `
    this.container.appendChild(this.leftPanel)

    this.energySlider = this.leftPanel.querySelector('#energy-slider')!
    this.decaySlider = this.leftPanel.querySelector('#decay-slider')!
    this.resetBtn = this.leftPanel.querySelector('#reset-btn')!
    this.pauseBtn = this.leftPanel.querySelector('#pause-btn')!
    this.energyValueEl = this.leftPanel.querySelector('#energy-value')!
    this.decayValueEl = this.leftPanel.querySelector('#decay-value')!
  }

  private createRightPanel(): void {
    this.rightPanel = document.createElement('div')
    this.rightPanel.className = 'info-panel right-panel'
    this.rightPanel.innerHTML = `
      <h2 class="panel-title">粒子信息</h2>
      <div id="particle-info" class="particle-info">
        <div class="empty-state">
          <div class="empty-icon">⚛</div>
          <p>点击粒子查看详情</p>
        </div>
      </div>
    `
    this.container.appendChild(this.rightPanel)
    this.particleInfoEl = this.rightPanel.querySelector('#particle-info')!
  }

  private createStatsDisplay(): void {
    const stats = document.createElement('div')
    stats.className = 'stats-display'
    stats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">粒子数:</span>
        <span class="stat-value" id="particle-count">300</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">FPS:</span>
        <span class="stat-value" id="fps-display">60</span>
      </div>
    `
    this.container.appendChild(stats)
    this.particleCountEl = stats.querySelector('#particle-count')!
    this.fpsEl = stats.querySelector('#fps-display')!
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.container.addEventListener('mouseleave', this.onMouseUp.bind(this))
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    this.container.addEventListener('click', this.onClick.bind(this))

    this.energySlider.addEventListener('input', this.onEnergySliderChange.bind(this))
    this.decaySlider.addEventListener('input', this.onDecaySliderChange.bind(this))
    this.resetBtn.addEventListener('click', this.onReset.bind(this))
    this.pauseBtn.addEventListener('click', this.onPauseToggle.bind(this))

    document.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isUIElement(e.target as HTMLElement)) return
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return
    
    const deltaX = e.clientX - this.lastMouseX
    const deltaY = e.clientY - this.lastMouseY
    
    this.callbacks.onCameraRotate(deltaX, deltaY)
    
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private onMouseUp(): void {
    this.isDragging = false
  }

  private onWheel(e: WheelEvent): void {
    if (this.isUIElement(e.target as HTMLElement)) return
    e.preventDefault()
    this.callbacks.onCameraZoom(e.deltaY)
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging || this.isUIElement(e.target as HTMLElement)) return
    
    const particleId = this.callbacks.getRaycastTarget(e.clientX, e.clientY)
    if (particleId !== null) {
      this.callbacks.onParticleSelect(particleId)
    } else {
      this.callbacks.onParticleSelect(null)
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return
    
    switch (e.code) {
      case 'KeyR':
        e.preventDefault()
        this.callbacks.onResetCamera()
        break
      case 'Space':
        e.preventDefault()
        this.onPauseToggle()
        break
    }
  }

  private onEnergySliderChange(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value)
    this.energyValueEl.textContent = value.toFixed(1)
    this.callbacks.onEnergyThresholdChange(value)
  }

  private onDecaySliderChange(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value)
    this.decayValueEl.textContent = value.toFixed(1)
    this.callbacks.onDecayIntervalChange(value)
  }

  private onReset(): void {
    this.callbacks.onResetScene()
  }

  private onPauseToggle(): void {
    this.callbacks.onTogglePause()
  }

  private isUIElement(element: HTMLElement): boolean {
    return element.closest('.control-panel') !== null ||
           element.closest('.info-panel') !== null ||
           element.closest('.stats-display') !== null
  }

  updateParticleInfo(particle: Particle | null): void {
    if (!particle) {
      this.particleInfoEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚛</div>
          <p>点击粒子查看详情</p>
        </div>
      `
      return
    }

    const config = PARTICLE_CONFIG[particle.type]
    const colorHex = '#' + config.color.toString(16).padStart(6, '0')
    
    this.particleInfoEl.innerHTML = `
      <div class="particle-detail">
        <div class="particle-header">
          <div class="particle-indicator" style="background: ${colorHex}; box-shadow: 0 0 20px ${colorHex};"></div>
          <div class="particle-type-info">
            <div class="particle-name">${config.nameCN}</div>
            <div class="particle-subname">${config.name}</div>
          </div>
        </div>
        <div class="particle-stats">
          <div class="stat-row">
            <span class="stat-label">粒子ID</span>
            <span class="stat-val">#${particle.id}</span>
          </div>
          <div class="stat-row highlighted">
            <span class="stat-label">当前能量</span>
            <span class="stat-val energy-val">${particle.energy.toFixed(2)} MeV</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">衰变计数</span>
            <span class="stat-val">${particle.decayCount}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">粒子大小</span>
            <span class="stat-val">${particle.size.toFixed(2)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">存在时间</span>
            <span class="stat-val">${particle.age.toFixed(1)}s</span>
          </div>
        </div>
        <div class="decay-status">
          <div class="status-title">衰变状态</div>
          <div class="status-indicator ${particle.isSelected ? 'active' : ''}">
            ${particle.isSelected ? '正在衰变中...' : '等待触发'}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(100, (particle.energy / 10) * 100)}%; background: ${colorHex};"></div>
          </div>
          <div class="progress-label">
            能量: ${(particle.energy / 10 * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    `
  }

  updateStats(particleCount: number, fps: number): void {
    this.particleCountEl.textContent = particleCount.toString()
    this.fpsEl.textContent = fps.toFixed(0)
  }

  updatePauseState(isPaused: boolean): void {
    this.pauseBtn.textContent = isPaused ? '继续' : '暂停'
    this.pauseBtn.classList.toggle('paused', isPaused)
  }

  updateControls(controls: UIControls): void {
    this.energySlider.value = controls.energyThreshold.toString()
    this.decaySlider.value = controls.decayInterval.toString()
    this.energyValueEl.textContent = controls.energyThreshold.toFixed(1)
    this.decayValueEl.textContent = controls.decayInterval.toFixed(1)
    this.updatePauseState(controls.isPaused)
  }

  dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this))
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.container.removeEventListener('mouseup', this.onMouseUp.bind(this))
    this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this))
    this.container.removeEventListener('wheel', this.onWheel.bind(this))
    this.container.removeEventListener('click', this.onClick.bind(this))
    document.removeEventListener('keydown', this.onKeyDown.bind(this))
    
    this.leftPanel.remove()
    this.rightPanel.remove()
  }
}
