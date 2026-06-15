import {
  CardDef,
  BattleCard,
  BattleEvent,
  TurnSnapshot,
  BattleResult,
  OpponentStrategy,
} from './types';

export const CARD_LIBRARY: CardDef[] = [
  { id: 'c01', name: '烈焰战士', cost: 1, attack: 2, hp: 3, skill: 'burn' },
  { id: 'c02', name: '冰霜法师', cost: 2, attack: 3, hp: 4, skill: 'freeze' },
  { id: 'c03', name: '圣盾守卫', cost: 3, attack: 2, hp: 6, skill: 'shield' },
  { id: 'c04', name: '暗影刺客', cost: 2, attack: 4, hp: 3, skill: 'doubleStrike' },
  { id: 'c05', name: '鲜血领主', cost: 5, attack: 5, hp: 7, skill: 'lifesteal' },
  { id: 'c06', name: '寒冰弓手', cost: 1, attack: 1, hp: 2, skill: 'freeze' },
  { id: 'c07', name: '火焰精灵', cost: 3, attack: 4, hp: 5, skill: 'burn' },
  { id: 'c08', name: '铁壁骑士', cost: 4, attack: 2, hp: 8, skill: 'shield' },
  { id: 'c09', name: '疾风剑客', cost: 2, attack: 3, hp: 3, skill: 'doubleStrike' },
  { id: 'c10', name: '亡灵术士', cost: 4, attack: 4, hp: 5, skill: 'lifesteal' },
  { id: 'c11', name: '熔岩巨人', cost: 7, attack: 8, hp: 8, skill: 'burn' },
  { id: 'c12', name: '极寒之龙', cost: 8, attack: 7, hp: 9, skill: 'freeze' },
  { id: 'c13', name: '雷霆战神', cost: 6, attack: 6, hp: 7, skill: 'doubleStrike' },
  { id: 'c14', name: '圣光天使', cost: 9, attack: 5, hp: 12, skill: 'lifesteal' },
  { id: 'c15', name: '黑曜石像鬼', cost: 5, attack: 3, hp: 9, skill: 'shield' },
  { id: 'c16', name: '毒焰蜥蜴', cost: 3, attack: 3, hp: 4, skill: 'burn' },
  { id: 'c17', name: '霜狼哨兵', cost: 2, attack: 2, hp: 4, skill: 'freeze' },
  { id: 'c18', name: '双刃狂战', cost: 4, attack: 5, hp: 4, skill: 'doubleStrike' },
  { id: 'c19', name: '噬血蝙蝠', cost: 1, attack: 2, hp: 2, skill: 'lifesteal' },
  { id: 'c20', name: '石盾傀儡', cost: 3, attack: 1, hp: 7, skill: 'shield' },
  { id: 'c21', name: '炎魔将军', cost: 6, attack: 7, hp: 6, skill: 'burn' },
  { id: 'c22', name: '冰晶女巫', cost: 5, attack: 4, hp: 6, skill: 'freeze' },
  { id: 'c23', name: '裂空忍者', cost: 3, attack: 4, hp: 3, skill: 'doubleStrike' },
  { id: 'c24', name: '暗夜伯爵', cost: 7, attack: 6, hp: 8, skill: 'lifesteal' },
  { id: 'c25', name: '堡垒卫士', cost: 4, attack: 2, hp: 7, skill: 'shield' },
  { id: 'c26', name: '地狱火使', cost: 10, attack: 9, hp: 9, skill: 'burn' },
  { id: 'c27', name: '永恒冰灵', cost: 9, attack: 6, hp: 11, skill: 'freeze' },
  { id: 'c28', name: '影舞者', cost: 5, attack: 5, hp: 5, skill: 'doubleStrike' },
  { id: 'c29', name: '血月祭祀', cost: 8, attack: 7, hp: 9, skill: 'lifesteal' },
  { id: 'c30', name: '钻石魔像', cost: 6, attack: 3, hp: 10, skill: 'shield' },
];

function toBattleCard(def: CardDef): BattleCard {
  return {
    def,
    currentHp: def.hp,
    shieldActive: false,
    freezeTurns: 0,
    burnTurns: 0,
    burnDamage: 2,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateOpponentDeck(
  strategy: OpponentStrategy,
  count: number = 6
): CardDef[] {
  const pool = [...CARD_LIBRARY];
  switch (strategy) {
    case 'highCost':
      pool.sort((a, b) => b.cost - a.cost);
      break;
    case 'lowCost':
      pool.sort((a, b) => a.cost - b.cost);
      break;
    default:
      shuffle(pool);
      break;
  }
  const selected: CardDef[] = [];
  const used = new Set<string>();
  for (const card of pool) {
    if (selected.length >= count) break;
    if (used.has(card.id)) continue;
    if (strategy === 'random' || Math.random() > 0.3) {
      selected.push(card);
      used.add(card.id);
    }
  }
  while (selected.length < count) {
    const rc = CARD_LIBRARY[Math.floor(Math.random() * CARD_LIBRARY.length)];
    if (!used.has(rc.id)) {
      selected.push(rc);
      used.add(rc.id);
    }
  }
  return selected;
}

export function runBattle(
  playerDeckDefs: CardDef[],
  opponentDeckDefs: CardDef[],
  opponentIndex: number,
  opponentStrategy: OpponentStrategy
): BattleResult {
  const playerCards = shuffle(playerDeckDefs.map(toBattleCard));
  const opponentCards = shuffle(opponentDeckDefs.map(toBattleCard));
  const playerHand = [...playerCards];
  const opponentHand = [...opponentCards];
  let playerHp = 30;
  let opponentHp = 30;
  const playerUsed: CardDef[] = [];
  const opponentUsed: CardDef[] = [];
  const allEvents: BattleEvent[] = [];
  const snapshots: TurnSnapshot[] = [];
  const playerFirst = Math.random() < 0.5;
  let playerCardIndex = 0;
  let opponentCardIndex = 0;

  for (let turn = 1; turn <= 20; turn++) {
    if (playerHp <= 0 || opponentHp <= 0) break;
    if (playerCardIndex >= playerHand.length && opponentCardIndex >= opponentHand.length) break;

    const turnEvents: BattleEvent[] = [];

    const processBurn = (card: BattleCard, side: 'player' | 'opponent') => {
      if (card.burnTurns > 0) {
        card.currentHp -= card.burnDamage;
        card.burnTurns--;
        const e: BattleEvent = {
          type: 'burnTick',
          turn,
          side,
          cardName: card.def.name,
          value: card.burnDamage,
          detail: `${card.def.name} 受到灼烧伤害 ${card.burnDamage}`,
        };
        turnEvents.push(e);
      }
    };

    const processFreeze = (card: BattleCard, side: 'player' | 'opponent'): boolean => {
      if (card.freezeTurns > 0) {
        card.freezeTurns--;
        const e: BattleEvent = {
          type: 'freezeSkip',
          turn,
          side,
          cardName: card.def.name,
          detail: `${card.def.name} 被冰冻，跳过本回合行动`,
        };
        turnEvents.push(e);
        return true;
      }
      return false;
    };

    const playCard = (
      side: 'player' | 'opponent',
      card: BattleCard,
      targetHp: { val: number },
      isTargetFrozen: boolean
    ): number => {
      const evts: BattleEvent[] = [];
      evts.push({
        type: 'playCard',
        turn,
        side,
        cardName: card.def.name,
        detail: `${side === 'player' ? '玩家' : '对手'}出牌 ${card.def.name}`,
      });

      if (isTargetFrozen) {
        return targetHp.val;
      }

      let damage = card.def.attack;

      const applySkill = () => {
        switch (card.def.skill) {
          case 'doubleStrike': {
            evts.push({
              type: 'doubleStrike',
              turn,
              side,
              cardName: card.def.name,
              value: damage,
              detail: `${card.def.name} 连击！额外造成 ${damage} 伤害`,
            });
            damage = damage * 2;
            break;
          }
          case 'shield': {
            card.shieldActive = true;
            evts.push({
              type: 'shieldBlock',
              turn,
              side,
              cardName: card.def.name,
              detail: `${card.def.name} 激活护盾，抵挡下次伤害`,
            });
            break;
          }
          case 'lifesteal': {
            const heal = Math.floor(damage * 0.5);
            if (side === 'player') {
              playerHp = Math.min(30, playerHp + heal);
            } else {
              opponentHp = Math.min(30, opponentHp + heal);
            }
            evts.push({
              type: 'lifesteal',
              turn,
              side,
              cardName: card.def.name,
              value: heal,
              detail: `${card.def.name} 吸血回复 ${heal} 生命`,
            });
            break;
          }
          case 'freeze': {
            const targetCard =
              side === 'player'
                ? opponentHand[opponentCardIndex]
                : playerHand[playerCardIndex];
            if (targetCard) {
              targetCard.freezeTurns = 2;
              evts.push({
                type: 'freezeApply',
                turn,
                side,
                cardName: card.def.name,
                targetCardName: targetCard.def.name,
                detail: `${card.def.name} 冰冻了 ${targetCard.def.name}，持续2回合`,
              });
            }
            break;
          }
          case 'burn': {
            const targetCard =
              side === 'player'
                ? opponentHand[opponentCardIndex]
                : playerHand[playerCardIndex];
            if (targetCard) {
              targetCard.burnTurns = 3;
              targetCard.burnDamage = 2;
              evts.push({
                type: 'burnApply',
                turn,
                side,
                cardName: card.def.name,
                targetCardName: targetCard.def.name,
                detail: `${card.def.name} 灼烧了 ${targetCard.def.name}，每回合扣2血持续3回合`,
              });
            }
            break;
          }
        }
      };

      applySkill();

      if (side === 'player') {
        if (opponentHand[opponentCardIndex]?.shieldActive) {
          opponentHand[opponentCardIndex].shieldActive = false;
          evts.push({
            type: 'shieldBlock',
            turn,
            side: 'opponent',
            cardName: opponentHand[opponentCardIndex].def.name,
            value: damage,
            detail: `护盾抵消了 ${damage} 点伤害`,
          });
          damage = 0;
        }
      } else {
        if (playerHand[playerCardIndex]?.shieldActive) {
          playerHand[playerCardIndex].shieldActive = false;
          evts.push({
            type: 'shieldBlock',
            turn,
            side: 'player',
            cardName: playerHand[playerCardIndex].def.name,
            value: damage,
            detail: `护盾抵消了 ${damage} 点伤害`,
          });
          damage = 0;
        }
      }

      targetHp.val -= damage;
      evts.push({
        type: 'attack',
        turn,
        side,
        cardName: card.def.name,
        value: damage,
        detail: `${card.def.name} 造成 ${damage} 点伤害`,
      });

      turnEvents.push(...evts);
      return targetHp.val;
    };

    if (playerCardIndex < playerHand.length) {
      processBurn(playerHand[playerCardIndex], 'player');
    }
    if (opponentCardIndex < opponentHand.length) {
      processBurn(opponentHand[opponentCardIndex], 'opponent');
    }

    const pCard = playerCardIndex < playerHand.length ? playerHand[playerCardIndex] : null;
    const oCard = opponentCardIndex < opponentHand.length ? opponentHand[opponentCardIndex] : null;

    if (playerFirst) {
      if (pCard) {
        const frozen = processFreeze(pCard, 'player');
        if (!frozen) {
          const targetHp = { val: opponentHp };
          playCard('player', pCard, targetHp, false);
          opponentHp = targetHp.val;
          playerUsed.push(pCard.def);
        }
        playerCardIndex++;
      }
      if (oCard && opponentHp > 0 && playerHp > 0) {
        const frozen = processFreeze(oCard, 'opponent');
        if (!frozen) {
          const targetHp = { val: playerHp };
          playCard('opponent', oCard, targetHp, false);
          playerHp = targetHp.val;
          opponentUsed.push(oCard.def);
        }
        opponentCardIndex++;
      }
    } else {
      if (oCard) {
        const frozen = processFreeze(oCard, 'opponent');
        if (!frozen) {
          const targetHp = { val: playerHp };
          playCard('opponent', oCard, targetHp, false);
          playerHp = targetHp.val;
          opponentUsed.push(oCard.def);
        }
        opponentCardIndex++;
      }
      if (pCard && opponentHp > 0 && playerHp > 0) {
        const frozen = processFreeze(pCard, 'player');
        if (!frozen) {
          const targetHp = { val: opponentHp };
          playCard('player', pCard, targetHp, false);
          opponentHp = targetHp.val;
          playerUsed.push(pCard.def);
        }
        playerCardIndex++;
      }
    }

    if (pCard && pCard.currentHp <= 0) {
      turnEvents.push({
        type: 'death',
        turn,
        side: 'player',
        cardName: pCard.def.name,
        detail: `${pCard.def.name} 阵亡`,
      });
    }
    if (oCard && oCard.currentHp <= 0) {
      turnEvents.push({
        type: 'death',
        turn,
        side: 'opponent',
        cardName: oCard.def.name,
        detail: `${oCard.def.name} 阵亡`,
      });
    }

    allEvents.push(...turnEvents);

    snapshots.push({
      turn,
      playerCard: pCard ? { ...pCard } : null,
      opponentCard: oCard ? { ...oCard } : null,
      playerHp: Math.max(0, playerHp),
      opponentHp: Math.max(0, opponentHp),
      events: [...turnEvents],
    });

    if (playerHp <= 0 || opponentHp <= 0) break;
  }

  let winner: 'player' | 'opponent' | 'draw' = 'draw';
  if (playerHp > 0 && opponentHp <= 0) winner = 'player';
  else if (opponentHp > 0 && playerHp <= 0) winner = 'opponent';
  else if (playerHp > opponentHp) winner = 'player';
  else if (opponentHp > playerHp) winner = 'opponent';

  return {
    opponentIndex,
    opponentConfig: {
      id: `opp-${opponentIndex}`,
      strategy: opponentStrategy,
    },
    opponentDeck: opponentDeckDefs,
    winner,
    totalTurns: snapshots.length,
    playerRemainingHp: Math.max(0, playerHp),
    opponentRemainingHp: Math.max(0, opponentHp),
    snapshots,
    events: allEvents,
  };
}
