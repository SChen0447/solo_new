import {
  AppState, TerrainBlock, CoinItem, SpringItem, SlimeEnemy, BatEnemy,
  GRID, terrainKey, Effect,
} from './renderer';

export function setupEditor(
  canvas: HTMLCanvasElement,
  state: AppState,
): void {
  canvas.addEventListener('mousedown', (e) => onCanvasMouseDown(e, canvas, state));
  canvas.addEventListener('mousemove', (e) => onCanvasMouseMove(e, canvas, state));
  canvas.addEventListener('mouseup', () => onCanvasMouseUp(state));
  canvas.addEventListener('mouseleave', () => onCanvasMouseUp(state));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function canvasToGrid(e: MouseEvent, canvas: HTMLCanvasElement, state: AppState): { gx: number; gy: number; px: number; py: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * scaleX + state.camera.x;
  const py = (e.clientY - rect.top) * scaleY + state.camera.y;
  return { gx: Math.floor(px / GRID), gy: Math.floor(py / GRID), px, py };
}

function onCanvasMouseDown(e: MouseEvent, canvas: HTMLCanvasElement, state: AppState): void {
  if (state.mode !== 'edit') return;

  const { gx, gy, px, py } = canvasToGrid(e, canvas, state);
  const tool = state.selectedTool;

  if (e.button === 2) {
    eraseAt(gx, gy, state, performance.now());
    return;
  }

  if (e.button !== 0) return;

  if (tool === 'ground' || tool === 'brick' || tool === 'spike') {
    state.isDrawing = true;
    placeTerrain(gx, gy, tool as 'ground' | 'brick' | 'spike', state);
  } else if (tool === 'coin') {
    placeCoin(gx, gy, state);
  } else if (tool === 'spring') {
    placeSpring(gx, gy, state);
  } else if (tool === 'slime') {
    placeSlime(gx, gy, state);
  } else if (tool === 'bat') {
    placeBat(gx, gy, state);
  } else if (tool === 'eraser') {
    state.isDrawing = true;
    eraseAt(gx, gy, state, performance.now());
  }
}

function onCanvasMouseMove(e: MouseEvent, canvas: HTMLCanvasElement, state: AppState): void {
  const { gx, gy, px, py } = canvasToGrid(e, canvas, state);
  state.mouseX = px;
  state.mouseY = py;
  state.mouseGridX = gx;
  state.mouseGridY = gy;
  state.hoverPreview = true;

  if (state.mode !== 'edit') return;

  const tool = state.selectedTool;

  if (state.isDrawing) {
    if (tool === 'ground' || tool === 'brick' || tool === 'spike') {
      placeTerrain(gx, gy, tool as 'ground' | 'brick' | 'spike', state);
    } else if (tool === 'eraser') {
      eraseAt(gx, gy, state, performance.now());
    }
  }
}

function onCanvasMouseUp(state: AppState): void {
  state.isDrawing = false;
}

function placeTerrain(gx: number, gy: number, type: 'ground' | 'brick' | 'spike', state: AppState): void {
  const key = terrainKey(gx, gy);
  if (state.terrain.has(key)) return;

  const now = performance.now();
  const block: TerrainBlock = {
    gx,
    gy,
    type,
    placeTime: now,
    removeTime: null,
  };
  state.terrain.set(key, block);

  state.effects.push({
    type: 'place',
    x: gx * GRID,
    y: gy * GRID,
    startTime: now,
    duration: 300,
  });
}

function eraseAt(gx: number, gy: number, state: AppState, now: number): void {
  const key = terrainKey(gx, gy);
  const block = state.terrain.get(key);
  if (block) {
    block.removeTime = now;
    setTimeout(() => {
      const b = state.terrain.get(key);
      if (b && b.removeTime !== null) {
        state.terrain.delete(key);
      }
    }, 160);
    return;
  }

  const px = gx * GRID;
  const py = gy * GRID;

  state.coins = state.coins.filter(c => !(c.x === px && c.y === py));
  state.springs = state.springs.filter(s => !(s.x === px && s.y === py));
  state.slimes = state.slimes.filter(s => !(Math.floor(s.x / GRID) === gx && Math.floor(s.y / GRID) === gy));
  state.bats = state.bats.filter(b => !(Math.floor(b.x / GRID) === gx && Math.floor(b.y / GRID) === gy));
}

function placeCoin(gx: number, gy: number, state: AppState): void {
  const now = performance.now();
  state.coins.push({
    x: gx * GRID,
    y: gy * GRID,
    placeTime: now,
  });
  state.effects.push({
    type: 'place',
    x: gx * GRID,
    y: gy * GRID,
    startTime: now,
    duration: 300,
  });
}

function placeSpring(gx: number, gy: number, state: AppState): void {
  const now = performance.now();
  state.springs.push({
    x: gx * GRID,
    y: gy * GRID,
    placeTime: now,
    compressed: false,
  });
  state.effects.push({
    type: 'place',
    x: gx * GRID,
    y: gy * GRID,
    startTime: now,
    duration: 300,
  });
}

function placeSlime(gx: number, gy: number, state: AppState): void {
  const now = performance.now();
  state.slimes.push({
    x: gx * GRID,
    y: gy * GRID,
    originX: gx * GRID,
    dir: 1,
    placeTime: now,
  });
  state.effects.push({
    type: 'place',
    x: gx * GRID,
    y: gy * GRID,
    startTime: now,
    duration: 300,
  });
}

function placeBat(gx: number, gy: number, state: AppState): void {
  const now = performance.now();
  state.bats.push({
    x: gx * GRID,
    y: gy * GRID,
    originX: gx * GRID,
    originY: gy * GRID,
    placeTime: now,
  });
  state.effects.push({
    type: 'place',
    x: gx * GRID,
    y: gy * GRID,
    startTime: now,
    duration: 300,
  });
}

export function serializeLevel(state: AppState): string {
  const terrainArr = Array.from(state.terrain.values())
    .filter(b => b.removeTime === null)
    .map(b => ({ gx: b.gx, gy: b.gy, type: b.type }));

  const data = {
    terrain: terrainArr,
    coins: state.coins.map(c => ({ x: c.x, y: c.y })),
    springs: state.springs.map(s => ({ x: s.x, y: s.y })),
    slimes: state.slimes.map(s => ({ x: s.originX, y: s.y })),
    bats: state.bats.map(b => ({ x: b.originX, y: b.originY })),
  };
  return JSON.stringify(data, null, 2);
}

export function deserializeLevel(json: string, state: AppState): boolean {
  try {
    const data = JSON.parse(json);
    const now = performance.now();

    state.terrain.clear();
    state.coins = [];
    state.springs = [];
    state.slimes = [];
    state.bats = [];

    if (data.terrain && Array.isArray(data.terrain)) {
      for (const t of data.terrain) {
        const key = terrainKey(t.gx, t.gy);
        state.terrain.set(key, {
          gx: t.gx,
          gy: t.gy,
          type: t.type,
          placeTime: now,
          removeTime: null,
        });
      }
    }

    if (data.coins && Array.isArray(data.coins)) {
      for (const c of data.coins) {
        state.coins.push({ x: c.x, y: c.y, placeTime: now });
      }
    }

    if (data.springs && Array.isArray(data.springs)) {
      for (const s of data.springs) {
        state.springs.push({ x: s.x, y: s.y, placeTime: now, compressed: false });
      }
    }

    if (data.slimes && Array.isArray(data.slimes)) {
      for (const s of data.slimes) {
        state.slimes.push({ x: s.x, y: s.y, originX: s.x, dir: 1, placeTime: now });
      }
    }

    if (data.bats && Array.isArray(data.bats)) {
      for (const b of data.bats) {
        state.bats.push({ x: b.x, y: b.y, originX: b.x, originY: b.y, placeTime: now });
      }
    }

    return true;
  } catch {
    return false;
  }
}
