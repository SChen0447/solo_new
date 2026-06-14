import { useGraphStore } from './store';
import { KnowledgeGraphScene, PRESET_COLORS, generateHemispherePosition } from './scene';
import * as THREE from 'three';

let scene: KnowledgeGraphScene | null = null;
let selectedColorIndex = 0;
let unsubscribeNodeCount: (() => void) | null = null;

function init(): void {
  const container = document.getElementById('app');
  if (!container) return;

  scene = new KnowledgeGraphScene(container);

  setupColorPicker();
  setupModal();
  setupResetButton();
  setupStoreListeners();
}

function setupColorPicker(): void {
  const colorPicker = document.getElementById('colorPicker');
  if (!colorPicker) return;

  colorPicker.innerHTML = '';

  PRESET_COLORS.forEach((color, index) => {
    const option = document.createElement('div');
    option.className = `color-option ${index === selectedColorIndex ? 'selected' : ''}`;
    option.style.background = `linear-gradient(135deg, ${color}, ${shadeColor(color, -20)})`;
    option.addEventListener('click', () => {
      selectedColorIndex = index;
      document.querySelectorAll('.color-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
      });
    });
    colorPicker.appendChild(option);
  });
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function setupModal(): void {
  const modal = document.getElementById('addNodeModal');
  const confirmBtn = document.getElementById('confirmBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const nameInput = document.getElementById('nodeName') as HTMLInputElement;

  if (!modal || !confirmBtn || !cancelBtn || !nameInput) return;

  const openModal = () => {
    modal.classList.add('active');
    nameInput.value = '';
    selectedColorIndex = 0;
    document.querySelectorAll('.color-option').forEach((el, i) => {
      el.classList.toggle('selected', i === 0);
    });
    setTimeout(() => nameInput.focus(), 100);
  };

  const closeModal = () => {
    modal.classList.remove('active');
    useGraphStore.getState().setIsAddingNode(false);
  };

  const confirmAdd = () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    const state = useGraphStore.getState();
    const position = state.pendingNodePosition || generateHemispherePosition(
      state.nodes.length,
      state.nodes.length + 1
    );
    
    state.addNode(name, PRESET_COLORS[selectedColorIndex], position);
    closeModal();
  };

  confirmBtn.addEventListener('click', confirmAdd);
  cancelBtn.addEventListener('click', closeModal);

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAdd();
    if (e.key === 'Escape') closeModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  let lastIsAdding = false;
  setInterval(() => {
    const isAdding = useGraphStore.getState().isAddingNode;
    if (isAdding !== lastIsAdding) {
      lastIsAdding = isAdding;
      if (isAdding) {
        openModal();
      }
    }
  }, 50);
}

function setupResetButton(): void {
  const resetBtn = document.getElementById('resetBtn');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    useGraphStore.getState().resetView();
    if (scene) {
      const state = useGraphStore.getState();
      const tweenStartPos = new THREE.Vector3().copy(
        (scene as any).camera.position
      );
      const tweenStartTarget = new THREE.Vector3().copy(
        (scene as any).controls.target
      );
      
      (scene as any).tweenStartPos.copy(tweenStartPos);
      (scene as any).tweenStartTarget.copy(tweenStartTarget);
      (scene as any).tweenEndPos.copy(state.cameraState.position);
      (scene as any).tweenEndTarget.copy(state.cameraState.target);
      (scene as any).tweenDuration = 1;
      (scene as any).tweenTime = 0;
      (scene as any).tweening = true;
      (scene as any).controls.enabled = false;
    }
  });
}

function setupStoreListeners(): void {
  const nodeCountEl = document.getElementById('nodeCount');
  if (nodeCountEl) {
    const updateCount = () => {
      const count = useGraphStore.getState().nodes.length;
      nodeCountEl.textContent = String(count);
    };
    updateCount();
    
    let prevCount = 0;
    unsubscribeNodeCount = useGraphStore.subscribe((state) => {
      const count = state.nodes.length;
      if (count !== prevCount) {
        prevCount = count;
        updateCount();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { scene };
