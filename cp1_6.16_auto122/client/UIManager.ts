import {
  ClientGameState,
  PlayerSide,
  TowerType,
  MonsterType,
  TOWER_CONFIGS,
  MONSTER_CONFIGS,
  Tower,
} from '../shared/types';

export interface UIManagerCallbacks {
  onPlaceTower: (towerType: TowerType, gridX: number, gridY: number) => void;
  onUpgradeTower: (towerId: string) => void;
  onSpawnMonster: (monsterType: MonsterType) => void;
  onRestart: () => void;
}

export class UIManager {
  private callbacks: UIManagerCallbacks;
  private selectedTowerType: TowerType | null = null;
  private selectedTowerId: string | null = null;
  private gameState: ClientGameState | null = null;
  private playerSide: PlayerSide | null = null;
  private container: HTMLElement;
  private tooltipEl: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: UIManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI();
  }

  setGameState(state: ClientGameState) {
    this.gameState = state;
    this.updateStatusBars();
    this.updateMonsterButtons();
  }

  setPlayerSide(side: PlayerSide) {
    this.playerSide = side;
  }

  getSelectedTowerType(): TowerType | null {
    return this.selectedTowerType;
  }

  getSelectedTowerId(): string | null {
    return this.selectedTowerId;
  }

  handleCellClick(gridX: number, gridY: number) {
    if (!this.gameState || !this.playerSide) return;

    if (this.selectedTowerType) {
      this.callbacks.onPlaceTower(this.selectedTowerType, gridX, gridY);
      return;
    }

    const clickedTower = this.gameState.towers.find(
      t => t.gridX === gridX && t.gridY === gridY && t.owner === this.playerSide && !t.destroyed
    );

    if (clickedTower) {
      this.selectedTowerId = clickedTower.id;
      this.showUpgradePanel(clickedTower);
    } else {
      this.selectedTowerId = null;
      this.hideUpgradePanel();
    }
  }

  private buildUI() {
    this.container.innerHTML = '';

    const topBar = document.createElement('div');
    topBar.id = 'top-bar';
    topBar.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 16px; background: rgba(31, 40, 51, 0.9);
      border-bottom: 1px solid rgba(69, 162, 158, 0.3);
    `;

    topBar.innerHTML = `
      <div id="left-status" style="display:flex;gap:12px;align-items:center;">
        <div style="color:#4488FF;font-weight:bold;">LEFT BASE</div>
        <div id="left-hp-bar" style="width:120px;height:16px;background:rgba(0,0,0,0.4);border-radius:8px;overflow:hidden;">
          <div id="left-hp-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#00AA44,#44FF88);border-radius:8px;transition:width 0.3s;"></div>
        </div>
        <div id="left-hp-text" style="color:#66FF88;font-size:12px;">100/100</div>
        <div id="left-resources" style="color:#FFD700;font-weight:bold;">💰 20</div>
      </div>
      <div id="timer-display" style="color:#45A29E;font-size:14px;"></div>
      <div id="right-status" style="display:flex;gap:12px;align-items:center;">
        <div id="right-resources" style="color:#FFD700;font-weight:bold;">💰 20</div>
        <div id="right-hp-text" style="color:#66FF88;font-size:12px;">100/100</div>
        <div id="right-hp-bar" style="width:120px;height:16px;background:rgba(0,0,0,0.4);border-radius:8px;overflow:hidden;">
          <div id="right-hp-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#44FF88,#00AA44);border-radius:8px;transition:width 0.3s;"></div>
        </div>
        <div style="color:#FF4444;font-weight:bold;">RIGHT BASE</div>
      </div>
    `;
    this.container.appendChild(topBar);

    const mainArea = document.createElement('div');
    mainArea.style.cssText = `
      display: flex; flex: 1; position: relative;
    `;

    const leftPanel = document.createElement('div');
    leftPanel.id = 'tower-panel';
    leftPanel.style.cssText = `
      width: 140px; padding: 12px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px;
      background: rgba(31, 40, 51, 0.8); border-right: 1px solid rgba(69, 162, 158, 0.2);
    `;

    const towerLabel = document.createElement('div');
    towerLabel.textContent = '⚔️ TOWERS';
    towerLabel.style.cssText = 'color:#45A29E;font-weight:bold;margin-bottom:8px;font-size:13px;';
    leftPanel.appendChild(towerLabel);

    const towerBtnContainer = document.createElement('div');
    towerBtnContainer.style.cssText = `
      display: grid; grid-template-columns: 1fr; gap: 10px; width: 100%;
    `;

    const towerTypes = [TowerType.Arrow, TowerType.Cannon, TowerType.Freeze];
    const towerNames = ['🏹 Arrow', '💣 Cannon', '❄️ Freeze'];
    const towerColors = ['#4488FF', '#FF4444', '#FFFFFF'];

    towerTypes.forEach((type, i) => {
      const config = TOWER_CONFIGS[type];
      const btn = document.createElement('button');
      btn.id = `tower-btn-${type}`;
      btn.style.cssText = `
        width: 100%; padding: 10px 4px; border: 2px solid ${towerColors[i]}44;
        background: rgba(0,0,0,0.3); color: ${towerColors[i]}; cursor: pointer;
        border-radius: 8px; font-size: 12px; font-weight: bold;
        transition: all 0.2s; text-align: center;
      `;
      btn.innerHTML = `<div>${towerNames[i]}</div><div style="color:#FFD700;font-size:10px;">Cost: ${config.cost}</div>`;

      btn.addEventListener('mouseenter', () => this.showTooltip(type, btn));
      btn.addEventListener('mouseleave', () => this.hideTooltip());

      btn.addEventListener('click', () => {
        if (this.selectedTowerType === type) {
          this.selectedTowerType = null;
        } else {
          this.selectedTowerType = type;
          this.selectedTowerId = null;
          this.hideUpgradePanel();
        }
        this.updateTowerButtons();
      });

      towerBtnContainer.appendChild(btn);
    });

    leftPanel.appendChild(towerBtnContainer);
    mainArea.appendChild(leftPanel);

    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvas-container';
    canvasContainer.style.cssText = `
      flex: 1; display: flex; align-items: center; justify-content: center;
      position: relative;
    `;
    mainArea.appendChild(canvasContainer);

    const rightPanel = document.createElement('div');
    rightPanel.id = 'monster-panel';
    rightPanel.style.cssText = `
      width: 140px; padding: 12px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px;
      background: rgba(31, 40, 51, 0.8); border-left: 1px solid rgba(69, 162, 158, 0.2);
    `;

    const monsterLabel = document.createElement('div');
    monsterLabel.textContent = '👹 SPAWN';
    monsterLabel.style.cssText = 'color:#45A29E;font-weight:bold;margin-bottom:8px;font-size:13px;';
    rightPanel.appendChild(monsterLabel);

    const monsterTypes = [MonsterType.Basic, MonsterType.Elite, MonsterType.Fast];
    const monsterNames = ['🟤 Basic', '🟠 Elite', '🟢 Fast'];
    const monsterColors = ['#888888', '#FF8800', '#44FF44'];

    monsterTypes.forEach((type, i) => {
      const config = MONSTER_CONFIGS[type];
      const btn = document.createElement('button');
      btn.id = `monster-btn-${type}`;
      btn.style.cssText = `
        width: 100%; padding: 10px 4px; border: 2px solid ${monsterColors[i]}44;
        background: rgba(0,0,0,0.3); color: ${monsterColors[i]}; cursor: pointer;
        border-radius: 8px; font-size: 12px; font-weight: bold;
        transition: all 0.2s; text-align: center;
      `;
      btn.innerHTML = `<div>${monsterNames[i]}</div><div style="color:#FFD700;font-size:10px;">${config.cost > 0 ? `Cost: ${config.cost}` : 'Free'}</div>`;

      btn.addEventListener('click', () => {
        this.callbacks.onSpawnMonster(type);
      });

      rightPanel.appendChild(btn);
    });

    mainArea.appendChild(rightPanel);
    this.container.appendChild(mainArea);

    const upgradePanel = document.createElement('div');
    upgradePanel.id = 'upgrade-panel';
    upgradePanel.style.cssText = `
      display: none; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(31, 40, 51, 0.95); border: 1px solid rgba(69, 162, 158, 0.5);
      border-radius: 12px; padding: 16px; z-index: 100; text-align: center;
    `;
    upgradePanel.innerHTML = `
      <div id="upgrade-info" style="color:#C5C6C7;margin-bottom:8px;font-size:13px;"></div>
      <button id="upgrade-btn" style="padding:8px 20px;background:#FFD700;color:#000;border:none;
        border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">⬆️ Upgrade</button>
      <button id="close-upgrade-btn" style="padding:8px 12px;background:transparent;color:#888;
        border:1px solid #888;border-radius:6px;cursor:pointer;margin-left:8px;font-size:12px;">✕</button>
    `;
    document.body.appendChild(upgradePanel);

    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      if (this.selectedTowerId) {
        this.callbacks.onUpgradeTower(this.selectedTowerId);
        this.selectedTowerId = null;
        this.hideUpgradePanel();
      }
    });

    document.getElementById('close-upgrade-btn')?.addEventListener('click', () => {
      this.selectedTowerId = null;
      this.hideUpgradePanel();
    });

    const gameOverOverlay = document.createElement('div');
    gameOverOverlay.id = 'game-over-overlay';
    gameOverOverlay.style.cssText = `
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 200; display: none;
      align-items: center; justify-content: center; flex-direction: column;
    `;
    gameOverOverlay.innerHTML = `
      <div id="game-over-text" style="font-size:48px;font-weight:bold;margin-bottom:20px;"></div>
      <button id="restart-btn" style="padding:12px 30px;background:#45A29E;color:#000;border:none;
        border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">🔄 Restart</button>
    `;
    document.body.appendChild(gameOverOverlay);

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.callbacks.onRestart();
      const overlay = document.getElementById('game-over-overlay');
      if (overlay) overlay.style.display = 'none';
    });
  }

  getCanvasContainer(): HTMLElement | null {
    return document.getElementById('canvas-container');
  }

  private updateStatusBars() {
    if (!this.gameState) return;

    const left = this.gameState.players[PlayerSide.Left];
    const right = this.gameState.players[PlayerSide.Right];

    const leftHpFill = document.getElementById('left-hp-fill');
    const leftHpText = document.getElementById('left-hp-text');
    const leftRes = document.getElementById('left-resources');
    const rightHpFill = document.getElementById('right-hp-fill');
    const rightHpText = document.getElementById('right-hp-text');
    const rightRes = document.getElementById('right-resources');

    if (leftHpFill) leftHpFill.style.width = `${Math.max(0, left.hp)}%`;
    if (leftHpText) leftHpText.textContent = `${Math.max(0, left.hp)}/100`;
    if (leftRes) leftRes.textContent = `💰 ${Math.floor(left.resources)}`;
    if (rightHpFill) rightHpFill.style.width = `${Math.max(0, right.hp)}%`;
    if (rightHpText) rightHpText.textContent = `${Math.max(0, right.hp)}/100`;
    if (rightRes) rightRes.textContent = `💰 ${Math.floor(right.resources)}`;

    if (this.gameState.gameOver) {
      this.showGameOver(this.gameState.winner);
    }
  }

  private updateMonsterButtons() {
    if (!this.gameState || !this.playerSide) return;

    const resources = this.gameState.players[this.playerSide].resources;

    const eliteBtn = document.getElementById(`monster-btn-${MonsterType.Elite}`);
    const fastBtn = document.getElementById(`monster-btn-${MonsterType.Fast}`);

    if (eliteBtn) {
      const cost = MONSTER_CONFIGS[MonsterType.Elite].cost;
      if (resources < cost) {
        eliteBtn.style.borderColor = '#FF000066';
        eliteBtn.style.opacity = '0.5';
        eliteBtn.style.cursor = 'not-allowed';
      } else {
        eliteBtn.style.borderColor = '#FF880044';
        eliteBtn.style.opacity = '1';
        eliteBtn.style.cursor = 'pointer';
      }
    }

    if (fastBtn) {
      const cost = MONSTER_CONFIGS[MonsterType.Fast].cost;
      if (resources < cost) {
        fastBtn.style.borderColor = '#FF000066';
        fastBtn.style.opacity = '0.5';
        fastBtn.style.cursor = 'not-allowed';
      } else {
        fastBtn.style.borderColor = '#44FF4444';
        fastBtn.style.opacity = '1';
        fastBtn.style.cursor = 'pointer';
      }
    }
  }

  private updateTowerButtons() {
    [TowerType.Arrow, TowerType.Cannon, TowerType.Freeze].forEach(type => {
      const btn = document.getElementById(`tower-btn-${type}`);
      if (!btn) return;

      if (this.selectedTowerType === type) {
        btn.style.background = 'rgba(69, 162, 158, 0.3)';
        btn.style.borderColor = '#45A29E';
        btn.style.boxShadow = '0 0 10px rgba(69, 162, 158, 0.5)';
      } else {
        btn.style.background = 'rgba(0,0,0,0.3)';
        btn.style.borderColor = `${type === TowerType.Arrow ? '#4488FF' : type === TowerType.Cannon ? '#FF4444' : '#FFFFFF'}44`;
        btn.style.boxShadow = 'none';
      }
    });
  }

  private showTooltip(towerType: TowerType, anchor: HTMLElement) {
    this.hideTooltip();

    const config = TOWER_CONFIGS[towerType];
    const tooltip = document.createElement('div');
    tooltip.className = 'tower-tooltip';
    tooltip.style.cssText = `
      position: fixed; background: rgba(255,255,255,0.7); color: #1F2833;
      padding: 10px 14px; border-radius: 8px; font-size: 12px; z-index: 150;
      pointer-events: none; min-width: 160px;
    `;

    const names: Record<TowerType, string> = {
      [TowerType.Arrow]: 'Arrow Tower',
      [TowerType.Cannon]: 'Cannon Tower',
      [TowerType.Freeze]: 'Freeze Tower',
    };

    tooltip.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;">${names[towerType]}</div>
      <div>Damage: ${config.damage}</div>
      <div>Range: ${config.range} cells</div>
      <div>Cooldown: ${config.cooldown / 1000}s</div>
      <div>Cost: ${config.cost} resources</div>
      ${towerType === TowerType.Freeze ? '<div>Slow: 50% for 2s</div>' : ''}
    `;

    const rect = anchor.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 8}px`;
    tooltip.style.top = `${rect.top}px`;

    document.body.appendChild(tooltip);
    this.tooltipEl = tooltip;
  }

  private hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }

  private showUpgradePanel(tower: Tower) {
    const panel = document.getElementById('upgrade-panel');
    const info = document.getElementById('upgrade-info');
    const btn = document.getElementById('upgrade-btn');

    if (!panel || !info || !btn) return;

    const config = TOWER_CONFIGS[tower.type];
    const upgradeCost = Math.floor(config.cost * 0.6);
    const upgradedDamage = Math.floor(config.damage * 1.4);

    info.innerHTML = `
      ${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)} Tower Lv.${tower.level}<br/>
      Upgrade: +40% damage & attack speed<br/>
      <span style="color:#FFD700;">Cost: ${upgradeCost} resources</span>
    `;

    if (this.gameState && this.playerSide) {
      const resources = this.gameState.players[this.playerSide].resources;
      if (resources < upgradeCost || tower.level >= 2) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }

    panel.style.display = 'block';
  }

  private hideUpgradePanel() {
    const panel = document.getElementById('upgrade-panel');
    if (panel) panel.style.display = 'none';
  }

  showGameOver(winner: PlayerSide | null) {
    const overlay = document.getElementById('game-over-overlay');
    const text = document.getElementById('game-over-text');
    if (!overlay || !text) return;

    if (winner === this.playerSide) {
      text.textContent = '🏆 VICTORY!';
      text.style.color = '#FFD700';
    } else {
      text.textContent = '💀 DEFEAT';
      text.style.color = '#888888';
    }

    overlay.style.display = 'flex';
  }

  hideGameOver() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.style.display = 'none';
  }
}
