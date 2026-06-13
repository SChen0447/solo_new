import type * as THREE from 'three';
import { GraphManager, type GraphNodeData, type OwnerType } from '../network/GraphManager';
import type { Renderer3D } from '../network/Renderer3D';
import type { UIManager } from './UIManager';

export type ScriptType = 'crack' | 'firewall' | 'stealth';

export type GamePhase = 'player' | 'ai' | 'final' | 'gameover';

export interface GameStateSnapshot {
  turn: number;
  phase: GamePhase;
  energy: number;
  maxEnergy: number;
  playerNodeCount: number;
  aiNodeCount: number;
  neutralNodeCount: number;
  coreOwner: OwnerType | null;
  playerPosition: string | null;
  stealthActive: boolean;
  selectedScript: ScriptType | null;
}

export interface GameState {
  graph: GraphManager;
  turn: number;
  phase: GamePhase;
  energy: number;
  maxEnergy: number;
  playerPosition: string | null;
  stealthActive: boolean;
  selectedScript: ScriptType | null;
  selectedScriptCrack: boolean;

  getSnapshot(): GameStateSnapshot;
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload?: unknown) => void): void;
  logAIAction(timestamp: string, action: string, detail: string): void;

  useScript(script: ScriptType, targetNodeId?: string): boolean;
  attackNode(targetNodeId: string, useCrack?: boolean): boolean;
  dropCoreAt(nodeId: string): boolean;
  cancelDrag(): void;
  reset(): void;
}

const SCRIPT_COSTS: Record<ScriptType, number> = {
  crack: 3,
  firewall: 2,
  stealth: 4,
};

export class PlayerController {
  private gameState: GameState;
  private renderer3D: Renderer3D;
  private uiManager: UIManager;

  private isDraggingCore = false;
  private dragStartScreenPos: { x: number; y: number } | null = null;

  constructor(
    gameState: GameState,
    renderer3D: Renderer3D,
    uiManager: UIManager
  ) {
    this.gameState = gameState;
    this.renderer3D = renderer3D;
    this.uiManager = uiManager;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.renderer3D.on('node:click', (payload: unknown) => {
      this.handleNodeClick(payload as { nodeId: string; screenX: number; screenY: number });
    });

    this.renderer3D.on('mouse:move', (payload: unknown) => {
      this.handleMouseMove(payload as { screenX: number; screenY: number });
    });

    this.renderer3D.on('mouse:up', (payload: unknown) => {
      this.handleMouseUp(payload as { screenX: number; screenY: number });
    });

    this.renderer3D.on('script:click', (payload: unknown) => {
      this.handleScriptClick(payload as { script: ScriptType });
    });

    this.uiManager.on('script:slot:click', (payload: unknown) => {
      this.handleScriptClick(payload as { script: ScriptType });
    });

    this.uiManager.on('game:restart', () => {
      this.gameState.reset();
    });
  }

  private handleNodeClick(data: { nodeId: string; screenX: number; screenY: number }): void {
    const { nodeId, screenX, screenY } = data;
    const snapshot = this.gameState.getSnapshot();
    const targetNode = this.gameState.graph.getNode(nodeId);
    if (!targetNode) return;

    if (snapshot.phase === 'final') {
      this.handleFinalPhaseClick(nodeId, targetNode, screenX, screenY);
      return;
    }

    this.handleNormalPhaseClick(nodeId, targetNode, snapshot);
  }

  private handleFinalPhaseClick(
    nodeId: string,
    targetNode: GraphNodeData,
    screenX: number,
    screenY: number
  ): void {
    const snapshot = this.gameState.getSnapshot();

    if (snapshot.coreOwner === 'player' && targetNode.isCore) {
      this.startDrag(screenX, screenY);
      return;
    }

    if (this.isAdjacentToPlayerPosition(nodeId)) {
      this.gameState.attackNode(nodeId, this.gameState.selectedScriptCrack);
    }
  }

  private handleNormalPhaseClick(
    nodeId: string,
    targetNode: GraphNodeData,
    snapshot: GameStateSnapshot
  ): void {
    const hasFirewallSelected = snapshot.selectedScript === 'firewall';
    const isOwnNode = targetNode.owner === 'player';

    if (hasFirewallSelected && isOwnNode) {
      const cost = SCRIPT_COSTS.firewall;
      if (snapshot.energy >= cost) {
        this.gameState.useScript('firewall', nodeId);
      }
      return;
    }

    if (this.isAdjacentToPlayerPosition(nodeId)) {
      const useCrack = snapshot.selectedScript === 'crack' && snapshot.energy >= SCRIPT_COSTS.crack;
      if (useCrack) {
        this.gameState.useScript('crack', nodeId);
      } else {
        this.gameState.attackNode(nodeId, false);
      }
    }
  }

  private isAdjacentToPlayerPosition(nodeId: string): boolean {
    const playerPos = this.gameState.playerPosition;
    if (!playerPos) return false;
    const adjacent = this.gameState.graph.getAdjacentNodes(playerPos);
    return adjacent.some(n => n.id === nodeId);
  }

  private startDrag(screenX: number, screenY: number): void {
    this.isDraggingCore = true;
    this.dragStartScreenPos = { x: screenX, y: screenY };
    this.uiManager.setDragMode(true);
    this.renderer3D.setDragIndicator(true);
  }

  private handleMouseMove(data: { screenX: number; screenY: number }): void {
    if (!this.isDraggingCore) return;
    const worldPos = this.screenToWorld(data.screenX, data.screenY);
    this.renderer3D.setDragIndicatorPosition(worldPos);
  }

  private handleMouseUp(data: { screenX: number; screenY: number }): void {
    if (!this.isDraggingCore) return;

    const worldPos = this.screenToWorld(data.screenX, data.screenY);
    const nearestNode = this.findNearestNode(worldPos);

    if (nearestNode) {
      this.gameState.dropCoreAt(nearestNode.id);
    } else {
      this.gameState.cancelDrag();
    }

    this.endDrag();
  }

  private endDrag(): void {
    this.isDraggingCore = false;
    this.dragStartScreenPos = null;
    this.uiManager.setDragMode(false);
    this.renderer3D.setDragIndicator(false);
  }

  private handleScriptClick(data: { script: ScriptType }): void {
    const { script } = data;
    const snapshot = this.gameState.getSnapshot();
    const cost = SCRIPT_COSTS[script];

    if (snapshot.phase === 'final' && script !== 'crack') return;
    if (snapshot.energy < cost) return;

    this.gameState.selectedScript = this.gameState.selectedScript === script ? null : script;
    this.renderer3D.selectScriptMode(this.gameState.selectedScript);

    if (this.gameState.selectedScript) {
      this.uiManager.showTerminalPopup(
        this.getScriptDisplayName(script),
        cost
      );
    }
  }

  private getScriptDisplayName(script: ScriptType): string {
    switch (script) {
      case 'crack': return 'CRACK.EXE';
      case 'firewall': return 'FIREWALL.EXE';
      case 'stealth': return 'STEALTH.EXE';
    }
  }

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    return this.renderer3D.screenToWorld(screenX, screenY);
  }

  private findNearestNode(worldPos: THREE.Vector3): GraphNodeData | null {
    let nearest: GraphNodeData | null = null;
    let minDist = Infinity;
    for (const node of this.gameState.graph.nodes.values()) {
      const d = node.position.distanceTo(worldPos);
      if (d < minDist && d < 4) {
        minDist = d;
        nearest = node;
      }
    }
    return nearest;
  }
}
