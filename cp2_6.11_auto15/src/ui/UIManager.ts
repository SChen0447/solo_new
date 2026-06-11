
import type { TowerType, Tower, GameState, TowerConfig } from '../shared/types';
import { TOWER_CONFIGS, GRID_COLS, GRID_ROWS, PREP_TIME } from '../shared/types';
import { eventBus } from '../shared/EventBus';
import type { GameController } from '../core/GameController';

export class UIManager {
  private container: HTMLElement;
  private controller: GameController;
  private canvas: HTMLCanvasElement;
  private selectedTowerType: TowerType | null = null;
  private selectedTowerId: string | null = null;
  private gameState: GameState | null = null;
  private waveCount: number = 20;
  private waveSummary: { wave: number; kills: number; reward: number } | null = null;
  private lastKills: number = 0;
  private goldAnim: number = 0;

  private bottomBar: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private topBar: HTMLElement | null = null;
  private waveModal: HTMLElement | null = null;
  private gameOverModal: HTMLElement | null = null;
  private victoryModal: HTMLElement | null = null;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, controller: GameController) {
    this.container = container;
    this.canvas = canvas;
    this.controller = controller;
    this.injectStyles();
    this.bindEvents();
    this.buildUI();
    this.attachCanvasEvents();
  }

  private injectStyles(): void {
    if (document.getElementById('td_game_styles')) return;
    const s = document.createElement('style');
    s.id = 'td_game_styles';
    s.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes popIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 10px rgba(0,240,255,0.3); }
        50% { box-shadow: 0 0 20px rgba(0,240,255,0.6); }
      }
    `;
    document.head.appendChild(s);
  }

  private bindEvents(): void {
    eventBus.on('Core:GameStateUpdated', (data) => {
      const d = data as GameState & { waveCount: number; selectedTowerType: TowerType | null; selectedTowerId: string | null; selectedTower: Tower | null };
      this.gameState = {
        gold: d.gold, wave: d.wave, hp: d.hp, maxHp: d.maxHp, kills: d.kills,
        prepTimer: d.prepTimer, isPlaying: d.isPlaying, isPreparing: d.isPreparing,
        gameOver: d.gameOver, victory: d.victory,
      };
      this.waveCount = d.waveCount;
      this.selectedTowerType = d.selectedTowerType;
      this.selectedTowerId = d.selectedTowerId;
      if (d.kills !== this.lastKills) { this.goldAnim = 1; this.lastKills = d.kills; }
      this.updateUI(d.selectedTower ?? null);
      if (d.gameOver && !this.gameOverModal) this.showGameOver();
      if (d.victory && !this.victoryModal) this.showVictory();
    });
    eventBus.on('Core:WaveCompleted', (data) => {
      const d = data as { wave: number; kills: number; reward: number };
      this.waveSummary = d;
      this.showWaveSummary();
    });
    eventBus.on('Core:PlayerDied', () => {
      if (!this.gameOverModal) this.showGameOver();
    });
    eventBus.on('UI:CanvasHover', (data) => {
      const d = data as { gx: number; gy: number };
      this.lastHover = d;
    });
  }

  private lastHover: { gx: number; gy: number } | null = null;

  private buildUI(): void {
    this.buildTopBar();
    this.buildBottomBar();
    this.buildRightPanel();
  }

  private buildTopBar(): void {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute; top: 1vh; left: 1vw; right: calc(22vw + 20px);
      min-width: 500px; height: 6vh; min-height: 40px; max-height: 56px;
      display: flex; align-items: center; justify-content: center; gap: 2vw; padding: 0 2vw;
      background: rgba(10, 22, 40, 0.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 12px;
      color: #e0f7ff; font-family: inherit; z-index: 10;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.08);
    `;
    const title = document.createElement('div');
    title.textContent = '星 际 防 线';
    title.style.cssText = `
      font-size: clamp(14px, 1.5vw, 20px); font-weight: 700; letter-spacing: 0.3em;
      background: linear-gradient(90deg, #00f0ff, #66ffcc, #00f0ff);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
    `;
    bar.appendChild(title);
    this.topBar = bar;
    this.container.appendChild(bar);
  }

  private buildBottomBar(): void {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute; bottom: 1vh; left: 1vw; right: calc(22vw + 20px);
      min-width: 500px; height: 9vh; min-height: 60px; max-height: 90px;
      display: flex; align-items: center; justify-content: space-around; padding: 0 2vw;
      background: rgba(10, 22, 40, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 14px;
      color: #e0f7ff; font-family: inherit; z-index: 10;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    `;
    bar.id = 'bottomBar';

    const gold = this.makeStatItem('💰', '金币', '250', '#ffd700');
    gold.id = 'statGold';
    const wave = this.makeStatItem('🌊', '波次', '0 / 20', '#00f0ff');
    wave.id = 'statWave';
    const kill = this.makeStatItem('💀', '击杀', '0', '#ff6688');
    kill.id = 'statKills';
    const hp = this.makeStatItem('❤️', '生命', '20 / 20', '#ff4466', true);
    hp.id = 'statHp';

    bar.appendChild(gold);
    bar.appendChild(this.makeDivider());
    bar.appendChild(wave);
    bar.appendChild(this.makeDivider());
    bar.appendChild(kill);
    bar.appendChild(this.makeDivider());
    bar.appendChild(hp);
    bar.appendChild(this.makeDivider());

    const prepBtn = document.createElement('button');
    prepBtn.id = 'prepBtn';
    prepBtn.textContent = '准备中 15s';
    prepBtn.style.cssText = `
      padding: 1vh 1.8vw; font-size: clamp(12px, 1.1vw, 15px); font-weight: 600;
      color: #0a1628; background: linear-gradient(135deg, #00f0ff, #66ffcc);
      border: none; border-radius: 10px; cursor: pointer; min-width: 120px; font-family: inherit;
      transition: all 0.2s ease; box-shadow: 0 0 14px rgba(0, 240, 255, 0.4);
    `;
    prepBtn.onmouseenter = () => {
      prepBtn.style.transform = 'translateY(-2px) scale(1.03)';
      prepBtn.style.boxShadow = '0 0 22px rgba(0, 240, 255, 0.7)';
    };
    prepBtn.onmouseleave = () => {
      prepBtn.style.transform = 'translateY(0) scale(1)';
      prepBtn.style.boxShadow = '0 0 14px rgba(0, 240, 255, 0.4)';
    };
    prepBtn.onclick = () => { if (this.gameState?.isPreparing) eventBus.emit('UI:WaveStarted'); };
    bar.appendChild(prepBtn);

    this.bottomBar = bar;
    this.container.appendChild(bar);
  }

  private makeStatItem(icon: string, label: string, value: string, color: string, withBar: boolean = false): HTMLDivElement {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;min-width:80px;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const ic = document.createElement('span');
    ic.textContent = icon;
    ic.style.cssText = 'font-size: clamp(14px, 1.2vw, 18px);';
    const val = document.createElement('span');
    val.textContent = value;
    val.style.cssText = `font-size: clamp(13px, 1.2vw, 18px); font-weight: 700; color: ${color}; text-shadow: 0 0 8px ${color}55; font-family: inherit;`;
    val.className = 'statValue';
    row.appendChild(ic);
    row.appendChild(val);
    const lab = document.createElement('span');
    lab.textContent = label;
    lab.style.cssText = 'font-size: clamp(10px, 0.8vw, 12px); color: rgba(224, 247, 255, 0.6); letter-spacing: 0.1em;';
    item.appendChild(row);
    item.appendChild(lab);
    if (withBar) {
      const bar = document.createElement('div');
      bar.style.cssText = 'width: 90px; height: 5px; background: rgba(255, 68, 102, 0.15); border-radius: 3px; overflow: hidden; margin-top: 2px;';
      const fill = document.createElement('div');
      fill.className = 'hpFill';
      fill.style.cssText = 'width: 100%; height: 100%; background: linear-gradient(90deg, #ff4466, #ff8899); border-radius: 3px; transition: width 0.3s ease;';
      bar.appendChild(fill);
      item.appendChild(bar);
    }
    return item;
  }

  private makeDivider(): HTMLDivElement {
    const d = document.createElement('div');
    d.style.cssText = 'width: 1px; height: 60%; background: linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.3), transparent);';
    return d;
  }

  private buildRightPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute; top: 1vh; right: 1vw;
      width: 21vw; min-width: 260px; max-width: 340px; height: 98vh;
      display: flex; flex-direction: column; gap: 12px; padding: 14px;
      background: rgba(10, 22, 40, 0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 14px;
      color: #e0f7ff; font-family: inherit; z-index: 10; overflow-y: auto; box-sizing: border-box;
    `;
    const t1 = this.makePanelTitle('防御塔');
    panel.appendChild(t1);

    const towerGrid = document.createElement('div');
    towerGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;';
    (Object.keys(TOWER_CONFIGS) as TowerType[]).forEach((type) => {
      const card = this.makeTowerCard(TOWER_CONFIGS[type]);
      towerGrid.appendChild(card);
    });
    panel.appendChild(towerGrid);

    const t2 = this.makePanelTitle('塔信息');
    panel.appendChild(t2);

    const infoPanel = document.createElement('div');
    infoPanel.id = 'towerInfo';
    infoPanel.style.cssText = `
      background: rgba(0, 240, 255, 0.04); border: 1px solid rgba(0, 240, 255, 0.15);
      border-radius: 10px; padding: 12px; font-size: clamp(11px, 0.95vw, 13px);
      color: rgba(224, 247, 255, 0.7); min-height: 100px;
    `;
    infoPanel.textContent = '点击卡片选择防御塔，点击地图空地建造，点击已建造的塔升级或出售。';
    panel.appendChild(infoPanel);

    const t3 = this.makePanelTitle('战场统计');
    panel.appendChild(t3);

    const statsPanel = document.createElement('div');
    statsPanel.id = 'statsPanel';
    statsPanel.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: clamp(11px, 0.95vw, 13px);';
    panel.appendChild(statsPanel);

    this.rightPanel = panel;
    this.container.appendChild(panel);
  }

  private makePanelTitle(text: string): HTMLDivElement {
    const t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = `
      font-size: clamp(13px, 1.1vw, 16px); font-weight: 700; letter-spacing: 0.3em;
      color: #00f0ff; padding: 4px 8px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); margin-bottom: 2px;
    `;
    return t;
  }

  private makeTowerCard(cfg: TowerConfig): HTMLDivElement {
    const card = document.createElement('div');
    card.className = `towerCard tower_${cfg.type}`;
    card.style.cssText = `
      position: relative; padding: 10px; background: rgba(0, 240, 255, 0.05);
      border: 1.5px solid rgba(0, 240, 255, 0.2); border-radius: 10px; cursor: pointer;
      transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center;
      gap: 4px; user-select: none;
    `;
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 40px; height: 40px; border-radius: 50%;
      background: radial-gradient(circle, ${cfg.color}44, ${cfg.color}11);
      border: 2px solid ${cfg.color}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 12px ${cfg.color}55; font-size: 18px; color: ${cfg.color}; font-weight: bold;
    `;
    icon.textContent = cfg.name.charAt(0);
    const name = document.createElement('div');
    name.textContent = cfg.name;
    name.style.cssText = `font-size: 13px; font-weight: 600; color: ${cfg.color};`;
    const cost = document.createElement('div');
    cost.className = 'towerCost';
    cost.textContent = `💰 ${cfg.levels[1].cost}`;
    cost.style.cssText = 'font-size: 11px; color: #ffd700;';
    const desc = document.createElement('div');
    desc.textContent = cfg.description;
    desc.style.cssText = 'font-size: 10px; color: rgba(224, 247, 255, 0.55); text-align: center;';
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(cost);
    card.appendChild(desc);

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-3px)';
      card.style.borderColor = cfg.color;
      card.style.boxShadow = `0 0 16px ${cfg.color}55`;
      card.style.background = `${cfg.color}15`;
    };
    card.onmouseleave = () => {
      card.style.transform = 'translateY(0)';
      if (this.selectedTowerType !== cfg.type) {
        card.style.borderColor = 'rgba(0, 240, 255, 0.2)';
        card.style.boxShadow = 'none';
        card.style.background = 'rgba(0, 240, 255, 0.05)';
      }
    };
    card.onclick = () => eventBus.emit('UI:TowerSelected', { towerType: cfg.type });
    return card;
  }

  private attachCanvasEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { offsetX, offsetY, cellSize } = this.controller.getMapLayout();
      const gx = Math.floor((x - offsetX) / cellSize);
      const gy = Math.floor((y - offsetY) / cellSize);
      eventBus.emit('UI:CanvasHover', { gx, gy, x, y });
    });
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { offsetX, offsetY, cellSize } = this.controller.getMapLayout();
      const gx = Math.floor((x - offsetX) / cellSize);
      const gy = Math.floor((y - offsetY) / cellSize);
      if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
        eventBus.emit('UI:GridClicked', { gridX: gx, gridY: gy });
      }
    });
    window.addEventListener('resize', () => this.controller.requestResize());
  }

  private updateUI(selectedTower: Tower | null): void {
    if (!this.gameState) return;
    const s = this.gameState;

    const goldEl = this.bottomBar?.querySelector('#statGold .statValue') as HTMLElement | null;
    if (goldEl) {
      goldEl.textContent = `${s.gold}`;
      if (this.goldAnim > 0) {
        goldEl.animate([{ transform: 'scale(1.2)', color: '#ffff99' }, { transform: 'scale(1)', color: '#ffd700' }], { duration: 300 });
        this.goldAnim = 0;
      }
    }
    const waveEl = this.bottomBar?.querySelector('#statWave .statValue') as HTMLElement | null;
    if (waveEl) waveEl.textContent = `${s.wave} / ${this.waveCount}`;
    const killEl = this.bottomBar?.querySelector('#statKills .statValue') as HTMLElement | null;
    if (killEl) killEl.textContent = `${s.kills}`;
    const hpEl = this.bottomBar?.querySelector('#statHp .statValue') as HTMLElement | null;
    if (hpEl) hpEl.textContent = `${s.hp} / ${s.maxHp}`;
    const hpFill = this.bottomBar?.querySelector('#statHp .hpFill') as HTMLElement | null;
    if (hpFill) {
      const pct = Math.max(0, (s.hp / s.maxHp) * 100);
      hpFill.style.width = `${pct}%`;
    }
    const prepBtn = this.bottomBar?.querySelector('#prepBtn') as HTMLButtonElement | null;
    if (prepBtn) {
      if (s.isPreparing) {
        prepBtn.disabled = false;
        prepBtn.textContent = `开始波次 ${Math.ceil(s.prepTimer)}s`;
        prepBtn.style.background = 'linear-gradient(135deg, #00f0ff, #66ffcc)';
        prepBtn.style.color = '#0a1628';
      } else {
        prepBtn.disabled = true;
        prepBtn.textContent = `进行中 ${s.wave}`;
        prepBtn.style.background = 'rgba(0, 240, 255, 0.2)';
        prepBtn.style.color = 'rgba(224, 247, 255, 0.6)';
      }
    }

    const cards = this.rightPanel?.querySelectorAll('.towerCard');
    cards?.forEach((c) => {
      const m = (c as HTMLElement).className.match(/tower_(\w+)/);
      const type = m ? (m[1] as TowerType) : null;
      if (!type) return;
      const cfg = TOWER_CONFIGS[type];
      const cost = cfg.levels[1].cost;
      const canAfford = s.gold >= cost;
      const isSelected = this.selectedTowerType === type;
      (c as HTMLElement).style.borderColor = isSelected ? cfg.color : canAfford ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 68, 102, 0.3)';
      (c as HTMLElement).style.opacity = canAfford || isSelected ? '1' : '0.5';
      (c as HTMLElement).style.boxShadow = isSelected ? `0 0 18px ${cfg.color}88` : 'none';
      (c as HTMLElement).style.background = isSelected ? `${cfg.color}22` : 'rgba(0, 240, 255, 0.05)';
    });

    this.updateTowerInfo(selectedTower);
    this.updateStatsPanel();
  }

  private updateTowerInfo(tower: Tower | null): void {
    const info = this.rightPanel?.querySelector('#towerInfo') as HTMLElement | null;
    if (!info) return;
    if (!tower) {
      if (this.selectedTowerType) {
        const cfg = TOWER_CONFIGS[this.selectedTowerType];
        const st = cfg.levels[1];
        info.innerHTML = `
          <div style="color:${cfg.color};font-weight:700;font-size:14px;margin-bottom:6px;">${cfg.name} · Lv.1</div>
          <div style="color:rgba(224,247,255,0.7);font-size:12px;margin-bottom:4px;">${cfg.description}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;font-size:12px;">
            <div>⚔️ 伤害: <span style="color:#ffddaa;">${st.damage}</span></div>
            <div>🎯 射程: <span style="color:#aaddff;">${st.range}</span></div>
            <div>⏱️ 射速: <span style="color:#ffcc66;">${st.fireRate.toFixed(2)}s</span></div>
            <div>💰 造价: <span style="color:#ffd700;">${st.cost}</span></div>
          </div>
          <div style="color:rgba(0,240,255,0.7);font-size:11px;margin-top:8px;">点击地图空地放置</div>
        `;
      } else {
        info.innerHTML = `<div style="color:rgba(224,247,255,0.5);">点击上方卡片选择防御塔类型，或点击地图上已建造的塔查看详情。</div>`;
      }
      return;
    }
    const cfg = TOWER_CONFIGS[tower.type];
    const nextLv = tower.level < 3 ? ((tower.level + 1) as 1 | 2 | 3) : null;
    const nextStats = nextLv ? cfg.levels[nextLv] : null;
    const canUpgrade = nextStats !== null && this.gameState ? this.gameState.gold >= nextStats.cost : false;
    const refund = Math.floor(tower.totalInvested * 0.7);

    info.innerHTML = `
      <div style="color:${cfg.color};font-weight:700;font-size:14px;margin-bottom:4px;">${cfg.name} · Lv.${tower.level}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:6px;font-size:12px;">
        <div>⚔️ 伤害: <span style="color:#ffddaa;">${tower.stats.damage}</span></div>
        <div>🎯 射程: <span style="color:#aaddff;">${tower.stats.range}</span></div>
        <div>⏱️ 射速: <span style="color:#ffcc66;">${tower.stats.fireRate.toFixed(2)}s</span></div>
        <div>💰 投入: <span style="color:#ffd700;">${tower.totalInvested}</span></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="upgradeBtn" style="flex:1;padding:8px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;font-size:12px;
          background:${canUpgrade && nextStats ? 'linear-gradient(135deg, #ffd700, #ffaa33)' : 'rgba(120,120,120,0.3)'};
          color:${canUpgrade && nextStats ? '#1a0e00' : 'rgba(224,247,255,0.4)'};">
          ${nextStats ? `升级 💰${nextStats.cost}` : '已满级'}
        </button>
        <button id="sellBtn" style="flex:1;padding:8px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;font-size:12px;
          background:linear-gradient(135deg, #ff4466, #cc2244);color:#fff;">
          出售 💰${refund}
        </button>
      </div>
    `;
    const up = info.querySelector('#upgradeBtn') as HTMLButtonElement | null;
    if (up && canUpgrade) up.onclick = () => eventBus.emit('UI:TowerUpgraded', { towerId: tower.id });
    const sell = info.querySelector('#sellBtn') as HTMLButtonElement | null;
    if (sell) sell.onclick = () => eventBus.emit('UI:TowerSold', { towerId: tower.id });
  }

  private updateStatsPanel(): void {
    const panel = this.rightPanel?.querySelector('#statsPanel') as HTMLElement | null;
    if (!panel || !this.gameState) return;
    const towerLvCount = [0, 0, 0];
    for (const t of this.controller.getTowerManager().getTowers()) towerLvCount[t.level - 1]++;
    const totalTowers = this.controller.getTowerManager().getTowerCount();
    const prepPct = this.gameState.isPreparing ? Math.max(0, (this.gameState.prepTimer / PREP_TIME) * 100) : 100;
    panel.innerHTML = `
      <div style="background:rgba(0,240,255,0.06);padding:8px;border-radius:7px;border:1px solid rgba(0,240,255,0.15);">
        <div style="color:rgba(224,247,255,0.6);font-size:10px;">防御塔数</div>
        <div style="color:#00f0ff;font-size:17px;font-weight:700;">${totalTowers}</div>
      </div>
      <div style="background:rgba(0,240,255,0.06);padding:8px;border-radius:7px;border:1px solid rgba(0,240,255,0.15);">
        <div style="color:rgba(224,247,255,0.6);font-size:10px;">敌人数</div>
        <div style="color:#ff88aa;font-size:17px;font-weight:700;">${this.controller.getEnemyManager().getEnemyCount()}</div>
      </div>
      <div style="background:rgba(0,240,255,0.06);padding:8px;border-radius:7px;border:1px solid rgba(0,240,255,0.15);grid-column:span 2;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:rgba(224,247,255,0.6);font-size:10px;">塔等级分布</span>
          <span style="color:rgba(224,247,255,0.4);font-size:10px;">L1 ${towerLvCount[0]} · L2 ${towerLvCount[1]} · L3 ${towerLvCount[2]}</span>
        </div>
        <div style="display:flex;gap:2px;height:6px;">
          ${[0, 1, 2].map((i) => `<div style="flex:${Math.max(1, towerLvCount[i])};background:${i === 0 ? '#66aaff' : i === 1 ? '#ffcc66' : '#ff66aa'};border-radius:3px;"></div>`).join('')}
        </div>
      </div>
      <div style="background:rgba(0,240,255,0.06);padding:8px;border-radius:7px;border:1px solid rgba(0,240,255,0.15);grid-column:span 2;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:rgba(224,247,255,0.6);font-size:10px;">准备进度</span>
          <span style="color:#00f0ff;font-size:10px;font-weight:600;">${this.gameState.isPreparing ? `${Math.ceil(this.gameState.prepTimer)}s` : '作战中'}</span>
        </div>
        <div style="height:6px;background:rgba(0,240,255,0.1);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${100 - prepPct}%;background:linear-gradient(90deg,#00f0ff,#66ffcc);transition:width 0.3s;"></div>
        </div>
      </div>
    `;
  }

  private showWaveSummary(): void {
    if (!this.waveSummary) return;
    if (this.waveModal) this.waveModal.remove();
    const modal = document.createElement('div');
    this.waveModal = modal;
    modal.style.cssText = `
      position: absolute; inset: 0; background: rgba(5, 10, 25, 0.75);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.3s ease;
    `;
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 40, 70, 0.95), rgba(10, 25, 50, 0.95));
      border: 1.5px solid rgba(0, 240, 255, 0.4); border-radius: 18px;
      padding: 30px 40px; text-align: center; min-width: 320px;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.25); font-family: inherit; color: #e0f7ff;
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    card.innerHTML = `
      <div style="color:#00f0ff;font-size:22px;font-weight:700;letter-spacing:0.3em;margin-bottom:20px;">波次 ${this.waveSummary.wave} 完成</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
        <div style="font-size:15px;">💀 击杀敌人: <span style="color:#ff6688;font-weight:700;font-size:18px;">${this.waveSummary.kills}</span></div>
        <div style="font-size:15px;">💰 波次奖励: <span style="color:#ffd700;font-weight:700;font-size:18px;">+${this.waveSummary.reward}</span></div>
      </div>
      <button id="closeWaveBtn" style="padding:10px 30px;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;
        background:linear-gradient(135deg,#00f0ff,#66ffcc);color:#0a1628;box-shadow:0 0 14px rgba(0,240,255,0.5);transition:all 0.2s;">
        继续
      </button>
    `;
    modal.appendChild(card);
    this.container.appendChild(modal);
    const btn = card.querySelector('#closeWaveBtn') as HTMLButtonElement;
