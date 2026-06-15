import { GameEngine, type BattleReport, type FrameState } from './engine/GameEngine';
import type { Formation } from './engine/Ship';
import { FleetConfigPanel } from './ui/FleetConfigPanel';
import { BattleRenderer } from './ui/BattleRenderer';
import { ReportPanel } from './ui/ReportPanel';

class Application {
  private engine: GameEngine;
  private renderer: BattleRenderer;
  private configPanel: FleetConfigPanel;
  private reportPanel: ReportPanel;
  private configPanelMobile: FleetConfigPanel;
  private reportPanelMobile: ReportPanel;

  private canvas: HTMLCanvasElement;
  private pauseOverlay: HTMLElement;

  constructor() {
    const battlefieldWidth = 900;
    const battlefieldHeight = 600;

    this.engine = new GameEngine(battlefieldWidth, battlefieldHeight);

    this.canvas = document.getElementById('battleCanvas') as HTMLCanvasElement;
    this.renderer = new BattleRenderer({
      canvas: this.canvas,
      width: battlefieldWidth,
      height: battlefieldHeight
    });

    this.pauseOverlay = document.getElementById('pauseOverlay') as HTMLElement;

    const configPanelContainer = document.getElementById('configPanel') as HTMLElement;
    const reportPanelContainer = document.getElementById('reportPanel') as HTMLElement;
    const configPanelMobileContainer = document.getElementById('configPanelMobile') as HTMLElement;
    const reportPanelMobileContainer = document.getElementById('reportPanelMobile') as HTMLElement;

    this.configPanel = new FleetConfigPanel({
      container: configPanelContainer,
      engine: this.engine,
      onConfigChange: () => this.renderInitialState()
    });

    this.reportPanel = new ReportPanel({
      container: reportPanelContainer,
      engine: this.engine
    });

    this.configPanelMobile = new FleetConfigPanel({
      container: configPanelMobileContainer,
      engine: this.engine,
      onConfigChange: () => this.renderInitialState()
    });

    this.reportPanelMobile = new ReportPanel({
      container: reportPanelMobileContainer,
      engine: this.engine
    });

    this.setupEventListeners();
    this.setupEngineEvents();
    this.renderInitialState();
    this.addRippleEffect();
  }

  private setupEventListeners(): void {
    const startBattleBtn = document.getElementById('startBattleBtn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const formationSelect = document.getElementById('formationSelect') as HTMLSelectElement;

    startBattleBtn.addEventListener('click', () => this.startBattle());
    pauseBtn.addEventListener('click', () => this.togglePause());
    resetBtn.addEventListener('click', () => this.resetBattle());

    formationSelect.addEventListener('change', (e) => {
      const formation = (e.target as HTMLSelectElement).value as Formation;
      this.applyFormation(formation);
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  private setupEngineEvents(): void {
    this.engine.setEvents({
      onBattleStart: () => this.onBattleStart(),
      onBattleEnd: (report: BattleReport) => this.onBattleEnd(report),
      onShipDestroyed: (ship, killer) => this.onShipDestroyed(ship, killer),
      onFrame: (state: FrameState) => this.onFrame(state)
    });
  }

  private startBattle(): void {
    if (this.engine.getIsRunning()) {
      alert('战斗已在进行中');
      return;
    }

    const playerShips = this.configPanel.getPlayerShips();
    const enemyShips = this.configPanel.getEnemyShips();

    if (playerShips.length === 0 || enemyShips.length === 0) {
      alert('双方舰队都需要至少一艘战舰');
      return;
    }

    this.engine.initFleet(playerShips, enemyShips);
    this.engine.startBattle();
  }

  private togglePause(): void {
    if (!this.engine.getIsRunning()) return;

    if (this.engine.getIsPaused()) {
      this.engine.resumeBattle();
      this.pauseOverlay.classList.remove('active');
    } else {
      this.engine.pauseBattle();
      this.pauseOverlay.classList.add('active');
      this.configPanel.refresh();
      this.configPanelMobile.refresh();
    }
  }

  private resetBattle(): void {
    this.engine.reset();
    this.pauseOverlay.classList.remove('active');

    const playerShips = this.configPanel.getPlayerShips();
    const enemyShips = this.configPanel.getEnemyShips();
    this.engine.initFleet(playerShips, enemyShips);

    this.configPanel.refresh();
    this.configPanelMobile.refresh();
    this.reportPanel.refresh();
    this.reportPanelMobile.refresh();

    this.renderInitialState();
  }

  private applyFormation(formation: Formation): void {
    this.engine.applyFormation('player', formation);
    this.engine.applyFormation('enemy', formation);

    this.configPanel.refresh();
    this.configPanelMobile.refresh();
    this.renderInitialState();
  }

  private onBattleStart(): void {
    this.pauseOverlay.classList.remove('active');
  }

  private onBattleEnd(report: BattleReport): void {
    this.pauseOverlay.classList.remove('active');
    this.reportPanel.setReport(report);
    this.reportPanelMobile.setReport(report);
  }

  private onShipDestroyed(_ship: any, _killer: any): void {
    this.configPanel.refresh();
    this.configPanelMobile.refresh();
  }

  private onFrame(state: FrameState): void {
    this.renderer.render(state);
  }

  private renderInitialState(): void {
    const ships = this.engine.getShips().map(s => s.toJSON());
    this.renderer.render({
      timestamp: 0,
      ships,
      projectiles: [],
      explosions: []
    });
  }

  private handleResize(): void {
    if (window.innerWidth > 768) {
      this.canvas.width = 900;
      this.canvas.height = 600;
      this.renderer.resize(900, 600);
    }
  }

  private addRippleEffect(): void {
    const buttons = document.querySelectorAll('.command-bar button, .command-bar select');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e: any) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - rect.left).toString() + 'px';
        ripple.style.top = (e.clientY - rect.top).toString() + 'px';
        (e.target as HTMLElement).appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Application();
});
