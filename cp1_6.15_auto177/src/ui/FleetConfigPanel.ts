import type { ShipConfig, Faction } from '../engine/Ship';
import { GameEngine } from '../engine/GameEngine';

export interface FleetConfigPanelOptions {
  container: HTMLElement;
  engine: GameEngine;
  onConfigChange?: (playerShips: ShipConfig[], enemyShips: ShipConfig[]) => void;
}

export class FleetConfigPanel {
  private container: HTMLElement;
  private engine: GameEngine;
  private onConfigChange?: (playerShips: ShipConfig[], enemyShips: ShipConfig[]) => void;

  private playerShips: ShipConfig[] = [];
  private enemyShips: ShipConfig[] = [];
  private currentFaction: Faction = 'player';
  private selectedShipId: string | null = null;

  private shipIdCounter = 0;

  constructor(options: FleetConfigPanelOptions) {
    this.container = options.container;
    this.engine = options.engine;
    this.onConfigChange = options.onConfigChange;

    this.initDefaultShips();
    this.render();
  }

  private initDefaultShips(): void {
    const defaultShipCount = 5;

    for (let i = 0; i < defaultShipCount; i++) {
      this.playerShips.push(this.createDefaultShipConfig('player', i));
      this.enemyShips.push(this.createDefaultShipConfig('enemy', i));
    }

    this.updateEngine();
  }

  private createDefaultShipConfig(faction: Faction, index: number): ShipConfig {
    const x = faction === 'player' ? 100 + index * 30 : 800 - index * 30;
    const y = 200 + index * 50;

    return {
      id: `${faction}_ship_${this.shipIdCounter++}`,
      name: `${faction === 'player' ? '己方' : '敌方'}战舰-${index + 1}`,
      faction,
      maxHealth: 100,
      maxShield: 50,
      weaponDamage: 10,
      weaponFireRate: 2,
      weaponRange: 200,
      moveSpeed: 60,
      x,
      y
    };
  }

  public render(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'panel-section';

    const title = document.createElement('h3');
    title.textContent = '舰队配置';
    wrapper.appendChild(title);

    const factionToggle = this.createFactionToggle();
    wrapper.appendChild(factionToggle);

    const addShipBtn = document.createElement('button');
    addShipBtn.textContent = `添加${this.currentFaction === 'player' ? '己方' : '敌方'}战舰`;
    addShipBtn.style.cssText = `
      width: 100%;
      background: transparent;
      border: 1px solid #00d4aa;
      color: #00d4aa;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      margin-bottom: 12px;
      transition: all 0.2s;
    `;
    addShipBtn.addEventListener('click', () => this.addShip());
    addShipBtn.addEventListener('mouseenter', () => {
      addShipBtn.style.background = '#00d4aa20';
    });
    addShipBtn.addEventListener('mouseleave', () => {
      addShipBtn.style.background = 'transparent';
    });
    wrapper.appendChild(addShipBtn);

    const shipList = this.createShipList();
    wrapper.appendChild(shipList);

    if (this.selectedShipId) {
      const editor = this.createShipEditor();
      if (editor) {
        wrapper.appendChild(editor);
      }
    }

    this.container.appendChild(wrapper);
    this.addRippleEffect(this.container);
  }

  private createFactionToggle(): HTMLElement {
    const toggle = document.createElement('div');
    toggle.className = 'faction-toggle';

    const playerBtn = document.createElement('button');
    playerBtn.textContent = `己方舰队 (${this.playerShips.length})`;
    playerBtn.className = this.currentFaction === 'player' ? 'active player' : '';
    playerBtn.addEventListener('click', () => {
      this.currentFaction = 'player';
      this.selectedShipId = null;
      this.render();
    });

    const enemyBtn = document.createElement('button');
    enemyBtn.textContent = `敌方舰队 (${this.enemyShips.length})`;
    enemyBtn.className = this.currentFaction === 'enemy' ? 'active enemy' : '';
    enemyBtn.addEventListener('click', () => {
      this.currentFaction = 'enemy';
      this.selectedShipId = null;
      this.render();
    });

    toggle.appendChild(playerBtn);
    toggle.appendChild(enemyBtn);

    return toggle;
  }

  private createShipList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'ship-list';

    const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;

    if (ships.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 12px;';
      emptyMsg.textContent = '暂无战舰，点击上方按钮添加';
      list.appendChild(emptyMsg);
      return list;
    }

    ships.forEach((ship) => {
      const item = document.createElement('div');
      item.className = `ship-item ${this.selectedShipId === ship.id ? 'selected' : ''}`;

      const engineShip = this.engine.getShips().find(s => s.state.id === ship.id);
      if (engineShip?.state.isDestroyed) {
        item.classList.add('destroyed');
      }

      const shipColor = this.currentFaction === 'player' ? '#4a90d9' : '#d94a4a';
      item.innerHTML = `
        <span style="display:inline-block;width:10px;height:10px;background:${shipColor};border-radius:50%;margin-right:8px;"></span>
        ${ship.name}
      `;

      item.addEventListener('click', () => {
        this.selectedShipId = ship.id;
        this.render();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText = `
        float: right;
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
        transition: color 0.2s;
      `;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeShip(ship.id);
      });
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.color = '#d94a4a';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.color = '#666';
      });
      item.appendChild(deleteBtn);

      list.appendChild(item);
    });

    return list;
  }

  private createShipEditor(): HTMLElement | null {
    const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;
    const ship = ships.find(s => s.id === this.selectedShipId);
    if (!ship) return null;

    const editor = document.createElement('div');
    editor.style.marginTop = '16px';
    editor.style.borderTop = '1px solid #00d4aa20';
    editor.style.paddingTop = '16px';

    const title = document.createElement('h4');
    title.style.color = '#00d4aa';
    title.style.marginBottom = '12px';
    title.style.fontSize = '14px';
    title.textContent = `编辑: ${ship.name}`;
    editor.appendChild(title);

    editor.appendChild(this.createNameInput(ship));
    editor.appendChild(this.createSliderInput('生命值', 'maxHealth', ship.maxHealth, 10, 500, 10));
    editor.appendChild(this.createSliderInput('护盾值', 'maxShield', ship.maxShield, 0, 300, 10));
    editor.appendChild(this.createSliderInput('武器伤害', 'weaponDamage', ship.weaponDamage, 1, 50, 1));
    editor.appendChild(this.createSliderInput('射击速度', 'weaponFireRate', ship.weaponFireRate, 0.5, 10, 0.1));
    editor.appendChild(this.createSliderInput('武器射程', 'weaponRange', ship.weaponRange, 50, 500, 10));
    editor.appendChild(this.createSliderInput('移动速度', 'moveSpeed', ship.moveSpeed, 10, 200, 10));
    editor.appendChild(this.createSliderInput('X 位置', 'x', ship.x, 15, 885, 1));
    editor.appendChild(this.createSliderInput('Y 位置', 'y', ship.y, 15, 585, 1));

    return editor;
  }

  private createNameInput(ship: ShipConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = '名称';
    group.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = ship.name;
    input.style.width = '100%';
    input.style.background = '#0a0a1a';
    input.style.border = '1px solid #00d4aa40';
    input.style.color = '#fff';
    input.style.padding = '6px 8px';
    input.style.borderRadius = '4px';
    input.style.fontSize = '13px';

    input.addEventListener('change', () => {
      ship.name = input.value;
      this.updateEngine();
      this.render();
    });

    group.appendChild(input);
    return group;
  }

  private createSliderInput(
    labelText: string,
    field: keyof ShipConfig,
    value: number,
    min: number,
    max: number,
    step: number
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.innerHTML = `${labelText} <span class="value-display">${value}</span>`;
    group.appendChild(label);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = value.toString();

    input.addEventListener('input', () => {
      const newValue = parseFloat(input.value);
      const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;
      const ship = ships.find(s => s.id === this.selectedShipId);
      if (ship) {
        (ship as any)[field] = newValue;
        label.querySelector('.value-display')!.textContent = newValue.toString();
      }
    });

    input.addEventListener('change', () => {
      this.updateEngine();

      if (this.engine.getIsPaused()) {
        if (this.selectedShipId) {
          if (field === 'x' || field === 'y') {
            const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;
            const ship = ships.find(s => s.id === this.selectedShipId);
            if (ship) {
              this.engine.updateShipPosition(this.selectedShipId, ship.x, ship.y);
            }
          } else if (field === 'maxHealth') {
            this.engine.updateShipHealth(this.selectedShipId, parseFloat(input.value));
          } else if (field === 'maxShield') {
            this.engine.updateShipShield(this.selectedShipId, parseFloat(input.value));
          }
        }
      }
    });

    group.appendChild(input);
    return group;
  }

  private addShip(): void {
    const totalShips = this.playerShips.length + this.enemyShips.length;
    if (totalShips >= 30) {
      alert('舰船数量已达上限（30艘）');
      return;
    }

    const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;
    const newShip = this.createDefaultShipConfig(this.currentFaction, ships.length);
    ships.push(newShip);
    this.selectedShipId = newShip.id;

    this.updateEngine();
    this.render();
  }

  private removeShip(shipId: string): void {
    const ships = this.currentFaction === 'player' ? this.playerShips : this.enemyShips;
    const index = ships.findIndex(s => s.id === shipId);
    if (index !== -1) {
      ships.splice(index, 1);
      if (this.selectedShipId === shipId) {
        this.selectedShipId = null;
      }
      this.updateEngine();
      this.render();
    }
  }

  private updateEngine(): void {
    this.engine.initFleet([...this.playerShips], [...this.enemyShips]);
    this.onConfigChange?.(this.playerShips, this.enemyShips);
  }

  public getPlayerShips(): ShipConfig[] {
    return [...this.playerShips];
  }

  public getEnemyShips(): ShipConfig[] {
    return [...this.enemyShips];
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
