import { GraphManager, type GraphNodeData, type OwnerType } from '../network/GraphManager';
import type { GameState, GamePhase, ScriptType } from './PlayerController';

type AIActionType = 'expand' | 'defend' | 'chase' | 'final-assault';

interface AIActionPlan {
  type: AIActionType;
  targetNodeId?: string;
  sourceNodeId?: string;
}

interface ExpandCandidate {
  targetNode: GraphNodeData;
  sourceNode: GraphNodeData;
  distanceToPlayer: number;
}

export class AIController {
  private gameState: GameState;
  private graphManager: GraphManager;

  private readonly actionCountMin = 2;
  private readonly actionCountMax = 3;
  private readonly actionDelayMs = 300;
  private readonly maxExpandPerTurn = 2;

  constructor(gameState: GameState, graphManager: GraphManager) {
    this.gameState = gameState;
    this.graphManager = graphManager;
  }

  public async runAITurn(): Promise<void> {
    const snapshot = this.gameState.getSnapshot();
    const actionCount = this.randomInt(this.actionCountMin, this.actionCountMax);
    const plan = this.buildActionPlan(snapshot, actionCount);

    let expandCount = 0;

    for (let i = 0; i < plan.length; i++) {
      await this.delay(this.actionDelayMs);

      const action = plan[i];
      switch (action.type) {
        case 'expand':
          if (expandCount < this.maxExpandPerTurn && action.targetNodeId && action.sourceNodeId) {
            this.executeExpand(action.targetNodeId, action.sourceNodeId);
            expandCount++;
          }
          break;
        case 'defend':
          if (action.targetNodeId) {
            this.executeDefend(action.targetNodeId);
          }
          break;
        case 'chase':
          if (action.targetNodeId) {
            this.executeChase(action.targetNodeId);
          }
          break;
        case 'final-assault':
          if (action.targetNodeId) {
            this.executeFinalAssault(action.targetNodeId);
          }
          break;
      }
    }
  }

  private buildActionPlan(snapshot: ReturnType<GameState['getSnapshot']>, count: number): AIActionPlan[] {
    const plan: AIActionPlan[] = [];

    if (snapshot.phase === 'final') {
      for (let i = 0; i < count; i++) {
        const assault = this.planFinalAssault(snapshot);
        if (assault) plan.push(assault);
      }
      return plan.slice(0, count);
    }

    const chasePlan = snapshot.playerPosition && !snapshot.stealthActive
      ? this.planChase(snapshot.playerPosition)
      : null;
    if (chasePlan) {
      plan.push(chasePlan);
    }

    while (plan.length < count) {
      const expandPlan = this.planExpand();
      if (expandPlan && plan.filter(p => p.type === 'expand').length < this.maxExpandPerTurn) {
        plan.push(expandPlan);
        continue;
      }

      const defendPlan = this.planDefend();
      if (defendPlan && !plan.some(p => p.type === 'defend')) {
        plan.push(defendPlan);
        continue;
      }

      if (expandPlan) {
        plan.push(expandPlan);
        continue;
      }

      break;
    }

    this.prioritizeActions(plan);
    return plan.slice(0, count);
  }

  private prioritizeActions(plan: AIActionPlan[]): void {
    const priority: Record<AIActionType, number> = {
      'chase': 0,
      'expand': 1,
      'defend': 2,
      'final-assault': 0,
    };
    plan.sort((a, b) => priority[a.type] - priority[b.type]);
  }

  private planExpand(): AIActionPlan | null {
    const aiNodes = this.graphManager.getNodesByOwner('ai');
    const candidates: ExpandCandidate[] = [];
    const playerStart = this.graphManager.getPlayerStartNode();
    const playerPos = this.gameState.playerPosition;

    const targetRef = playerPos || playerStart?.id;

    for (const aiNode of aiNodes) {
      const adjacents = this.graphManager.getAdjacentNodes(aiNode.id);
      for (const adj of adjacents) {
        if (adj.owner === 'ai') continue;

        let distanceToPlayer = Infinity;
        if (targetRef) {
          const path = this.graphManager.findPath(adj.id, targetRef);
          distanceToPlayer = path.length > 0 ? path.length : this.graphManager.getDistance(adj.id, targetRef);
        }

        const alreadyListed = candidates.some(c => c.targetNode.id === adj.id);
        if (!alreadyListed) {
          candidates.push({
            targetNode: adj,
            sourceNode: aiNode,
            distanceToPlayer,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.targetNode.owner === 'player' && b.targetNode.owner !== 'player') return -1;
      if (b.targetNode.owner === 'player' && a.targetNode.owner !== 'player') return 1;
      return a.distanceToPlayer - b.distanceToPlayer;
    });

    const chosen = candidates[0];
    return {
      type: 'expand',
      targetNodeId: chosen.targetNode.id,
      sourceNodeId: chosen.sourceNode.id,
    };
  }

  private planDefend(): AIActionPlan | null {
    const aiNodes = this.graphManager.getNodesByOwner('ai');
    if (aiNodes.length === 0) return null;

    const candidates = aiNodes
      .filter(n => n.firewall < 3)
      .sort((a, b) => {
        const aAdjEnemy = this.countAdjacentEnemies(a);
        const bAdjEnemy = this.countAdjacentEnemies(b);
        return bAdjEnemy - aAdjEnemy;
      });

    const target = candidates.length > 0
      ? candidates[0]
      : aiNodes[Math.floor(Math.random() * aiNodes.length)];

    return {
      type: 'defend',
      targetNodeId: target.id,
    };
  }

  private countAdjacentEnemies(node: GraphNodeData): number {
    const adj = this.graphManager.getAdjacentNodes(node.id);
    return adj.filter(n => n.owner === 'player' || n.owner === 'neutral').length;
  }

  private planChase(playerPositionId: string): AIActionPlan | null {
    const playerNode = this.graphManager.getNode(playerPositionId);
    if (!playerNode) return null;

    const adjacents = this.graphManager.getAdjacentNodes(playerPositionId);
    const aiNodes = this.graphManager.getNodesByOwner('ai');

    for (const adj of adjacents) {
      if (adj.owner === 'ai') {
        return {
          type: 'chase',
          targetNodeId: playerPositionId,
          sourceNodeId: adj.id,
        };
      }
    }

    for (const adj of adjacents) {
      if (adj.owner === 'neutral') {
        for (const aiNode of aiNodes) {
          const aiAdj = this.graphManager.getAdjacentNodes(aiNode.id);
          if (aiAdj.some(n => n.id === adj.id)) {
            return {
              type: 'chase',
              targetNodeId: adj.id,
              sourceNodeId: aiNode.id,
            };
          }
        }
      }
    }

    return null;
  }

  private planFinalAssault(snapshot: ReturnType<GameState['getSnapshot']>): AIActionPlan | null {
    const playerPosId = snapshot.playerPosition;
    const coreNode = this.graphManager.getCoreNode();

    if (playerPosId) {
      const adjacents = this.graphManager.getAdjacentNodes(playerPosId);
      for (const adj of adjacents) {
        if (adj.owner !== 'ai') {
          return {
            type: 'final-assault',
            targetNodeId: adj.id,
          };
        }
      }
      return {
        type: 'final-assault',
        targetNodeId: playerPosId,
      };
    }

    if (coreNode) {
      return {
        type: 'final-assault',
        targetNodeId: coreNode.id,
      };
    }

    return null;
  }

  private executeExpand(targetNodeId: string, _sourceNodeId: string): void {
    const result = this.graphManager.captureNode(targetNodeId, 'ai');
    const node = this.graphManager.getNode(targetNodeId);
    this.logAIAction(
      'EXPAND',
      `target=${targetNodeId}${node ? ` owner=${node.owner}` : ''} success=${result.success} captured=${result.newlyCaptured}`
    );
    this.emitAIAction('expand', targetNodeId);
  }

  private executeDefend(targetNodeId: string): void {
    const node = this.graphManager.getNode(targetNodeId);
    if (node) {
      node.firewall = Math.min(3, node.firewall + 1);
    }
    this.logAIAction(
      'DEFEND',
      `target=${targetNodeId} firewall=${node?.firewall ?? 0}`
    );
    this.emitAIAction('defend', targetNodeId);
  }

  private executeChase(targetNodeId: string): void {
    const result = this.graphManager.captureNode(targetNodeId, 'ai');
    const node = this.graphManager.getNode(targetNodeId);
    this.logAIAction(
      'CHASE',
      `target=${targetNodeId}${node ? ` owner=${node.owner}` : ''} success=${result.success} captured=${result.newlyCaptured}`
    );
    this.emitAIAction('chase', targetNodeId);
  }

  private executeFinalAssault(targetNodeId: string): void {
    const node = this.graphManager.getNode(targetNodeId);
    const beforeOwner = node?.owner;

    const result = this.graphManager.captureNode(targetNodeId, 'ai');
    if (!result.newlyCaptured && node && node.isCore) {
      this.graphManager.captureNode(targetNodeId, 'ai');
    }

    this.logAIAction(
      'FINAL-ASSAULT',
      `target=${targetNodeId} before=${beforeOwner} now=${node?.owner} captured=${result.newlyCaptured}`
    );
    this.emitAIAction('final-assault', targetNodeId);
  }

  private logAIAction(action: string, detail: string): void {
    const timestamp = this.formatTimestamp();
    if (typeof this.gameState.logAIAction === 'function') {
      this.gameState.logAIAction(timestamp, action, detail);
    }
    this.gameState.emit('ai:action', { timestamp, action, detail });
  }

  private emitAIAction(actionType: string, targetNodeId: string): void {
    this.gameState.emit('ai:action-complete', {
      type: actionType,
      target: targetNodeId,
      phase: this.gameState.phase,
    });
  }

  private formatTimestamp(): string {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
