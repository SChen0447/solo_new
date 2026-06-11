/**
 * editor.ts — 主编辑器模块
 *
 * 模块间调用关系与数据流向:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ editor.ts (主编辑器 — Canvas渲染循环 + 输入事件分发)                      │
 * │                                                                          │
 * │ 数据流入:                                                                │
 * │   鼠标事件(mousedown/mousemove/mouseup) → 放置/选择/删除/拖拽关卡元素     │
 * │   键盘事件(keydown/keyup) → 工具切换(1-7) / 角色控制(A/D/W) /           │
 * │                              测试模式切换(空格/Esc) / 保存(S) / 加载(L)  │
 * │   窗口resize → Canvas尺寸自适应 + 网格缩放比例重算(最小1024x600)          │
 * │                                                                          │
 * │ 数据流出 (每帧 update → render 循环):                                    │
 * │                                                                          │
 * │   ┌─ update(dt) ─────────────────────────────────────────────────────┐   │
 * │   │  1. particles.update(dt)                                         │   │
 * │   │     → 粒子位置/透明度更新, life<=0的粒子移除                      │   │
 * │   │                                                                  │   │
 * │   │  2. [测试模式] updateMovingPlatforms(platforms, dt)  ← physics.ts│   │
 * │   │     → 移动平台位置更新, 记录prevX/prevY供碰撞携带计算            │   │
 * │   │                                                                  │   │
 * │   │  3. [测试模式] stepPhysics(player, platforms, input, dt) ← physics│   │
 * │   │     输入: player状态 + platforms + 按键 + dt                      │   │
 * │   │     输出: CollisionResult                                        │   │
 * │   │       ├─ landed=true → particles.spawnLandingDust() ← particles │   │
 * │   │       ├─ 跳跃输入  → particles.spawnJumpDust()     ← particles │   │
 * │   │       ├─ hitSpike=true → respawnPlayer()           ← physics    │   │
 * │   │       ├─ reachedFlag=true → spawnGoldExplosion()   ← particles │   │
 * │   │       └─ passedCheckpoint=true → showToast()                    │   │
 * │   └──────────────────────────────────────────────────────────────────┘   │
 * │                                                                          │
 * │   ┌─ render() ──────────────────────────────────────────────────────┐   │
 * │   │  1. 清空Canvas (#2a2a2a背景)                                    │   │
 * │   │  2. [编辑模式] 绘制网格虚线 (#555)                               │   │
 * │   │  3. 绘制所有平台/尖刺/旗帜/检查点/移动平台                       │   │
 * │   │  4. particles.draw(ctx, scale)                        ← particles│   │
 * │   │  5. 绘制玩家角色 (8x8白色像素块+眼睛)                           │   │
 * │   │  6. [编辑模式] 绘制幽灵预览/选中边框/移动范围                    │   │
 * │   │  7. 绘制UI (工具栏/状态栏/操作按钮/绿色闪烁)                    │   │
 * │   └──────────────────────────────────────────────────────────────────┘   │
 * │                                                                          │
 * │ 保存/加载:                                                               │
 * │   saveLevel() → 序列化platforms+startPos为JSON → Blob下载              │
 * │   loadLevel() → FileReader读取JSON → 反序列化platforms+startPos        │
 * │   保存时触发绿色闪烁效果 (saveFlashTimer)                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 验证方法:
 *   1. 物理模拟帧率: 在浏览器控制台输入以下代码启用FPS监控:
 *        window.__showFps = true
 *      然后观察左上角FPS计数器是否稳定在60fps附近
 *   2. 粒子数量上限: 在浏览器控制台输入:
 *        editor.particles.particles.length
 *      测试中该值应始终 ≤ 100
 *   3. 保存JSON: 点击"保存"按钮或按S键，检查下载的JSON文件是否包含
 *      platforms数组和startPos对象
 *   4. 加载JSON: 点击"加载"按钮或按L键，选择之前保存的JSON文件，
 *      确认场景恢复正确
 *   5. 测试模式: 按空格进入测试模式，确认网格隐藏、工具禁用、
 *      角色从起点开始移动，到达终点有金色粒子爆炸
 */

import { Platform, Player, createPlayer, stepPhysics, updateMovingPlatforms, respawnPlayer } from './physics';
import { ParticleSystem } from './particles';

type ToolType = 'select' | 'platform' | 'spike' | 'moving' | 'flag' | 'delete' | 'checkpoint' | 'start';

const GRID_SIZE = 32;
const DEFAULT_COLOR = '#8b4513';
const SPIKE_COLOR = '#dc143c';
const MOVING_COLOR = '#20b2aa';
const FLAG_COLOR = '#ffd700';
const BG_COLOR = '#2a2a2a';
const GRID_COLOR = '#555';

const TOOL_LABELS: { key: ToolType; label: string; icon: string }[] = [
  { key: 'select', label: '选择', icon: '▼' },
  { key: 'platform', label: '平台', icon: '■' },
  { key: 'spike', label: '尖刺', icon: '▲' },
  { key: 'moving', label: '移动', icon: '◆' },
  { key: 'checkpoint', label: '检查点', icon: '◉' },
  { key: 'flag', label: '终点', icon: '⚑' },
  { key: 'delete', label: '删除', icon: '✕' }
];

interface LevelData {
  platforms: Platform[];
  startPos: { x: number; y: number };
}

class Editor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  platforms: Platform[] = [];
  selectedId: string | null = null;
  currentTool: ToolType = 'platform';

  startPos = { x: 64, y: 400 };
  player: Player;

  testMode = false;
  input = { left: false, right: false, jump: false };
  prevJumpPressed = false;
  jumpTriggered = false;

  particles = new ParticleSystem();

  mouseX = 0;
  mouseY = 0;
  gridX = 0;
  gridY = 0;
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  dragCurrentX = 0;
  dragCurrentY = 0;
  resizeHandle: string | null = null;
  movingPlatformStart: { x: number; y: number } | null = null;

  hoveredButton: string | null = null;
  lastTime = 0;
  rafId = 0;

  platformColors: Record<string, string> = {};

  saveFlashTimer = 0;

  fpsFrames = 0;
  fpsTime = 0;
  fpsDisplay = 60;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.player = createPlayer(this.startPos.x, this.startPos.y);
    this.bindEvents();
    this.resize();
    this.initDemoLevel();
    this.loop(performance.now());
  }

  initDemoLevel(): void {
    this.platforms = [];
    const addP = (x: number, y: number, w: number, h: number, type: Platform['type'] = 'platform'): void => {
      this.platforms.push({
        id: Math.random().toString(36).slice(2, 10),
        x, y, width: w, height: h,
        color: type === 'spike' ? SPIKE_COLOR : type === 'moving' ? MOVING_COLOR : type === 'flag' ? FLAG_COLOR : DEFAULT_COLOR,
        type
      });
    };
    addP(0, 540, 800, 60);
    addP(200, 440, 120, 20);
    addP(400, 360, 120, 20);
    addP(600, 280, 120, 20);
    addP(140, 520, 20, 20, 'spike');
    const mp: Platform = {
      id: Math.random().toString(36).slice(2, 10),
      x: 300, y: 500, width: 80, height: 16,
      color: MOVING_COLOR, type: 'moving',
      moveRange: { startX: 300, endX: 480, startY: 500, endY: 500 },
      moveSpeed: 1.2, direction: 1, horizontalMove: true
    };
    this.platforms.push(mp);
    addP(760, 500, 40, 40, 'checkpoint');
    addP(900, 260, 40, 20, 'flag');
    addP(860, 280, 180, 20);
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { this.isDragging = false; this.resizeHandle = null; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  resize(): void {
    const minW = 1024, minH = 600;
    this.width = Math.max(window.innerWidth, minW);
    this.height = Math.max(window.innerHeight, minH);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const baseScale = Math.min(this.width / 1280, this.height / 720);
    this.scale = Math.max(0.75, Math.min(2, baseScale));
    this.offsetX = (this.width - 1280 * this.scale) / 2;
    this.offsetY = (this.height - 720 * this.scale) / 2;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  snapToGrid(v: number): number {
    return Math.floor(v / GRID_SIZE) * GRID_SIZE;
  }

  onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    const world = this.screenToWorld(this.mouseX, this.mouseY);
    this.gridX = this.snapToGrid(world.x);
    this.gridY = this.snapToGrid(world.y);
    this.hoveredButton = this.hitTestButtons();
    if (this.isDragging) {
      this.dragCurrentX = world.x;
      this.dragCurrentY = world.y;
      if (this.currentTool === 'select' && this.selectedId && this.resizeHandle) {
        this.resizePlatform(this.selectedId, this.resizeHandle, world.x, world.y);
      } else if (this.currentTool === 'select' && this.selectedId) {
        this.movePlatformByDrag(world.x, world.y);
      }
    }
  }

  onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const btn = this.hitTestButtonsAt(sx, sy);
    if (btn) {
      this.handleButtonClick(btn);
      return;
    }
    if (this.testMode) return;
    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartX = world.x;
      this.dragStartY = world.y;
      this.dragCurrentX = world.x;
      this.dragCurrentY = world.y;
      if (this.currentTool === 'select') {
        const hit = this.getPlatformAt(world.x, world.y);
        if (hit) {
          this.selectedId = hit.id;
          this.resizeHandle = this.getResizeHandle(hit, world.x, world.y);
          this.movingPlatformStart = { x: hit.x, y: hit.y };
        } else {
          this.selectedId = null;
        }
      } else if (this.currentTool === 'delete') {
        const hit = this.getPlatformAt(world.x, world.y);
        if (hit) {
          this.platforms = this.platforms.filter(p => p.id !== hit.id);
          this.selectedId = null;
          this.showToast('物体已删除', 'info');
        }
      }
    } else if (e.button === 2) {
      if (this.currentTool === 'select' && this.selectedId) {
        const p = this.platforms.find(x => x.id === this.selectedId);
        if (p && p.type === 'platform') {
          const colors = ['#8b4513', '#a0522d', '#cd853f', '#4682b4', '#6b8e23', '#708090', '#556b2f'];
          const idx = (colors.indexOf(this.platformColors[p.id] || p.color) + 1) % colors.length;
          this.platformColors[p.id] = colors[idx];
          p.color = colors[idx];
        }
      }
    }
  }

  onMouseUp(_e: MouseEvent): void {
    if (!this.testMode && this.isDragging) {
      const gsx = this.snapToGrid(this.dragStartX);
      const gsy = this.snapToGrid(this.dragStartY);
      const gex = this.snapToGrid(this.dragCurrentX + (this.dragCurrentX >= gsx ? GRID_SIZE : 0));
      const gey = this.snapToGrid(this.dragCurrentY + (this.dragCurrentY >= gsy ? GRID_SIZE : 0));
      const createdSomething = this.handlePlacementOnRelease(gsx, gsy, gex, gey);
      if (!createdSomething && this.currentTool === 'select' && this.selectedId && this.resizeHandle) {
        this.snapPlatformToGrid(this.selectedId);
      }
    }
    this.isDragging = false;
    this.resizeHandle = null;
    this.movingPlatformStart = null;
  }

  handlePlacementOnRelease(x1: number, y1: number, x2: number, y2: number): boolean {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    let w = Math.abs(x2 - x1);
    let h = Math.abs(y2 - y1);
    if (w === 0 && h === 0) return false;
    if (w < GRID_SIZE) w = GRID_SIZE;
    if (h < GRID_SIZE) h = GRID_SIZE;

    if (this.currentTool === 'platform') {
      const id = Math.random().toString(36).slice(2, 10);
      const color = '#8b4513';
      this.platformColors[id] = color;
      this.platforms.push({ id, x, y, width: w, height: h, color, type: 'platform' });
      this.selectedId = id;
      return true;
    } else if (this.currentTool === 'spike') {
      const cols = Math.max(1, Math.floor(w / GRID_SIZE));
      const rows = Math.max(1, Math.floor(h / GRID_SIZE));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const id = Math.random().toString(36).slice(2, 10);
          this.platforms.push({
            id, x: x + c * GRID_SIZE, y: y + r * GRID_SIZE,
            width: GRID_SIZE, height: GRID_SIZE, color: SPIKE_COLOR, type: 'spike'
          });
        }
      }
      return true;
    } else if (this.currentTool === 'moving') {
      const id = Math.random().toString(36).slice(2, 10);
      this.platforms.push({
        id, x, y, width: w, height: Math.min(h, GRID_SIZE),
        color: MOVING_COLOR, type: 'moving',
        moveRange: { startX: x, endX: x + 160, startY: y, endY: y },
        moveSpeed: 1.2, direction: 1, horizontalMove: true
      });
      this.selectedId = id;
      return true;
    } else if (this.currentTool === 'flag') {
      const id = Math.random().toString(36).slice(2, 10);
      this.platforms.push({
        id, x, y: y - h + GRID_SIZE, width: GRID_SIZE, height: h,
        color: FLAG_COLOR, type: 'flag'
      });
      return true;
    } else if (this.currentTool === 'checkpoint') {
      const id = Math.random().toString(36).slice(2, 10);
      this.platforms.push({
        id, x, y, width: GRID_SIZE, height: Math.max(h, GRID_SIZE),
        color: '#32cd32', type: 'checkpoint'
      });
      return true;
    } else if (this.currentTool === 'start') {
      this.startPos = { x, y };
      this.player.lastCheckpoint = { x, y };
      this.showToast(`起点设为 (${x}, ${y})`, 'info');
      return true;
    }
    return false;
  }

  getPlatformAt(wx: number, wy: number): Platform | null {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (wx >= p.x && wx <= p.x + p.width && wy >= p.y && wy <= p.y + p.height) {
        return p;
      }
    }
    return null;
  }

  getResizeHandle(p: Platform, wx: number, wy: number): string | null {
    const hs = 8;
    if (wx <= p.x + hs && wy <= p.y + hs) return 'tl';
    if (wx >= p.x + p.width - hs && wy <= p.y + hs) return 'tr';
    if (wx <= p.x + hs && wy >= p.y + p.height - hs) return 'bl';
    if (wx >= p.x + p.width - hs && wy >= p.y + p.height - hs) return 'br';
    if (wx <= p.x + hs) return 'l';
    if (wx >= p.x + p.width - hs) return 'r';
    if (wy <= p.y + hs) return 't';
    if (wy >= p.y + p.height - hs) return 'b';
    return null;
  }

  resizePlatform(id: string, handle: string, wx: number, wy: number): void {
    const p = this.platforms.find(x => x.id === id);
    if (!p || p.type === 'spike' || p.type === 'flag' || p.type === 'checkpoint') return;
    const startX = p.x, startY = p.y, startW = p.width, startH = p.height;
    let nx = startX, ny = startY, nw = startW, nh = startH;
    if (handle.includes('r')) nw = Math.max(GRID_SIZE, wx - startX);
    if (handle.includes('l')) { nx = Math.min(wx, startX + startW - GRID_SIZE); nw = startX + startW - nx; }
    if (handle.includes('b')) nh = Math.max(GRID_SIZE, wy - startY);
    if (handle.includes('t')) { ny = Math.min(wy, startY + startH - GRID_SIZE); nh = startY + startH - ny; }
    p.x = nx; p.y = ny; p.width = nw; p.height = nh;
    if (p.type === 'moving' && p.moveRange) {
      if (p.horizontalMove) {
        p.moveRange.startY = ny;
        p.moveRange.endY = ny;
      } else {
        p.moveRange.startX = nx;
        p.moveRange.endX = nx;
      }
    }
  }

  movePlatformByDrag(wx: number, wy: number): void {
    if (!this.movingPlatformStart) return;
    const p = this.platforms.find(x => x.id === this.selectedId);
    if (!p) return;
    const dx = this.snapToGrid(wx) - this.snapToGrid(this.dragStartX);
    const dy = this.snapToGrid(wy) - this.snapToGrid(this.dragStartY);
    p.x = this.movingPlatformStart.x + dx;
    p.y = this.movingPlatformStart.y + dy;
    if (p.type === 'moving' && p.moveRange) {
      const baseDx = p.x - this.movingPlatformStart.x;
      const baseDy = p.y - this.movingPlatformStart.y;
      p.moveRange.startX += baseDx;
      p.moveRange.endX += baseDx;
      p.moveRange.startY += baseDy;
      p.moveRange.endY += baseDy;
      this.movingPlatformStart = { x: p.x, y: p.y };
      this.dragStartX = wx;
      this.dragStartY = wy;
    }
  }

  snapPlatformToGrid(id: string): void {
    const p = this.platforms.find(x => x.id === id);
    if (!p) return;
    p.x = this.snapToGrid(p.x);
    p.y = this.snapToGrid(p.y);
    p.width = Math.max(GRID_SIZE, this.snapToGrid(p.width + GRID_SIZE / 2));
    p.height = Math.max(GRID_SIZE, this.snapToGrid(p.height + GRID_SIZE / 2));
  }

  hitTestButtons(): string | null {
    return this.hitTestButtonsAt(this.mouseX, this.mouseY);
  }

  hitTestButtonsAt(sx: number, sy: number): string | null {
    const toolW = 58, toolH = 56;
    const panelX = 12, panelY = 12;
    for (let i = 0; i < TOOL_LABELS.length; i++) {
      const tx = panelX + 10 + i * (toolW + 6);
      const ty = panelY + 36;
      if (sx >= tx && sx <= tx + toolW && sy >= ty && sy <= ty + toolH) {
        return `tool:${TOOL_LABELS[i].key}`;
      }
    }
    const bw = 140, bh = 38;
    const bx = this.width - bw - 16;
    const rightBtns = [
      { id: 'save', y: 12 },
      { id: 'load', y: 56 },
      { id: 'test', y: 100 }
    ];
    for (const b of rightBtns) {
      if (sx >= bx && sx <= bx + bw && sy >= b.y && sy <= b.y + bh) {
        return `btn:${b.id}`;
      }
    }
    return null;
  }

  handleButtonClick(btn: string): void {
    if (btn.startsWith('tool:')) {
      this.currentTool = btn.slice(5) as ToolType;
      this.selectedId = null;
    } else if (btn === 'btn:save') {
      this.saveLevel();
    } else if (btn === 'btn:load') {
      this.loadLevel();
    } else if (btn === 'btn:test') {
      this.toggleTestMode();
    }
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (this.testMode) {
      if (k === 'a' || k === 'arrowleft') this.input.left = true;
      if (k === 'd' || k === 'arrowright') this.input.right = true;
      if (k === 'w' || k === 'arrowup' || k === ' ') {
        if (!this.prevJumpPressed) {
          this.input.jump = true;
          this.jumpTriggered = true;
        }
        this.prevJumpPressed = true;
      }
      if (k === 'escape') this.toggleTestMode();
    } else {
      if (k === '1') this.currentTool = 'select';
      if (k === '2') this.currentTool = 'platform';
      if (k === '3') this.currentTool = 'spike';
      if (k === '4') this.currentTool = 'moving';
      if (k === '5') this.currentTool = 'checkpoint';
      if (k === '6') this.currentTool = 'flag';
      if (k === '7') this.currentTool = 'delete';
      if (k === 's' && !e.ctrlKey) this.saveLevel();
      if (k === 'l') this.loadLevel();
      if (k === ' ') { e.preventDefault(); this.toggleTestMode(); }
      if (k === 'delete' && this.selectedId) {
        this.platforms = this.platforms.filter(p => p.id !== this.selectedId);
        this.selectedId = null;
      }
    }
  }

  onKeyUp(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (this.testMode) {
      if (k === 'a' || k === 'arrowleft') this.input.left = false;
      if (k === 'd' || k === 'arrowright') this.input.right = false;
      if (k === 'w' || k === 'arrowup' || k === ' ') {
        this.input.jump = false;
        this.prevJumpPressed = false;
      }
    }
  }

  toggleTestMode(): void {
    this.testMode = !this.testMode;
    this.particles.clear();
    if (this.testMode) {
      this.player = createPlayer(this.startPos.x, this.startPos.y);
      this.input = { left: false, right: false, jump: false };
      this.prevJumpPressed = false;
      this.jumpTriggered = false;
      this.selectedId = null;
      this.showToast('进入测试模式 — A/D移动 W跳跃 Esc返回', 'info');
    } else {
      this.showToast('返回编辑模式', 'info');
    }
  }

  saveLevel(): void {
    const data: LevelData = {
      platforms: this.platforms.map(p => {
        const copy = { ...p };
        delete copy.prevX;
        delete copy.prevY;
        return copy;
      }),
      startPos: { ...this.startPos }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.saveFlashTimer = 30;
    this.showToast('关卡保存成功！', 'success');
  }

  loadLevel(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as LevelData;
          this.platforms = data.platforms.map(p => ({ ...p }));
          if (data.startPos) {
            this.startPos = { ...data.startPos };
          }
          this.platformColors = {};
          for (const p of this.platforms) {
            if (p.type === 'platform') this.platformColors[p.id] = p.color;
          }
          this.selectedId = null;
          this.showToast('关卡加载成功！', 'success');
        } catch {
          this.showToast('关卡文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }

  showToast(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
    let toast = document.querySelector('.toast') as HTMLDivElement;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.className = `toast ${type}`;
    toast.textContent = text;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout((toast as any)._tid);
    (toast as any)._tid = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  loop(now: number): void {
    const dt = Math.min(2, (now - this.lastTime) / (1000 / 60));
    this.lastTime = now;
    this.fpsFrames++;
    this.fpsTime += now - (this.lastTime - dt * (1000 / 60));
    if (this.fpsFrames >= 30) {
      this.fpsDisplay = Math.round(1000 / ((now - this.fpsTime + this.fpsFrames * 16.67) / this.fpsFrames));
      this.fpsTime = now;
      this.fpsFrames = 0;
    }
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number): void {
    this.particles.update(dt);
    if (this.saveFlashTimer > 0) {
      this.saveFlashTimer -= dt;
    }

    if (this.testMode) {
      updateMovingPlatforms(this.platforms, dt);

      const wasOnGround = this.player.onGround;
      const res = stepPhysics(this.player, this.platforms, this.input, dt);

      if (this.jumpTriggered && wasOnGround) {
        this.particles.spawnJumpDust(this.player.x, this.player.y + this.player.height);
      }
      this.jumpTriggered = false;

      if (res.landed) {
        this.particles.spawnLandingDust(this.player.x, this.player.y + this.player.height, this.player.width);
      }
      if (res.hitSpike) {
        respawnPlayer(this.player);
      }
      if (res.passedCheckpoint) {
        this.showToast('检查点已保存', 'success');
      }
      if (res.reachedFlag) {
        this.particles.spawnGoldExplosion(
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2
        );
        this.showToast('关卡完成！', 'success');
        setTimeout(() => { if (this.testMode) this.toggleTestMode(); }, 1500);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.saveFlashTimer > 0) {
      const flashAlpha = Math.min(0.3, this.saveFlashTimer / 30 * 0.3);
      ctx.fillStyle = `rgba(40, 167, 69, ${flashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    if (!this.testMode) {
      this.drawGrid();
    }

    this.drawPlatforms();
    this.particles.draw(ctx, 1);
    if (this.testMode) {
      this.drawPlayer();
    }

    if (!this.testMode) {
      this.drawPlayer();
      this.drawGhostPreview();
      this.drawSelectionOutline();
      this.drawMovingPlatformRanges();
    }

    ctx.restore();

    this.drawUI();
  }

  drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1 / this.scale;
    ctx.setLineDash([4 / this.scale, 6 / this.scale]);
    const worldW = 1280, worldH = 720;
    ctx.beginPath();
    for (let x = 0; x <= worldW; x += GRID_SIZE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, worldH);
    }
    for (let y = 0; y <= worldH; y += GRID_SIZE) {
      ctx.moveTo(0, y); ctx.lineTo(worldW, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2 / this.scale;
    ctx.strokeRect(0, 0, worldW, worldH);
  }

  drawPlatforms(): void {
    const ctx = this.ctx;
    for (const p of this.platforms) {
      if (p.type === 'spike') {
        this.drawSpike(p);
      } else if (p.type === 'flag') {
        this.drawFlag(p);
      } else if (p.type === 'checkpoint') {
        this.drawCheckpoint(p);
      } else if (p.type === 'moving') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < p.width; i += 8) {
          ctx.fillRect(p.x + i, p.y, 4, 2);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(p.x, p.y, p.width, 3);
        for (let by = 0; by < p.height; by += 16) {
          const offset = (by / 16) % 2 === 0 ? 0 : 16;
          for (let bx = offset; bx < p.width; bx += 32) {
            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x + bx + 0.5, p.y + by + 0.5, 31, 15);
          }
        }
      }
    }
    if (!this.testMode) {
      ctx.fillStyle = '#4169e1';
      ctx.fillRect(this.startPos.x - 2, this.startPos.y - 16, 12, 16);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('START', this.startPos.x - 6, this.startPos.y - 20);
      ctx.strokeStyle = 'rgba(65,105,225,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(this.startPos.x, this.startPos.y, 8, 8);
      ctx.setLineDash([]);
    }
  }

  drawSpike(p: Platform): void {
    const ctx = this.ctx;
    const cols = Math.max(1, Math.floor(p.width / GRID_SIZE));
    const rows = Math.max(1, Math.floor(p.height / GRID_SIZE));
    const cw = p.width / cols;
    const ch = p.height / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = p.x + c * cw;
        const sy = p.y + r * ch;
        ctx.fillStyle = SPIKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(sx, sy + ch);
        ctx.lineTo(sx + cw / 2, sy + 4);
        ctx.lineTo(sx + cw, sy + ch);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(sx + cw / 2 - 2, sy + ch - 6);
        ctx.lineTo(sx + cw / 2, sy + 6);
        ctx.lineTo(sx + cw / 2 + 1, sy + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawFlag(p: Platform): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(p.x + p.width / 2 - 2, p.y, 4, p.height);
    ctx.fillStyle = FLAG_COLOR;
    const fx = p.x + p.width / 2 + 2;
    const fy = p.y + 4;
    const fw = Math.min(p.width * 1.2, 28);
    const fh = Math.min(p.height * 0.5, 18);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + fw, fy + fh * 0.3);
    ctx.lineTo(fx + fw * 0.7, fy + fh * 0.5);
    ctx.lineTo(fx + fw, fy + fh * 0.7);
    ctx.lineTo(fx, fy + fh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawCheckpoint(p: Platform): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#2f4f4f';
    ctx.fillRect(p.x + p.width / 2 - 2, p.y, 4, p.height);
    ctx.fillStyle = p.color;
    const fx = p.x + p.width / 2 + 2;
    const fy = p.y + 4;
    const fw = Math.min(p.width, 22);
    const fh = Math.min(p.height * 0.5, 16);
    ctx.fillRect(fx, fy, fw, fh);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('CP', fx + 3, fy + fh / 2 + 3);
  }

  drawMovingPlatformRanges(): void {
    const ctx = this.ctx;
    for (const p of this.platforms) {
      if (p.type !== 'moving' || !p.moveRange) continue;
      ctx.strokeStyle = 'rgba(32,178,170,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      if (p.horizontalMove) {
        const cy = p.y + p.height / 2;
        ctx.beginPath();
        ctx.moveTo(p.moveRange.startX, cy);
        ctx.lineTo(p.moveRange.endX + p.width, cy);
        ctx.stroke();
      } else {
        const cx = p.x + p.width / 2;
        ctx.beginPath();
        ctx.moveTo(cx, p.moveRange.startY);
        ctx.lineTo(cx, p.moveRange.endY + p.height);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  drawPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;
    if (p.blinking && Math.floor(p.blinkTimer * 10) % 2 === 0) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.fillStyle = '#333';
    ctx.fillRect(p.x + 2, p.y + 2, 2, 2);
    ctx.fillRect(p.x + 4, p.y + 2, 2, 2);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(p.x, p.y + p.height - 2, p.width, 2);
  }

  drawGhostPreview(): void {
    if (this.currentTool === 'select' || this.currentTool === 'delete') return;
    const ctx = this.ctx;
    ctx.globalAlpha = 0.5;
    if (this.isDragging) {
      const gsx = this.snapToGrid(this.dragStartX);
      const gsy = this.snapToGrid(this.dragStartY);
      const gex = this.snapToGrid(this.dragCurrentX + (this.dragCurrentX >= gsx ? GRID_SIZE : 0));
      const gey = this.snapToGrid(this.dragCurrentY + (this.dragCurrentY >= gsy ? GRID_SIZE : 0));
      const x = Math.min(gsx, gex);
      const y = Math.min(gsy, gey);
      let w = Math.abs(gex - gsx);
      let h = Math.abs(gey - gsy);
      if (w < GRID_SIZE) w = GRID_SIZE;
      if (h < GRID_SIZE) h = GRID_SIZE;
      this.renderToolShape(x, y, w, h);
    } else {
      const s = this.currentTool === 'platform' ? GRID_SIZE * 2 : GRID_SIZE;
      this.renderToolShape(this.gridX, this.gridY, s, s);
    }
    ctx.globalAlpha = 1;
  }

  renderToolShape(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    switch (this.currentTool) {
      case 'platform':
        ctx.fillStyle = DEFAULT_COLOR;
        ctx.fillRect(x, y, w, h);
        break;
      case 'spike':
        ctx.fillStyle = SPIKE_COLOR;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w / 2, y + 4);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
        break;
      case 'moving':
        ctx.fillStyle = MOVING_COLOR;
        ctx.fillRect(x, y, w, Math.min(h, GRID_SIZE));
        break;
      case 'flag':
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + w / 2 - 2, y, 4, h);
        ctx.fillStyle = FLAG_COLOR;
        ctx.fillRect(x + w / 2 + 2, y + 4, 22, 14);
        break;
      case 'checkpoint':
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(x + w / 2 - 2, y, 4, h);
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(x + w / 2 + 2, y + 4, 18, 12);
        break;
    }
  }

  drawSelectionOutline(): void {
    if (!this.selectedId) return;
    const p = this.platforms.find(x => x.id === this.selectedId);
    if (!p) return;
    const ctx = this.ctx;
    ctx.strokeStyle = '#87ceeb';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(p.x - 1, p.y - 1, p.width + 2, p.height + 2);
    ctx.setLineDash([]);
    if (p.type !== 'spike' && p.type !== 'flag' && p.type !== 'checkpoint') {
      ctx.fillStyle = '#87ceeb';
      const handles = [
        [p.x, p.y], [p.x + p.width, p.y], [p.x, p.y + p.height], [p.x + p.width, p.y + p.height],
        [p.x + p.width / 2, p.y], [p.x + p.width / 2, p.y + p.height],
        [p.x, p.y + p.height / 2], [p.x + p.width, p.y + p.height / 2]
      ];
      for (const [hx, hy] of handles) {
        ctx.fillRect(hx - 3, hy - 3, 6, 6);
      }
    }
  }

  drawUI(): void {
    const ctx = this.ctx;
    this.drawToolbar(ctx);
    this.drawStatusBar(ctx);
    this.drawActionButtons(ctx);
    if (this.testMode) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.roundRect(ctx, this.width / 2 - 160, 8, 320, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('测试模式  A/D移动  W跳跃  Esc返回编辑', this.width / 2, 30);
      ctx.textAlign = 'left';
    }
    if ((window as any).__showFps) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(4, 4, 80, 22);
      ctx.fillStyle = this.fpsDisplay >= 55 ? '#0f0' : this.fpsDisplay >= 30 ? '#ff0' : '#f00';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`FPS: ${this.fpsDisplay}`, 10, 20);
    }
  }

  drawToolbar(ctx: CanvasRenderingContext2D): void {
    const panelX = 12, panelY = 12;
    const toolW = 58, toolH = 56;
    const panelW = 10 + TOOL_LABELS.length * (toolW + 6) + 4;
    const panelH = toolH + 60;

    this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fillStyle = 'rgba(45,45,45,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('工具栏', panelX + 12, panelY + 22);

    for (let i = 0; i < TOOL_LABELS.length; i++) {
      const t = TOOL_LABELS[i];
      const tx = panelX + 10 + i * (toolW + 6);
      const ty = panelY + 36;
      const selected = this.currentTool === t.key;
      const hovered = this.hoveredButton === `tool:${t.key}`;

      this.roundRect(ctx, tx, ty, toolW, toolH, 7);
      ctx.fillStyle = selected ? 'rgba(135,206,235,0.25)' : hovered ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,60,0.8)';
      ctx.fill();
      ctx.strokeStyle = selected ? '#87ceeb' : '#555';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = this.getToolColor(t.key);
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.icon, tx + toolW / 2, ty + 26);

      ctx.fillStyle = selected ? '#87ceeb' : '#bbb';
      ctx.font = '11px monospace';
      ctx.fillText(t.label, tx + toolW / 2, ty + 44);
      ctx.textAlign = 'left';

      if (selected) {
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(tx + 8, ty + toolH - 4, toolW - 16, 3);
      }

      ctx.fillStyle = '#888';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), tx + toolW - 5, ty + 12);
      ctx.textAlign = 'left';
    }
  }

  getToolColor(key: ToolType): string {
    switch (key) {
      case 'platform': return DEFAULT_COLOR;
      case 'spike': return SPIKE_COLOR;
      case 'moving': return MOVING_COLOR;
      case 'flag': return FLAG_COLOR;
      case 'checkpoint': return '#32cd32';
      case 'delete': return '#ff6b6b';
      default: return '#ddd';
    }
  }

  drawStatusBar(ctx: CanvasRenderingContext2D): void {
    const barW = 440, barH = 38;
    const bx = 16, by = this.height - barH - 14;
    this.roundRect(ctx, bx, by, barW, barH, 8);
    ctx.fillStyle = 'rgba(45,45,45,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px monospace';
    const wx = Math.floor(this.gridX), wy = Math.floor(this.gridY);
    ctx.fillText(`网格: (${wx}, ${wy})`, bx + 14, by + 16);
    ctx.fillText(`物体: ${this.platforms.length}`, bx + 14, by + 32);
    ctx.fillStyle = '#87ceeb';
    ctx.fillText(`起点: (${this.startPos.x}, ${this.startPos.y})`, bx + 175, by + 16);
    ctx.fillText(`工具: ${TOOL_LABELS.find(t => t.key === this.currentTool)?.label}`, bx + 175, by + 32);
  }

  drawActionButtons(ctx: CanvasRenderingContext2D): void {
    const bw = 140, bh = 38;
    const bx = this.width - bw - 16;
    const buttons = [
      { id: 'save', label: '保存 (S)', color: '#28a745', y: 12 },
      { id: 'load', label: '加载 (L)', color: '#17a2b8', y: 56 },
      { id: 'test', label: this.testMode ? '编辑 (Esc)' : '测试 (空格)', color: this.testMode ? '#ffc107' : '#6f42c1', y: 100 }
    ];
    for (const b of buttons) {
      const hovered = this.hoveredButton === `btn:${b.id}`;
      this.roundRect(ctx, bx, b.y, bw, bh, 8);
      ctx.fillStyle = hovered ? 'rgba(255,255,255,0.15)' : b.color;
      ctx.globalAlpha = hovered ? 0.95 : 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, bx + bw / 2, b.y + bh / 2 + 4);
      ctx.textAlign = 'left';
    }
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

const editor = new Editor();
(window as any).editor = editor;
