import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'cards.json');

app.use(cors());
app.use(express.json());

function readCards() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const defaultCards = getDefaultCards();
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultCards, null, 2));
      return defaultCards;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取卡牌数据失败:', err);
    return [];
  }
}

function writeCards(cards) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2));
    return true;
  } catch (err) {
    console.error('写入卡牌数据失败:', err);
    return false;
  }
}

function getDefaultCards() {
  return [
    {
      id: uuidv4(),
      name: '新手战士',
      type: 'creature',
      cost: 2,
      attack: 3,
      health: 4,
      effect: 'none',
      description: '一名普通的战士，没有特殊能力。'
    },
    {
      id: uuidv4(),
      name: '连击刺客',
      type: 'creature',
      cost: 3,
      attack: 2,
      health: 2,
      effect: 'doubleStrike',
      description: '连击：每回合攻击两次。'
    },
    {
      id: uuidv4(),
      name: '吸血蝙蝠',
      type: 'creature',
      cost: 2,
      attack: 2,
      health: 3,
      effect: 'lifesteal',
      description: '吸血：造成伤害时恢复等量生命值。'
    },
    {
      id: uuidv4(),
      name: '护盾卫士',
      type: 'creature',
      cost: 3,
      attack: 1,
      health: 5,
      effect: 'shield',
      description: '护盾：首次受到伤害无效。'
    },
    {
      id: uuidv4(),
      name: '火球术',
      type: 'spell',
      cost: 4,
      attack: 6,
      health: 0,
      effect: 'none',
      description: '对敌方造成6点伤害。'
    },
    {
      id: uuidv4(),
      name: '治愈之光',
      type: 'spell',
      cost: 3,
      attack: 0,
      health: 5,
      effect: 'lifesteal',
      description: '恢复己方5点生命值。'
    },
    {
      id: uuidv4(),
      name: '锋利长剑',
      type: 'equipment',
      cost: 2,
      attack: 2,
      health: 0,
      effect: 'none',
      description: '增加己方2点攻击力。'
    },
    {
      id: uuidv4(),
      name: '坚盾',
      type: 'equipment',
      cost: 2,
      attack: 0,
      health: 3,
      effect: 'shield',
      description: '增加己方3点生命值并获得护盾。'
    },
    {
      id: uuidv4(),
      name: '巨龙',
      type: 'creature',
      cost: 7,
      attack: 7,
      health: 7,
      effect: 'none',
      description: '强大的巨龙，拥有惊人的力量。'
    },
    {
      id: uuidv4(),
      name: '小精灵',
      type: 'creature',
      cost: 1,
      attack: 1,
      health: 2,
      effect: 'none',
      description: '低费小兵，适合快攻。'
    }
  ];
}

app.get('/api/cards', (req, res) => {
  const cards = readCards();
  res.json(cards);
});

app.post('/api/cards', (req, res) => {
  const { name, type, cost, attack, health, effect, description } = req.body;

  if (!name || !type || cost === undefined) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newCard = {
    id: uuidv4(),
    name,
    type,
    cost: Number(cost),
    attack: Number(attack) || 0,
    health: Number(health) || 0,
    effect: effect || 'none',
    description: description || ''
  };

  const cards = readCards();
  cards.push(newCard);
  writeCards(cards);

  res.status(201).json(newCard);
});

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  let cards = readCards();
  const initialLength = cards.length;
  cards = cards.filter(card => card.id !== id);

  if (cards.length === initialLength) {
    return res.status(404).json({ error: '卡牌不存在' });
  }

  writeCards(cards);
  res.json({ message: '删除成功' });
});

app.post('/api/battle/start', (req, res) => {
  const cards = readCards();

  if (cards.length < 10) {
    return res.status(400).json({ error: '卡牌数量不足，至少需要10张卡牌' });
  }

  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  const playerDeck = shuffled.slice(0, 5).map(card => ({
    ...card,
    currentHealth: card.health,
    hasShield: card.effect === 'shield',
    totalDamageDealt: 0,
    kills: 0
  }));
  const enemyDeck = shuffled.slice(5, 10).map(card => ({
    ...card,
    currentHealth: card.health,
    hasShield: card.effect === 'shield',
    totalDamageDealt: 0,
    kills: 0
  }));

  const battleResult = simulateBattle(playerDeck, enemyDeck);
  res.json(battleResult);
});

function simulateBattle(playerDeck, enemyDeck) {
  const logs = [];
  let round = 1;
  const playerCards = [...playerDeck];
  const enemyCards = [...enemyDeck];

  logs.push({
    id: uuidv4(),
    type: 'round',
    message: '战斗开始！',
    round: 0
  });

  while (playerCards.length > 0 && enemyCards.length > 0 && round <= 50) {
    logs.push({
      id: uuidv4(),
      type: 'round',
      message: `--- 第 ${round} 回合 ---`,
      round
    });

    const playerCard = playerCards.sort((a, b) => a.cost - b.cost)[0];
    const enemyCard = enemyCards.sort((a, b) => a.cost - b.cost)[0];

    if (!playerCard || !enemyCard) break;

    const playerAttacks = playerCard.effect === 'doubleStrike' ? 2 : 1;
    const enemyAttacks = enemyCard.effect === 'doubleStrike' ? 2 : 1;

    for (let i = 0; i < Math.max(playerAttacks, enemyAttacks); i++) {
      if (i < playerAttacks && playerCard.attack > 0 && enemyCards.length > 0) {
        let damage = playerCard.attack;

        if (enemyCard.hasShield) {
          enemyCard.hasShield = false;
          logs.push({
            id: uuidv4(),
            type: 'attack',
            message: `${playerCard.name} 攻击 ${enemyCard.name}，但被护盾抵挡！`
          });
        } else {
          enemyCard.currentHealth -= damage;
          playerCard.totalDamageDealt += damage;

          if (playerCard.effect === 'lifesteal') {
            playerCard.currentHealth += damage;
          }

          logs.push({
            id: uuidv4(),
            type: 'attack',
            message: `${playerCard.name} 对 ${enemyCard.name} 造成 ${damage} 点伤害${playerCard.effect === 'lifesteal' ? '，吸血恢复 ' + damage + ' 点生命' : ''}`
          });

          if (enemyCard.currentHealth <= 0) {
            playerCard.kills += 1;
            const idx = enemyCards.findIndex(c => c.id === enemyCard.id);
            if (idx > -1) {
              enemyCards.splice(idx, 1);
            }
            logs.push({
              id: uuidv4(),
              type: 'death',
              message: `${enemyCard.name} 被消灭了！`
            });
          }
        }
      }

      if (i < enemyAttacks && enemyCard.attack > 0 && playerCards.length > 0) {
        let damage = enemyCard.attack;

        if (playerCard.hasShield) {
          playerCard.hasShield = false;
          logs.push({
            id: uuidv4(),
            type: 'attack',
            message: `${enemyCard.name} 攻击 ${playerCard.name}，但被护盾抵挡！`
          });
        } else {
          playerCard.currentHealth -= damage;
          enemyCard.totalDamageDealt += damage;

          if (enemyCard.effect === 'lifesteal') {
            enemyCard.currentHealth += damage;
          }

          logs.push({
            id: uuidv4(),
            type: 'attack',
            message: `${enemyCard.name} 对 ${playerCard.name} 造成 ${damage} 点伤害${enemyCard.effect === 'lifesteal' ? '，吸血恢复 ' + damage + ' 点生命' : ''}`
          });

          if (playerCard.currentHealth <= 0) {
            enemyCard.kills += 1;
            const idx = playerCards.findIndex(c => c.id === playerCard.id);
            if (idx > -1) {
              playerCards.splice(idx, 1);
            }
            logs.push({
              id: uuidv4(),
              type: 'death',
              message: `${playerCard.name} 被消灭了！`
            });
          }
        }
      }
    }

    round++;
  }

  let winner = 'draw';
  let resultMessage = '';

  if (playerCards.length > 0 && enemyCards.length === 0) {
    winner = 'player';
    resultMessage = '玩家获胜！';
  } else if (enemyCards.length > 0 && playerCards.length === 0) {
    winner = 'enemy';
    resultMessage = '敌方获胜！';
  } else if (round > 50) {
    resultMessage = '战斗超时，平局！';
  } else {
    resultMessage = '双方同归于尽，平局！';
  }

  logs.push({
    id: uuidv4(),
    type: 'result',
    message: resultMessage
  });

  return {
    winner,
    totalRounds: round - 1,
    playerCardsRemaining: playerCards.length,
    enemyCardsRemaining: enemyCards.length,
    playerCardStats: playerCards,
    enemyCardStats: enemyCards,
    logs
  };
}

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
