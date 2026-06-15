import { FurnitureItem, RecognitionResult, FurnitureTypeLabels, FurnitureTypeColors, FurnitureDimensions } from './types';
import { eventBus, Events } from './eventBus';

class UIManager {
  private appContainer: HTMLElement | null = null;
  private statusBar: HTMLElement | null = null;
  private leftPanel: HTMLElement | null = null;
  private sceneContainer: HTMLElement | null = null;
  private uploadArea: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private recognitionList: HTMLElement | null = null;
  private progressContainer: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private furnitureCountEl: HTMLElement | null = null;
  private sceneNameEl: HTMLElement | null = null;
  private sceneName: string = '未命名场景';
  private recognitionResults: RecognitionResult[] = [];
  private sceneFurniture: FurnitureItem[] = [];

  init(appContainer: HTMLElement): void {
    this.appContainer = appContainer;
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    if (!this.appContainer) return;

    this.appContainer.innerHTML = `
      <style>
        .status-bar {
          height: 48px;
          background: #FFFFFF;
          border-bottom: 1px solid #E5E5E5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
          z-index: 10;
        }
        .status-info {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .scene-name {
          font-size: 14px;
          color: #333;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .scene-name:hover {
          background: #F5F5F5;
        }
        .scene-name-input {
          font-size: 14px;
          padding: 4px 8px;
          border: 1px solid #D0D0D0;
          border-radius: 4px;
          outline: none;
          width: 180px;
        }
        .furniture-count {
          font-size: 13px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .furniture-count .icon {
          width: 16px;
          height: 16px;
          opacity: 0.7;
        }
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn {
          padding: 7px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn-primary {
          background: #4A90D9;
          color: white;
        }
        .btn-primary:hover {
          background: #3A7BC8;
        }
        .btn-secondary {
          background: #F0F0F0;
          color: #555;
        }
        .btn-secondary:hover {
          background: #E4E4E4;
        }
        .btn-danger {
          background: #FFE5E5;
          color: #D44;
        }
        .btn-danger:hover {
          background: #FFD0D0;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .main-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .left-panel {
          width: 280px;
          background: #F5F5F5;
          border-right: 1px solid #E5E5E5;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }
        .upload-section {
          padding: 16px;
          border-bottom: 1px solid #E0E0E0;
        }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .upload-area {
          border: 2px dashed #C0C0C0;
          border-radius: 10px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #FFFFFF;
        }
        .upload-area:hover {
          border-color: #4A90D9;
          background: #F8FAFF;
        }
        .upload-area.dragover {
          border-color: #4A90D9;
          background: #F0F7FF;
          transform: scale(1.01);
        }
        .upload-icon {
          width: 40px;
          height: 40px;
          margin: 0 auto 10px;
          opacity: 0.5;
        }
        .upload-text {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }
        .upload-hint {
          font-size: 11px;
          color: #999;
        }
        .progress-container {
          display: none;
          margin-top: 12px;
        }
        .progress-container.active {
          display: block;
        }
        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .progress-label {
          font-size: 12px;
          color: #555;
        }
        .progress-percent {
          font-size: 12px;
          color: #4A90D9;
          font-weight: 500;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: #E8E8E8;
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4A90D9, #6BA3E8);
          border-radius: 3px;
          transition: width 0.1s linear;
          width: 0%;
        }
        .thumbnail-container {
          display: none;
          margin-top: 12px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #E0E0E0;
          background: #FFF;
        }
        .thumbnail-container.active {
          display: block;
        }
        .thumbnail {
          width: 100%;
          height: 100px;
          object-fit: cover;
          display: block;
        }
        .recognition-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .recognition-list::-webkit-scrollbar {
          width: 6px;
        }
        .recognition-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .recognition-list::-webkit-scrollbar-thumb {
          background: #CCC;
          border-radius: 3px;
        }
        .empty-state {
          text-align: center;
          padding: 40px 16px;
          color: #AAA;
        }
        .empty-state-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          opacity: 0.4;
        }
        .empty-state-text {
          font-size: 12px;
          line-height: 1.6;
        }
        .furniture-card {
          background: #FFFFFF;
          border-radius: 10px;
          margin-bottom: 10px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .furniture-card:hover {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }
        .furniture-card.selected {
          border-color: #4A90D9;
          box-shadow: 0 2px 12px rgba(74, 144, 217, 0.15);
        }
        .furniture-card-header {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          gap: 10px;
        }
        .furniture-thumb {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .furniture-info {
          flex: 1;
          min-width: 0;
        }
        .furniture-tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
          margin-bottom: 4px;
        }
        .confidence {
          font-size: 13px;
          color: #22A05B;
          font-weight: 600;
        }
        .furniture-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #FAFAFA;
          border-top: 1px solid #F0F0F0;
          font-size: 11px;
          color: #888;
        }
        .furniture-dims {
          display: flex;
          gap: 6px;
        }
        .dim-chip {
          background: #F0F0F0;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .delete-btn {
          background: none;
          border: none;
          color: #AAA;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
        }
        .delete-btn:hover {
          background: #FFE5E5;
          color: #D44;
        }
        .delete-btn svg {
          width: 14px;
          height: 14px;
        }
        .scene-container {
          flex: 1;
          position: relative;
          background: #EAEAEA;
          overflow: hidden;
        }
        .scene-container canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .checkmark-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.5);
          width: 80px;
          height: 80px;
          background: rgba(34, 160, 91, 0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          z-index: 1000;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .checkmark-overlay.show {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .checkmark-overlay svg {
          width: 40px;
          height: 40px;
          color: white;
        }
        .error-toast {
          position: fixed;
          top: 60px;
          right: 20px;
          background: #FF5555;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 13px;
          box-shadow: 0 4px 16px rgba(255, 85, 85, 0.3);
          z-index: 1000;
          opacity: 0;
          transform: translateX(20px);
          transition: all 0.3s ease;
          pointer-events: none;
        }
        .error-toast.show {
          opacity: 1;
          transform: translateX(0);
        }
        .help-hint {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.8;
          pointer-events: none;
          backdrop-filter: blur(4px);
        }
        .help-hint div {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .help-key {
          background: rgba(255, 255, 255, 0.2);
          padding: 1px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 10px;
        }
      </style>

      <div class="status-bar">
        <div class="status-info">
          <div class="scene-name" id="sceneName">${this.sceneName} ✎</div>
          <div class="furniture-count">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>家具数量: <strong id="furnitureCount">0</strong></span>
          </div>
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary" id="clearBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
            </svg>
            清空场景
          </button>
          <button class="btn btn-primary" id="exportBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出PNG
          </button>
        </div>
      </div>

      <div class="main-container">
        <div class="left-panel">
          <div class="upload-section">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              家具图片识别
            </div>
            <div class="upload-area" id="uploadArea">
              <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="upload-text">点击或拖拽上传图片</div>
              <div class="upload-hint">支持 JPG / PNG / WEBP，最大 5MB</div>
            </div>
            <input type="file" id="fileInput" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp" style="display: none;">
            <div class="thumbnail-container" id="thumbnailContainer">
              <img class="thumbnail" id="thumbnail" alt="预览">
            </div>
            <div class="progress-container" id="progressContainer">
              <div class="progress-info">
                <span class="progress-label">AI 正在识别中...</span>
                <span class="progress-percent" id="progressPercent">0%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar"></div>
              </div>
            </div>
          </div>

          <div class="section-title" style="padding: 12px 16px 0; margin: 0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7h-3V3H7v4H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
            </svg>
            识别结果 / 场景家具
          </div>
          <div class="recognition-list" id="recognitionList">
            <div class="empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M12 8v8"></path>
                <path d="M8 12h8"></path>
              </svg>
              <div class="empty-state-text">
                还没有识别记录<br>上传一张家具图片开始吧
              </div>
            </div>
          </div>
        </div>

        <div class="scene-container" id="sceneContainer">
          <div class="help-hint">
            <div><span class="help-key">左键拖拽</span> 移动家具</div>
            <div><span class="help-key">滚轮</span> 旋转选中家具</div>
            <div><span class="help-key">右键拖拽</span> 旋转视角</div>
            <div><span class="help-key">Ctrl+滚轮</span> 缩放场景</div>
          </div>
        </div>
      </div>

      <div class="checkmark-overlay" id="checkmarkOverlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>

      <div class="error-toast" id="errorToast"></div>
    `;

    this.statusBar = this.appContainer.querySelector('.status-bar');
    this.leftPanel = this.appContainer.querySelector('.left-panel');
    this.sceneContainer = this.appContainer.querySelector('#sceneContainer');
    this.uploadArea = this.appContainer.querySelector('#uploadArea');
    this.fileInput = this.appContainer.querySelector('#fileInput');
    this.recognitionList = this.appContainer.querySelector('#recognitionList');
    this.progressContainer = this.appContainer.querySelector('#progressContainer');
    this.progressBar = this.appContainer.querySelector('#progressBar');
    this.furnitureCountEl = this.appContainer.querySelector('#furnitureCount');
    this.sceneNameEl = this.appContainer.querySelector('#sceneName');
  }

  private setupEventListeners(): void {
    if (this.uploadArea && this.fileInput) {
      this.uploadArea.addEventListener('click', () => this.fileInput?.click());
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

      this.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.uploadArea?.classList.add('dragover');
      });
      this.uploadArea.addEventListener('dragleave', () => {
        this.uploadArea?.classList.remove('dragover');
      });
      this.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.uploadArea?.classList.remove('dragover');
        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files.length > 0) {
          this.processFile(files[0]);
        }
      });
    }

    this.sceneNameEl?.addEventListener('click', () => this.renameScene());

    const clearBtn = this.appContainer?.querySelector('#clearBtn');
    clearBtn?.addEventListener('click', () => {
      if (this.sceneFurniture.length === 0) {
        this.showError('场景已经是空的了');
        return;
      }
      if (confirm('确定要清空场景中的所有家具吗？')) {
        eventBus.emit(Events.SCENE_CLEAR);
      }
    });

    const exportBtn = this.appContainer?.querySelector('#exportBtn');
    exportBtn?.addEventListener('click', () => {
      eventBus.emit(Events.SCENE_EXPORT);
    });

    eventBus.on(Events.RECOGNITION_START, this.onRecognitionStart.bind(this));
    eventBus.on(Events.RECOGNITION_PROGRESS, this.onRecognitionProgress.bind(this));
    eventBus.on(Events.RECOGNITION_COMPLETE, this.onRecognitionComplete.bind(this));
    eventBus.on(Events.RECOGNITION_ERROR, this.onRecognitionError.bind(this));
    eventBus.on(Events.FURNITURE_LIST_UPDATE, this.onFurnitureListUpdate.bind(this));
    eventBus.on(Events.FURNITURE_HIGHLIGHT, this.onFurnitureHighlight.bind(this));
  }

  getSceneContainer(): HTMLElement | null {
    return this.sceneContainer;
  }

  private handleFileSelect(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processFile(target.files[0]);
      target.value = '';
    }
  }

  private processFile(file: File): void {
    eventBus.emit(Events.IMAGE_UPLOAD, file);

    const thumbnail = this.appContainer?.querySelector('#thumbnail') as HTMLImageElement | null;
    const thumbnailContainer = this.appContainer?.querySelector('#thumbnailContainer');
    if (thumbnail && thumbnailContainer) {
      const url = URL.createObjectURL(file);
      thumbnail.src = url;
      thumbnailContainer.classList.add('active');
    }
  }

  private onRecognitionStart(): void {
    this.progressContainer?.classList.add('active');
    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }
    const percentEl = this.appContainer?.querySelector('#progressPercent');
    if (percentEl) {
      percentEl.textContent = '0%';
    }
  }

  private onRecognitionProgress(progress: number): void {
    if (this.progressBar) {
      this.progressBar.style.width = `${progress}%`;
    }
    const percentEl = this.appContainer?.querySelector('#progressPercent');
    if (percentEl) {
      percentEl.textContent = `${Math.round(progress)}%`;
    }
  }

  private onRecognitionComplete(result: RecognitionResult): void {
    this.recognitionResults.unshift(result);
    this.progressContainer?.classList.remove('active');
    this.showCheckmark();
    this.renderRecognitionList();
  }

  private onRecognitionError(error: string): void {
    this.progressContainer?.classList.remove('active');
    this.showError(error);
  }

  private onFurnitureListUpdate(items: FurnitureItem[]): void {
    this.sceneFurniture = items;
    if (this.furnitureCountEl) {
      this.furnitureCountEl.textContent = String(items.length);
    }
    this.renderRecognitionList();
  }

  private onFurnitureHighlight(id: string | null): void {
    this.renderRecognitionList(id || undefined);
  }

  private renderRecognitionList(selectedId?: string): void {
    if (!this.recognitionList) return;

    if (this.sceneFurniture.length === 0 && this.recognitionResults.length === 0) {
      this.recognitionList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M12 8v8"></path>
            <path d="M8 12h8"></path>
          </svg>
          <div class="empty-state-text">
            还没有识别记录<br>上传一张家具图片开始吧
          </div>
        </div>
      `;
      return;
    }

    let html = '';

    if (this.sceneFurniture.length > 0) {
      html += `<div style="font-size:11px;color:#999;margin-bottom:8px;padding:0 4px;">场景中的家具 (${this.sceneFurniture.length})</div>`;
      this.sceneFurniture.forEach((item) => {
        const typeLabel = FurnitureTypeLabels[item.type];
        const typeColor = FurnitureTypeColors[item.type];
        const dims = FurnitureDimensions[item.type];
        const isSelected = selectedId === item.id;
        html += `
          <div class="furniture-card ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-type="scene">
            <div class="furniture-card-header">
              <div class="furniture-info">
                <span class="furniture-tag" style="background:${typeColor}">${typeLabel}</span>
                <div class="confidence">${item.confidence}% 匹配</div>
              </div>
            </div>
            <div class="furniture-card-footer">
              <div class="furniture-dims">
                <span class="dim-chip">${dims.width}m</span>
                <span class="dim-chip">${dims.depth}m</span>
                <span class="dim-chip">${dims.height}m</span>
              </div>
              <button class="delete-btn" data-delete-id="${item.id}" title="从场景删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        `;
      });
    }

    if (this.recognitionResults.length > 0) {
      html += `<div style="font-size:11px;color:#999;margin:16px 0 8px;padding:0 4px;">识别历史 (点击添加到场景)</div>`;
      this.recognitionResults.forEach((result) => {
        const inScene = this.sceneFurniture.some((f) => f.id === result.id);
        if (inScene) return;
        const typeLabel = FurnitureTypeLabels[result.type];
        const typeColor = FurnitureTypeColors[result.type];
        const dims = FurnitureDimensions[result.type];
        html += `
          <div class="furniture-card" data-id="${result.id}" data-type="history">
            <div class="furniture-card-header">
              <img class="furniture-thumb" src="${result.imageUrl}" alt="${typeLabel}">
              <div class="furniture-info">
                <span class="furniture-tag" style="background:${typeColor}">${typeLabel}</span>
                <div class="confidence">${result.confidence}% 匹配</div>
              </div>
            </div>
            <div class="furniture-card-footer">
              <div class="furniture-dims">
                <span class="dim-chip">${dims.width}m</span>
                <span class="dim-chip">${dims.depth}m</span>
                <span class="dim-chip">${dims.height}m</span>
              </div>
              <button class="delete-btn" data-delete-history-id="${result.id}" title="删除记录">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        `;
      });
    }

    this.recognitionList.innerHTML = html;

    this.recognitionList.querySelectorAll('.furniture-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const deleteBtn = (e.target as HTMLElement).closest('[data-delete-id], [data-delete-history-id]');
        if (deleteBtn) {
          e.stopPropagation();
          const deleteId = deleteBtn.getAttribute('data-delete-id');
          const deleteHistoryId = deleteBtn.getAttribute('data-delete-history-id');
          if (deleteId) {
            eventBus.emit(Events.FURNITURE_REMOVE, deleteId);
          }
          if (deleteHistoryId) {
            this.recognitionResults = this.recognitionResults.filter((r) => r.id !== deleteHistoryId);
            this.renderRecognitionList(selectedId);
          }
          return;
        }

        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type');
        if (type === 'scene' && id) {
          eventBus.emit(Events.FURNITURE_HIGHLIGHT, id);
        } else if (type === 'history' && id) {
          const result = this.recognitionResults.find((r) => r.id === id);
          if (result) {
            const item: FurnitureItem = {
              id: result.id,
              type: result.type,
              position: { x: 0, y: 0, z: 0 },
              rotation: 0,
              confidence: result.confidence,
            };
            eventBus.emit(Events.FURNITURE_ADD, item);
          }
        }
      });
    });
  }

  private showCheckmark(): void {
    const overlay = this.appContainer?.querySelector('#checkmarkOverlay') as HTMLElement | null;
    if (overlay) {
      overlay.classList.add('show');
      setTimeout(() => {
        overlay.classList.remove('show');
      }, 800);
    }
  }

  private showError(message: string): void {
    const toast = this.appContainer?.querySelector('#errorToast') as HTMLElement | null;
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  private renameScene(): void {
    if (!this.sceneNameEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.sceneName;
    input.className = 'scene-name-input';
    input.maxLength = 20;

    const parent = this.sceneNameEl.parentElement;
    if (!parent) return;

    parent.insertBefore(input, this.sceneNameEl);
    this.sceneNameEl.style.display = 'none';
    input.focus();
    input.select();

    const finish = (save: boolean) => {
      if (save && input.value.trim()) {
        this.sceneName = input.value.trim();
      }
      if (this.sceneNameEl) {
        this.sceneNameEl.textContent = `${this.sceneName} ✎`;
        this.sceneNameEl.style.display = '';
      }
      input.remove();
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
  }
}

export const uiManager = new UIManager();
