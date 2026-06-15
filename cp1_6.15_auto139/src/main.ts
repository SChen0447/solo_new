import type { CelestialBody, FilterOption, SortOption } from './types';
import { parseImage } from './imageParser';
import { useCelestialStore, getStoreState } from './dataStore';
import { SceneManager, type SceneManagerCallbacks } from './sceneManager';

type DOMRefs = {
  fileInput: HTMLInputElement;
  uploadOverlay: HTMLDivElement;
  uploadArea: HTMLLabelElement;
  sceneContainer: HTMLElement;
  canvas: HTMLCanvasElement;
  filterSelect: HTMLSelectElement;
  sortSelect: HTMLSelectElement;
  mobileFilterSelect: HTMLSelectElement;
  mobileSortSelect: HTMLSelectElement;
  detailCard: HTMLElement;
  closeCardBtn: HTMLButtonElement;
  statTotal: HTMLElement;
  statVisible: HTMLElement;
  statSelected: HTMLElement;
  cardName: HTMLElement;
  cardBrightness: HTMLElement;
  brightnessFill: HTMLElement;
  colorDot: HTMLElement;
  colorHex: HTMLElement;
  cardSize: HTMLElement;
  cardX: HTMLElement;
  cardY: HTMLElement;
  cardPixel: HTMLElement;
  thumbnailContainer: HTMLElement;
};

function getDOMRefs(): DOMRefs {
  const $ = (sel: string) => document.querySelector(sel);

  const required: Record<string, Element | null> = {
    fileInput: $('#file-input'),
    uploadOverlay: $('#upload-overlay'),
    uploadArea: $('#upload-area'),
    sceneContainer: $('#scene-container'),
    canvas: $('#three-canvas'),
    filterSelect: $('#filter-select'),
    sortSelect: $('#sort-select'),
    mobileFilterSelect: $('#mobile-filter-select'),
    mobileSortSelect: $('#mobile-sort-select'),
    detailCard: $('#detail-card'),
    closeCardBtn: $('#close-card'),
    statTotal: $('#stat-total'),
    statVisible: $('#stat-visible'),
    statSelected: $('#stat-selected'),
    cardName: $('#card-name'),
    cardBrightness: $('#card-brightness'),
    brightnessFill: $('#brightness-fill'),
    colorDot: $('#color-dot'),
    colorHex: $('#color-hex'),
    cardSize: $('#card-size'),
    cardX: $('#card-x'),
    cardY: $('#card-y'),
    cardPixel: $('#card-pixel'),
    thumbnailContainer: $('#thumbnail-container')
  };

  for (const [key, el] of Object.entries(required)) {
    if (!el) {
      throw new Error(`Missing DOM element: ${key}`);
    }
  }

  return required as DOMRefs;
}

function showLoading(dom: DOMRefs): void {
  const existing = dom.sceneContainer.querySelector('.loading-overlay');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `<div class="spinner"></div><div class="loading-text">正在分析星空照片...</div>`;
  dom.sceneContainer.appendChild(overlay);
}

function hideLoading(dom: DOMRefs): void {
  const overlay = dom.sceneContainer.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

function setCardVisible(dom: DOMRefs, visible: boolean, body?: CelestialBody): void {
  if (visible && body) {
    dom.cardName.textContent = body.name;
    dom.cardBrightness.textContent = String(body.brightness);
    dom.brightnessFill.style.width = `${body.brightness}%`;
    (dom.colorDot as HTMLSpanElement).style.backgroundColor = body.color;
    dom.colorHex.textContent = body.color.toUpperCase();
    dom.cardSize.textContent = `${body.size.toFixed(2)} 单位`;
    dom.cardX.textContent = body.x.toFixed(2);
    dom.cardY.textContent = body.y.toFixed(2);
    dom.cardPixel.textContent = `(${body.pixelX}, ${body.pixelY})`;

    dom.thumbnailContainer.innerHTML = '';
    if (body.thumbnailDataUrl) {
      const img = document.createElement('img');
      img.src = body.thumbnailDataUrl;
      img.alt = body.name;
      dom.thumbnailContainer.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = 'thumbnail-placeholder';
      span.textContent = '无缩略图';
      dom.thumbnailContainer.appendChild(span);
    }

    dom.detailCard.classList.remove('hiding');
    dom.detailCard.classList.add('visible');
  } else {
    dom.detailCard.classList.remove('visible');
    dom.detailCard.classList.add('hiding');
    setTimeout(() => {
      dom.detailCard.classList.remove('hiding');
    }, 220);
  }
}

function updateStats(dom: DOMRefs): void {
  const state = getStoreState();
  dom.statTotal.textContent = String(state.bodies.length);
  dom.statVisible.textContent = String(state.visibleIds.size);
  if (state.selectedId) {
    const body = state.getBodyById(state.selectedId);
    dom.statSelected.textContent = body ? body.name : '未选中';
  } else {
    dom.statSelected.textContent = '未选中';
  }
}

function handleImageFile(dom: DOMRefs, sceneMgr: SceneManager, file: File): void {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    alert('请上传 JPEG 或 PNG 格式的图片');
    return;
  }

  showLoading(dom);

  parseImage(file)
    .then((data) => {
      const state = getStoreState();
      state.setBodies(data.bodies);
      sceneMgr.renderBodies(state.sortedBodies);

      if (dom.uploadOverlay && dom.uploadOverlay.parentNode) {
        dom.uploadOverlay.style.opacity = '0';
        dom.uploadOverlay.style.pointerEvents = 'none';
        dom.uploadOverlay.style.transition = 'opacity 0.4s ease-out';
        setTimeout(() => {
          dom.uploadOverlay.remove();
        }, 420);
      }

      updateStats(dom);
    })
    .catch((err: unknown) => {
      console.error('解析失败', err);
      const msg = err instanceof Error ? err.message : '未知错误';
      alert(`图片解析失败：${msg}`);
    })
    .finally(() => {
      hideLoading(dom);
    });
}

function setupUploadHandlers(dom: DOMRefs, sceneMgr: SceneManager): () => void {
  const onFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleImageFile(dom, sceneMgr, file);
    input.value = '';
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    dom.uploadArea.classList.add('dragging');
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if ((e.currentTarget as HTMLElement)?.contains(e.relatedTarget as Node)) return;
    dom.uploadArea.classList.remove('dragging');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dom.uploadArea.classList.remove('dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(dom, sceneMgr, file);
  };

  const onWindowDragOver = (e: DragEvent) => {
    if (document.getElementById('upload-overlay')) {
      e.preventDefault();
    }
  };

  const onWindowDrop = (e: DragEvent) => {
    const overlay = document.getElementById('upload-overlay');
    if (overlay) {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageFile(dom, sceneMgr, file);
    }
  };

  dom.fileInput.addEventListener('change', onFileChange);
  dom.uploadArea.addEventListener('dragover', onDragOver);
  dom.uploadArea.addEventListener('dragleave', onDragLeave);
  dom.uploadArea.addEventListener('drop', onDrop);
  window.addEventListener('dragover', onWindowDragOver);
  window.addEventListener('drop', onWindowDrop);

  return () => {
    dom.fileInput.removeEventListener('change', onFileChange);
    dom.uploadArea.removeEventListener('dragover', onDragOver);
    dom.uploadArea.removeEventListener('dragleave', onDragLeave);
    dom.uploadArea.removeEventListener('drop', onDrop);
    window.removeEventListener('dragover', onWindowDragOver);
    window.removeEventListener('drop', onWindowDrop);
  };
}

function setupFilterSortHandlers(
  dom: DOMRefs,
  sceneMgr: SceneManager
): () => void {
  const onFilter = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value as FilterOption;
    dom.filterSelect.value = val;
    dom.mobileFilterSelect.value = val;
    getStoreState().setFilter(val);
    sceneMgr.updateVisibility();
    updateStats(dom);
  };

  const onSort = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value as SortOption;
    dom.sortSelect.value = val;
    dom.mobileSortSelect.value = val;
    getStoreState().setSort(val);
    updateStats(dom);
  };

  dom.filterSelect.addEventListener('change', onFilter);
  dom.sortSelect.addEventListener('change', onSort);
  dom.mobileFilterSelect.addEventListener('change', onFilter);
  dom.mobileSortSelect.addEventListener('change', onSort);

  return () => {
    dom.filterSelect.removeEventListener('change', onFilter);
    dom.sortSelect.removeEventListener('change', onSort);
    dom.mobileFilterSelect.removeEventListener('change', onFilter);
    dom.mobileSortSelect.removeEventListener('change', onSort);
  };
}

function setupCardHandlers(dom: DOMRefs, sceneMgr: SceneManager): () => void {
  const closeCard = () => {
    getStoreState().selectBody(null);
    setCardVisible(dom, false);
    updateStats(dom);
  };

  const onCloseBtn = () => closeCard();

  const onSceneClick = (e: MouseEvent) => {
    const state = getStoreState();
    if (!state.selectedId) return;
    if (dom.detailCard.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    if ((e.target as HTMLElement).closest('#mobile-toolbar')) return;
    if ((e.target as HTMLElement).closest('#upload-overlay')) return;
    if ((e.target as HTMLElement).closest('.view-hint')) return;
    closeCard();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeCard();
    }
  };

  dom.closeCardBtn.addEventListener('click', onCloseBtn);
  document.addEventListener('mousedown', onSceneClick);
  window.addEventListener('keydown', onKeyDown);

  const unsubStore = useCelestialStore.subscribe(
    (s) => s.selectedId,
    (selectedId) => {
      const id = selectedId as string | null;
      if (id) {
        const body = getStoreState().getBodyById(id);
        if (body) setCardVisible(dom, true, body);
      } else {
        setCardVisible(dom, false);
      }
      updateStats(dom);
      void sceneMgr;
    }
  );

  return () => {
    dom.closeCardBtn.removeEventListener('click', onCloseBtn);
    document.removeEventListener('mousedown', onSceneClick);
    window.removeEventListener('keydown', onKeyDown);
    unsubStore();
  };
}

function initApp(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

let disposers: Array<() => void> = [];
let sceneManager: SceneManager | null = null;

function start(): void {
  try {
    const dom = getDOMRefs();

    const callbacks: SceneManagerCallbacks = {
      onBodyClick: (bodyId) => {
        getStoreState().selectBody(bodyId);
        updateStats(dom);
      },
      onBodyHover: (_bodyId) => {
        // hover状态由sceneManager内部通过store管理
      },
      onBodyDoubleClick: (_bodyId) => {
        // 双击聚焦由sceneManager内部实现
      }
    };

    sceneManager = new SceneManager(dom.sceneContainer, dom.canvas, callbacks);

    disposers.push(
      setupUploadHandlers(dom, sceneManager),
      setupFilterSortHandlers(dom, sceneManager),
      setupCardHandlers(dom, sceneManager)
    );

    updateStats(dom);
  } catch (e) {
    console.error('应用初始化失败', e);
    const msg = e instanceof Error ? e.message : String(e);
    document.body.innerHTML = `<div style="padding:32px;color:#fff;background:#0a0a1a;font-family:system-ui">
      <h2 style="color:#e94560">应用初始化失败</h2>
      <pre style="margin-top:16px;color:#ccc;white-space:pre-wrap">${msg}</pre>
    </div>`;
  }
}

window.addEventListener('beforeunload', () => {
  for (const d of disposers) {
    try { d(); } catch (_) { /* ignore */ }
  }
  disposers = [];
  if (sceneManager) {
    try { sceneManager.dispose(); } catch (_) { /* ignore */ }
    sceneManager = null;
  }
});

initApp();
