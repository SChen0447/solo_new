import {
  GameState,
  Action,
  Unit,
  Position,
  PlayerSide,
  BOARD_SIZE,
  manhattanDistance,
} from '../types';
import {
  getAliveUnits,
  getValidMovePositions,
  getValidAttackTargets,
  getUnitAt,
} from './GameEngine';

export interface AIActionStep {
  action: Action;
  unit: Unit;
  moveFrom?: Position;
  moveTo?: Position;
}

function scoreTarget(attacker: Unit, target: Unit): number {
  const damage = Math.max(1, attacker.attack - target.defense);
  const killBonus = target.hp <= damage ? 100 : 0;
  const lowHpBonus = (target.maxHp - target.hp) * 2;
  const lowDefBonus = (10 - target.defense) * 3;
  const proximityBonus = attacker.attackRange >= manhattanDistance(attacker.pos, target.pos) ? 50 : 0;
  return killBonus + lowHpBonus + lowDefBonus + proximityBonus + damage;
}

function findBestMoveToward(
  state: GameState,
  unit: Unit,
  target: Unit
): Position | null {
  const moves = getValidMovePositions(state, unit.id);
  if (moves.length === 0) return null;

  let bestPos: Position | null = null;
  let bestScore = -Infinity;

  const currentDist = manhattanDistance(unit.pos, target.pos);

  for (const pos of moves) {
    const dist = manhattanDistance(pos, target.pos);
    const closeness = currentDist - dist;

    const unitAtPos = getUnitAt(state, pos);
    if (unitAtPos) continue;

    let score = closeness * 10;

    if (dist <= unit.attackRange) {
      score += 50;
    }

    const blueUnits = getAliveUnits(state, 'blue');
    for (const bu of blueUnits) {
      if (manhattanDistance(pos, bu.pos) <= bu.attackRange) {
        score -= 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }

  return bestPos;
}

export function computeAIActions(state: GameState): AIActionStep[] {
  const aiUnits = getAliveUnits(state, 'red').filter((u) => !u.hasMoved || !u.hasAttacked);
  const playerUnits = getAliveUnits(state, 'blue');

  if (playerUnits.length === 0) return [];

  const steps: AIActionStep[] = [];

  const sortedTargets = [...playerUnits].sort((a, b) => {
    const scoreA = a.hp + a.defense * 2;
    const scoreB = b.hp + b.defense * 2;
    return scoreA - scoreB;
  });

  for (const unit of aiUnits) {
    const mutableUnit = { ...unit };
    let tempState = state;

    const attackTargets = getValidAttackTargets(tempState, mutableUnit.id);

    if (attackTargets.length > 0 && !mutableUnit.hasAttacked) {
      const scored = attackTargets.map((t) => ({
        target: t,
        score: scoreTarget(mutableUnit, t),
      }));
      scored.sort((a, b) => b.score - a.score);

      const best = scored[0].target;

      steps.push({
        action: { type: 'attack', unitId: mutableUnit.id, targetId: best.id },
        unit: mutableUnit,
      });
      continue;
    }

    if (!mutableUnit.hasMoved) {
      const primaryTarget = sortedTargets[0];
      const bestMove = findBestMoveToward(tempState, mutableUnit, primaryTarget);

      if (bestMove) {
        steps.push({
          action: { type: 'move', unitId: mutableUnit.id, targetPos: bestMove },
          unit: mutableUnit,
          moveFrom: { ...mutableUnit.pos },
          moveTo: bestMove,
        });

        const movedPos = bestMove;
        const postMoveTargets = playerUnits.filter(
          (t) => t.isAlive && manhattanDistance(movedPos, t.pos) <= mutableUnit.attackRange
        );

        if (postMoveTargets.length > 0 && !mutableUnit.hasAttacked) {
          const scored = postMoveTargets.map((t) => ({
            target: t,
            score: scoreTarget({ ...mutableUnit, pos: movedPos }, t),
          }));
          scored.sort((a, b) => b.score - a.score);

          steps.push({
            action: { type: 'attack', unitId: mutableUnit.id, targetId: scored[0].target.id },
            unit: { ...mutableUnit, pos: movedPos },
          });
        }
      } else {
        steps.push({
          action: { type: 'skip', unitId: mutableUnit.id },
          unit: mutableUnit,
        });
      }
    } else {
      steps.push({
        action: { type: 'skip', unitId: mutableUnit.id },
        unit: mutableUnit,
      });
    }
  }

  return steps;
}
