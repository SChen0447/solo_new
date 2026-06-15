import { createDefaultState, AppState, render, GRID } from './renderer';
import { setupEditor, serializeLevel, deserializeLevel } from './levelEditor';
import { setupInput, initPlayer, updateSimulation, updateEditorEnemies } from './playerSimulator';

const TOOL_NAMES: Record<string, string> = {
  ground: '地面',
  brick: '砖墙',
  spike: '尖刺',
  coin: '金币',
  spring: '弹簧',
  slime: '史莱姆',
  bat: '飞行蝙蝠',
  eraser: '橡皮擦',
};

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const state: AppState = createDefaultState();

let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

function resizeCanvas(): void {
  const wrap = document.getElementById('canvasWrap')!;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const ratio = 16 / 9;
  let cw = w;
  let ch = w / ratio;
  if (ch > h) {
    ch = h;
    cw = h * ratio;
  }
  canvas.width = cw;
  canvas.height = ch;
  state.canvasW = cw;
  state.canvasH = ch;
}

function setupToolbar(): void {
  const btns = document.querySelectorAll('.tool-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = (btn as HTMLElement).dataset.tool;
      if (!tool) return;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTool = tool;
      document.getElementById('toolName')!.textContent = TOOL_NAMES[tool] || tool;
    });
  });
}

function setupTestButton(): void {
  const btn = document.getElementById('testBtn')!;
  btn.addEventListener('click', () => {
    if (state.mode === 'edit') {
      state.mode = 'test';
      initPlayer(state);
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>暂停测试</span>`;
    } else {
      state.mode = 'edit';
      state.player = null;
      state.camera.x = 0;
      state.camera.y = 0;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg><span>开始测试</span>`;
    }
  });
}

function setupPhysicsPanel(): void {
  const toggle = document.getElementById('physicsToggle')!;
  const content = document.getElementById('physicsContent')!;

  toggle.addEventListener('click', () => {
    const expanded = content.classList.toggle('expanded');
    toggle.classList.toggle('expanded', expanded);
  });

  const params: Array<{ id: string; key: keyof AppState['physics']; display: string; transform?: (v: number) => number }> = [
    { id: 'paramGravity', key: 'gravity', display: 'valGravity' },
    { id: 'paramJump', key: 'jumpForce', display: 'valJump' },
    { id: 'paramSpeed', key: 'moveSpeed', display: 'valSpeed' },
    { id: 'paramAirRes', key: 'airResistance', display: 'valAirRes', transform: (v) => v / 1000 },
    { id: 'paramJumps', key: 'maxJumps', display: 'valJumps' },
  ];

  for (const p of params) {
    const slider = document.getElementById(p.id) as HTMLInputElement;
    const display = document.getElementById(p.display)!;
    slider.addEventListener('input', () => {
      const raw = parseFloat(slider.value);
      const val = p.transform ? p.transform(raw) : raw;
      (state.physics as any)[p.key] = val;
      display.textContent = val.toFixed(p.key === 'airResistance' ? 3 : 0);
    });
  }
}

function setupSaveLoad(): void {
  const saveBtn = document.getElementById('saveBtn')!;
  const loadBtn = document.getElementById('loadBtn')!;
  const overlay = document.getElementById('modalOverlay')!;
  const modalTitle = document.getElementById('modalTitle')!;
  const textarea = document.getElementById('modalTextarea') as HTMLTextAreaElement;
  const confirmBtn = document.getElementById('modalConfirm')!;
  const cancelBtn = document.getElementById('modalCancel')!;

  let mode: 'save' | 'load' = 'save';

  saveBtn.addEventListener('click', () => {
    mode = 'save';
    modalTitle.textContent = '保存关卡';
    textarea.value = serializeLevel(state);
    textarea.readOnly = true;
    confirmBtn.textContent = '复制';
    overlay.classList.add('show');
  });

  loadBtn.addEventListener('click', () => {
    mode = 'load';
    modalTitle.textContent = '加载关卡';
    textarea.value = '';
    textarea.readOnly = false;
    textarea.placeholder = '在此粘贴关卡 JSON 数据...';
    confirmBtn.textContent = '加载';
    overlay.classList.add('show');
  });

  confirmBtn.addEventListener('click', () => {
    if (mode === 'save') {
      textarea.select();
      navigator.clipboard.writeText(textarea.value).catch(() => {});
      showToast('已复制到剪贴板', 'success');
    } else {
      const success = deserializeLevel(textarea.value, state);
      if (success) {
        showToast('关卡加载成功', 'success');
      } else {
        showToast('加载失败：JSON 格式错误', 'error');
      }
    }
    overlay.classList.remove('show');
  });

  cancelBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
}

function showToast(msg: string, type: 'success' | 'error'): void {
  const toast = document.getElementById('toast')!;
  toast.textContent = msg;
  toast.className = type;
  setTimeout(() => {
    toast.className = '';
  }, 2000);
}

function updateCoordsDisplay(): void {
  const display = document.getElementById('coordsDisplay')!;
  display.textContent = `X: ${state.mouseGridX}  Y: ${state.mouseGridY}`;
}

function updateFps(now: number): void {
  frameCount++;
  if (now - fpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    fpsTime = now;
    document.getElementById('fpsDisplay')!.textContent = `${currentFps} FPS`;
  }
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 1 / 30);
  lastTime = timestamp;
  const now = performance.now();

  if (state.mode === 'test') {
    updateSimulation(state, dt, now);
  } else {
    updateEditorEnemies(state, now);
  }

  render(ctx, state, now);
  updateCoordsDisplay();
  updateFps(now);

  requestAnimationFrame(gameLoop);
}

function createDefaultLevel(): void {
  const now = performance.now();
  for (let gx = 0; gx < 20; gx++) {
    const key = `${gx},10`;
    state.terrain.set(key, { gx, gy: 10, type: 'ground', placeTime: now, removeTime: null });
  }
  for (let gy = 8; gy <= 10; gy++) {
    const key1 = `0,${gy}`;
    const key2 = `19,${gy}`;
    state.terrain.set(key1, { gx: 0, gy, type: 'brick', placeTime: now, removeTime: null });
    state.terrain.set(key2, { gx: 19, gy, type: 'brick', placeTime: now, removeTime: null });
  }
  for (let gx = 8; gx <= 12; gx++) {
    const key = `${gx},7`;
    state.terrain.set(key, { gx, gy: 7, type: 'brick', placeTime: now, removeTime: null });
  }
  state.terrain.set('15,9', { gx: 15, gy: 9, type: 'spike', placeTime: now, removeTime: null });

  state.coins.push({ x: 10 * GRID, y: 6 * GRID, placeTime: now });
  state.coins.push({ x: 11 * GRID, y: 6 * GRID, placeTime: now });
  state.springs.push({ x: 5 * GRID, y: 9 * GRID, placeTime: now, compressed: false });
  state.slimes.push({ x: 3 * GRID, y: 9 * GRID, originX: 3 * GRID, dir: 1, placeTime: now });
  state.bats.push({ x: 14 * GRID, y: 4 * GRID, originX: 14 * GRID, originY: 4 * GRID, placeTime: now });
}

function init(): void {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  setupEditor(canvas, state);
  setupInput();
  setupToolbar();
  setupTestButton();
  setupPhysicsPanel();
  setupSaveLoad();
  createDefaultLevel();

  lastTime = performance.now();
  fpsTime = lastTime;
  requestAnimationFrame(gameLoop);
}

init();
