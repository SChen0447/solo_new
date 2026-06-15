import type { BattleReport } from '../engine/GameEngine';
import { GameEngine } from '../engine/GameEngine';

export interface ReportPanelOptions {
  container: HTMLElement;
  engine: GameEngine;
}

export class ReportPanel {
  private container: HTMLElement;
  private engine: GameEngine;
  private report: BattleReport | null = null;

  private isReplaying = false;

  constructor(options: ReportPanelOptions) {
    this.container = options.container;
    this.engine = options.engine;
    this.render();
  }

  public setReport(report: BattleReport): void {
    this.report = report;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'panel-section';

    const title = document.createElement('h3');
    title.textContent = '战斗信息';
    wrapper.appendChild(title);

    if (this.report) {
      wrapper.appendChild(this.createBattleSummary());
      wrapper.appendChild(this.createShipStats());
      wrapper.appendChild(this.createReplayControls());
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 12px;';
      placeholder.textContent = '战斗结束后将显示战报';
      wrapper.appendChild(placeholder);
    }

    this.container.appendChild(wrapper);
    this.addRippleEffect(this.container);
  }

  private createBattleSummary(): HTMLElement {
    const summary = document.createElement('div');

    const winnerText = this.report!.winner === 'player' ? '己方胜利' :
                       this.report!.winner === 'enemy' ? '敌方胜利' : '平局';
    const winnerColor = this.report!.winner === 'player' ? '#4a90d9' :
                        this.report!.winner === 'enemy' ? '#d94a4a' : '#00d4aa';

    const winnerRow = document.createElement('div');
    winnerRow.style.cssText = 'text-align: center; margin-bottom: 16px;';
    winnerRow.innerHTML = `
      <div style="font-size: 24px; color: ${winnerColor}; font-weight: bold; text-shadow: 0 0 10px ${winnerColor};">
        ${winnerText}
      </div>
    `;
    summary.appendChild(winnerRow);

    const stats = document.createElement('div');
    stats.innerHTML = `
      <div class="stat-row">
        <span class="label">战斗时长</span>
        <span class="value">${this.formatTime(this.report!.duration)}</span>
      </div>
      <div class="stat-row">
        <span class="label">己方击杀</span>
        <span class="value" style="color: #4a90d9;">${this.report!.playerKills}</span>
      </div>
      <div class="stat-row">
        <span class="label">敌方击杀</span>
        <span class="value" style="color: #d94a4a;">${this.report!.enemyKills}</span>
      </div>
      <div class="stat-row">
        <span class="label">己方剩余</span>
        <span class="value" style="color: #4a90d9;">${this.report!.playerRemaining}</span>
      </div>
      <div class="stat-row">
        <span class="label">敌方剩余</span>
        <span class="value" style="color: #d94a4a;">${this.report!.enemyRemaining}</span>
      </div>
    `;
    summary.appendChild(stats);

    return summary;
  }

  private createShipStats(): HTMLElement {
    const container = document.createElement('div');
    container.style.marginTop = '16px';

    const title = document.createElement('h4');
    title.style.color = '#00d4aa';
    title.style.marginBottom = '8px';
    title.style.fontSize = '14px';
    title.textContent = '舰船统计';
    container.appendChild(title);

    const list = document.createElement('div');
    list.style.maxHeight = '150px';
    list.style.overflowY = 'auto';
    list.style.border = '1px solid #00d4aa20';
    list.style.borderRadius = '4px';

    const sortedStats = [...this.report!.shipStats].sort((a, b) => b.kills - a.kills);

    sortedStats.forEach((stat, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        border-bottom: 1px solid #00d4aa10;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const factionColor = stat.faction === 'player' ? '#4a90d9' : '#d94a4a';
      const survivedText = stat.survived ? '存活' : '击毁';
      const survivedColor = stat.survived ? '#4ade80' : '#ef4444';

      item.innerHTML = `
        <div>
          <span style="display:inline-block;width:8px;height:8px;background:${factionColor};border-radius:50%;margin-right:6px;"></span>
          <span style="color: #ccc;">${index + 1}.</span>
          <span style="margin-left: 4px;">${stat.name}</span>
        </div>
        <div style="text-align: right;">
          <span style="color: #00d4aa; margin-right: 8px;">${stat.kills}杀</span>
          <span style="color: ${survivedColor};">${survivedText}</span>
        </div>
      `;

      list.appendChild(item);
    });

    container.appendChild(list);
    return container;
  }

  private createReplayControls(): HTMLElement {
    const container = document.createElement('div');
    container.style.marginTop = '16px';

    const title = document.createElement('h4');
    title.style.color = '#00d4aa';
    title.style.marginBottom = '8px';
    title.style.fontSize = '14px';
    title.textContent = '战报回放';
    container.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'replay-controls';

    const stepBackBtn = document.createElement('button');
    stepBackBtn.innerHTML = '◀◀';
    stepBackBtn.title = '后退一帧';
    stepBackBtn.addEventListener('click', () => {
      if (this.engine.getIsReplaying()) {
        this.engine.stepReplay(false);
        this.updateReplayTime();
      }
    });

    const playPauseBtn = document.createElement('button');
    playPauseBtn.innerHTML = this.isReplaying ? '⏸' : '▶';
    playPauseBtn.id = 'replayPlayBtn';
    playPauseBtn.title = '播放/暂停';
    playPauseBtn.addEventListener('click', () => this.toggleReplay());

    const stepForwardBtn = document.createElement('button');
    stepForwardBtn.innerHTML = '▶▶';
    stepForwardBtn.title = '前进一帧';
    stepForwardBtn.addEventListener('click', () => {
      if (this.engine.getIsReplaying()) {
        this.engine.stepReplay(true);
        this.updateReplayTime();
      }
    });

    const restartBtn = document.createElement('button');
    restartBtn.innerHTML = '⟲';
    restartBtn.title = '重新开始';
    restartBtn.addEventListener('click', () => {
      this.startReplay();
    });

    controls.appendChild(stepBackBtn);
    controls.appendChild(playPauseBtn);
    controls.appendChild(stepForwardBtn);
    controls.appendChild(restartBtn);

    container.appendChild(controls);

    const speedControl = document.createElement('div');
    speedControl.className = 'form-group';
    speedControl.style.marginTop = '12px';
    speedControl.innerHTML = `
      <label>回放速度 <span class="value-display" id="replaySpeedValue">1.0x</span></label>
      <input type="range" min="0.25" max="4" step="0.25" value="1" id="replaySpeedSlider">
    `;
    container.appendChild(speedControl);

    const speedSlider = speedControl.querySelector('#replaySpeedSlider') as HTMLInputElement;
    const speedValue = speedControl.querySelector('#replaySpeedValue') as HTMLElement;
    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = speed.toFixed(1) + 'x';
      this.engine.setReplaySpeed(speed);
    });

    const timeline = document.createElement('div');
    timeline.className = 'replay-timeline';
    timeline.innerHTML = `
      <input type="range" min="0" max="${this.report!.duration}" step="100" value="0" id="replayTimeline">
      <div class="replay-time" id="replayTimeDisplay">0.0s / ${(this.report!.duration / 1000).toFixed(1)}s</div>
    `;
    container.appendChild(timeline);

    const timelineSlider = timeline.querySelector('#replayTimeline') as HTMLInputElement;
    timelineSlider.addEventListener('input', () => {
      const time = parseFloat(timelineSlider.value);
      this.engine.seekReplay(time);
      this.updateReplayTime();
    });

    if (!this.engine.getIsReplaying() && this.engine.getFrameHistory().length > 0) {
      this.startReplay();
    }

    return container;
  }

  private startReplay(): void {
    this.isReplaying = true;
    this.engine.startReplay();
    this.updatePlayButton();
    this.updateReplayTime();

    const updateInterval = setInterval(() => {
      if (!this.engine.getIsReplaying()) {
        clearInterval(updateInterval);
        this.isReplaying = false;
        this.updatePlayButton();
        return;
      }
      this.updateReplayTime();
    }, 100);
  }

  private toggleReplay(): void {
    if (this.engine.getIsReplaying()) {
      this.engine.stopReplay();
      this.isReplaying = false;
    } else {
      this.startReplay();
    }
    this.updatePlayButton();
  }

  private updatePlayButton(): void {
    const btn = document.getElementById('replayPlayBtn');
    if (btn) {
      btn.innerHTML = this.isReplaying ? '⏸' : '▶';
    }
  }

  private updateReplayTime(): void {
    const time = this.engine.getReplayTime();
    const duration = this.engine.getReplayDuration();

    const timeline = document.getElementById('replayTimeline') as HTMLInputElement;
    const timeDisplay = document.getElementById('replayTimeDisplay');

    if (timeline) {
      timeline.max = duration.toString();
      timeline.value = time.toString();
    }

    if (timeDisplay && this.report) {
      timeDisplay.textContent = `${(time / 1000).toFixed(1)}s / ${(this.report.duration / 1000).toFixed(1)}s`;
    }
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  public refresh(): void {
    this.render();
  }

  private addRippleEffect(container: HTMLElement): void {
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - rect.left).toString() + 'px';
        ripple.style.top = (e.clientY - rect.top).toString() + 'px';
        btn.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }
}
