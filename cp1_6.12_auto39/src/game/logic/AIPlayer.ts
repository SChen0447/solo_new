import {
  GameState,
  Action,
  Unit,
  Position,
  BOARD_SIZE,
  manhattanDistance,
} from '../types';
import {
  getAliveUnits,
  getValidMovePositions,
  getValidAttackTargets,
  getUnitAt,
  getUnit,
} from './GameEngine';

export interface AIActionStep {
  action: Action;
  unit: Unit;
  moveFrom?: Position;
  moveTo?: Position;
}

function scoreTarget(attacker: Unit, target: Unit): number {
  const estimatedDamage = Math.max(1, attacker.attack - target.defense);
  let score = 0;

  if (target.hp <= estimatedDamage) {
    score += 200;
  }

  score += (target.maxHp - target.hp) * 5;

  score += (10 - target.defense) * 8;

  score += estimatedDamage * 3;

  if (attacker.isAoe) {
    score += 30;
  }

  return score;
}

function findBestMoveToward(
  state: GameState,
  unit: Unit,
  primaryTarget: Unit
): Position | null {
  const moves = getValidMovePositions(state, unit.id);
  if (moves.length === 0) return null;

  let bestPos: Position | null = null;
  let bestScore = -Infinity;

  for (const pos of moves) {
    if (getUnitAt(state, pos)) continue;

    const distToTarget = manhattanDistance(pos, primaryTarget.pos);
    let score = -distToTarget * 10;

    if (distToTarget <= unit.attackRange) {
      score += 100;

      const allEnemies = getAliveUnits(state, 'blue');
      const targetsInRange = allEnemies.filter(
        (e) => manhattanDistance(pos, e.pos) <= unit.attackRange
      );
      score += targetsInRange.length * 15;

      let bestTargetScore = 0;
      for (const t of targetsInRange) {
        const ts = scoreTarget(unit, t);
        if (ts > bestTargetScore) bestTargetScore = ts;
      }
      score += bestTargetScore * 0.5;
    }

    const playerUnits = getAliveUnits(state, 'blue');
    for (const pu of playerUnits) {
      if (manhattanDistance(pos, pu.pos) <= pu.attackRange) {
        score -= 10;
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
  const aiUnits = getAliveUnits(state, 'red').filter(
    (u) => !u.hasMoved || !u.hasAttacked
  );
  const playerUnits = getAliveUnits(state, 'blue');

  if (playerUnits.length === 0 || aiUnits.length === 0) return [];

  const prioritizedTargets = [...playerUnits].sort((a, b) => {
    const scoreA = a.hp + a.defense * 3;
    const scoreB = b.hp + b.defense * 3;
    return scoreA - scoreB;
  });

  const steps: AIActionStep[] = [];
  const simulatedKills = new Set<string>();

  for (const unit of aiUnits) {
    if (unit.hasMoved && unit.hasAttacked) continue;

    const attackTargets = getValidAttackTargets(state, unit.id).filter(
      (t) => !simulatedKills.has(t.id)
    );

    if (attackTargets.length > 0 && !unit.hasAttacked) {
      const scored = attackTargets.map((t) => ({
        target: t,
        score: scoreTarget(unit, t),
      }));
      scored.sort((a, b) => b.score - a.score);

      const best = scored[0].target;
      steps.push({
        action: { type: 'attack', unitId: unit.id, targetId: best.id },
        unit,
      });

      const estimatedDamage = Math.max(1, unit.attack - best.defense);
      if (best.hp <= estimatedDamage) {
        simulatedKills.add(best.id);
      }
      continue;
    }

    if (!unit.hasMoved) {
      let bestTarget = prioritizedTargets.find((t) => !simulatedKills.has(t.id));
      if (!bestTarget) bestTarget = prioritizedTargets[0];

      const bestMove = findBestMoveToward(state, unit, bestTarget);

      if (bestMove) {
        steps.push({
          action: { type: 'move', unitId: unit.id, targetPos: bestMove },
          unit,
          moveFrom: { ...unit.pos },
          moveTo: bestMove,
        });

        const postMoveTargets = playerUnits.filter(
          (t) =>
            !simulatedKills.has(t.id) &&
            t.isAlive &&
            manhattanDistance(bestMove, t.pos) <= unit.attackRange
        );

        if (postMoveTargets.length > 0 && !unit.hasAttacked) {
          const movedUnit = { ...unit, pos: bestMove };
          const scored = postMoveTargets.map((t) => ({
            target: t,
            score: scoreTarget(movedUnit, t),
          }));
          scored.sort((a, b) => b.score - a.score);

          steps.push({
            action: {
              type: 'attack',
              unitId: unit.id,
              targetId: scored[0].target.id,
            },
            unit: movedUnit,
          });

          const estDmg = Math.max(1, movedUnit.attack - scored[0].target.defense);
          if (scored[0].target.hp <= estDmg) {
            simulatedKills.add(scored[0].target.id);
          }
        }
      } else {
        steps.push({
          action: { type: 'skip', unitId: unit.id },
          unit,
        });
      }
    } else {
      steps.push({
        action: { type: 'skip', unitId: unit.id },
        unit,
      });
    }
  }

  return steps;
}
