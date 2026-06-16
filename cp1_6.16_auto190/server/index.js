const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

const TERRAIN_TYPES = {
  PLAIN: 'plain',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  RIVER: 'river',
  CITY: 'city'
};

const TERRAIN_DEFENSE_BONUS = {
  [TERRAIN_TYPES.PLAIN]: 0,
  [TERRAIN_TYPES.FOREST]: 0.1,
  [TERRAIN_TYPES.MOUNTAIN]: 0.4,
  [TERRAIN_TYPES.RIVER]: 0,
  [TERRAIN_TYPES.CITY]: 0.2
};

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

function generateMap() {
  const map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      let terrain = TERRAIN_TYPES.PLAIN;
      const rand = Math.random();
      if (rand < 0.08) terrain = TERRAIN_TYPES.FOREST;
      else if (rand < 0.13) terrain = TERRAIN_TYPES.MOUNTAIN;
      else if (rand < 0.16) terrain = TERRAIN_TYPES.RIVER;
      else if (rand < 0.20) terrain = TERRAIN_TYPES.CITY;
      row.push({ x, y, terrain });
    }
    map.push(row);
  }
  return map;
}

function hexDistance(x1, y1, x2, y2) {
  const q1 = x1 - (y1 - (y1 & 1)) / 2;
  const r1 = y1;
  const q2 = x2 - (y2 - (y2 & 1)) / 2;
  const r2 = y2;
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

const battles = {};

app.post('/api/battle/init', (req, res) => {
  const { redArmy, blueArmy } = req.body;
  const battleId = uuidv4();
  
  const map = generateMap();
  
  const units = [];
  
  redArmy.forEach((unit, idx) => {
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    units.push({
      id: `red-${idx}`,
      type: unit.type,
      name: unit.name,
      icon: unit.icon,
      team: 'red',
      hp: unit.hp,
      maxHp: unit.hp,
      attack: unit.attack,
      defense: unit.defense,
      speed: unit.speed,
      range: unit.range,
      x: col,
      y: 2 + row
    });
  });
  
  blueArmy.forEach((unit, idx) => {
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    units.push({
      id: `blue-${idx}`,
      type: unit.type,
      name: unit.name,
      icon: unit.icon,
      team: 'blue',
      hp: unit.hp,
      maxHp: unit.hp,
      attack: unit.attack,
      defense: unit.defense,
      speed: unit.speed,
      range: unit.range,
      x: MAP_WIDTH - 1 - col,
      y: MAP_HEIGHT - 3 - row
    });
  });
  
  battles[battleId] = {
    id: battleId,
    map,
    units,
    logs: [],
    turn: 0,
    status: 'deployed',
    currentUnitIndex: 0,
    actionQueue: []
  };
  
  res.json({
    battleId,
    map,
    units,
    logs: [],
    turn: 0,
    status: 'deployed'
  });
});

app.post('/api/battle/step', (req, res) => {
  const { battleId } = req.body;
  const battle = battles[battleId];
  
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  if (battle.status === 'finished') {
    return res.json({
      battleId,
      units: battle.units,
      logs: battle.logs.slice(-100),
      turn: battle.turn,
      status: battle.status,
      winner: battle.winner,
      remainingUnits: battle.remainingUnits,
      action: null
    });
  }
  
  const aliveUnits = battle.units.filter(u => u.hp > 0);
  const redAlive = aliveUnits.filter(u => u.team === 'red');
  const blueAlive = aliveUnits.filter(u => u.team === 'blue');
  
  if (redAlive.length === 0 || blueAlive.length === 0) {
    battle.status = 'finished';
    battle.winner = redAlive.length > 0 ? 'red' : 'blue';
    battle.remainingUnits = {
      red: redAlive.length,
      blue: blueAlive.length
    };
    battle.logs.push(`战斗结束！${battle.winner === 'red' ? '红方' : '蓝方'}获胜！`);
    return res.json({
      battleId,
      units: battle.units,
      logs: battle.logs.slice(-100),
      turn: battle.turn,
      status: battle.status,
      winner: battle.winner,
      remainingUnits: battle.remainingUnits,
      action: null
    });
  }
  
  const redSorted = [...redAlive].sort((a, b) => b.speed - a.speed);
  
  if (battle.currentUnitIndex >= redSorted.length) {
    battle.turn++;
    battle.currentUnitIndex = 0;
    battle.logs.push(`--- 第 ${battle.turn} 回合结束 ---`);
    
    battle.units.forEach(unit => {
      if (unit.hp <= 0) return;
      const tile = battle.map[unit.y]?.[unit.x];
      if (tile) {
        const bonus = TERRAIN_DEFENSE_BONUS[tile.terrain];
        if (bonus > 0) {
          const heal = Math.floor(unit.maxHp * bonus * 0.05);
          if (heal > 0 && unit.hp < unit.maxHp) {
            unit.hp = Math.min(unit.maxHp, unit.hp + heal);
          }
        }
      }
    });
    
    return res.json({
      battleId,
      units: battle.units,
      logs: battle.logs.slice(-100),
      turn: battle.turn,
      status: battle.status,
      action: null,
      turnEnd: true
    });
  }
  
  const attacker = redSorted[battle.currentUnitIndex];
  battle.currentUnitIndex++;
  
  const enemies = aliveUnits.filter(u => u.team !== attacker.team && u.hp > 0);
  
  let target = null;
  let minDistance = Infinity;
  
  enemies.forEach(enemy => {
    const dist = hexDistance(attacker.x, attacker.y, enemy.x, enemy.y);
    if (dist <= attacker.range && dist < minDistance) {
      minDistance = dist;
      target = enemy;
    }
  });
  
  if (!target) {
    const inRangeEnemies = enemies.filter(e => {
      const dist = hexDistance(attacker.x, attacker.y, e.x, e.y);
      return dist <= attacker.range;
    });
    
    if (inRangeEnemies.length > 0) {
      target = inRangeEnemies.sort((a, b) => a.hp - b.hp)[0];
    }
  }
  
  let action = null;
  
  if (target) {
    const tile = battle.map[target.y]?.[target.x];
    const defenseBonus = tile ? TERRAIN_DEFENSE_BONUS[tile.terrain] : 0;
    const effectiveDefense = target.defense * (1 + defenseBonus);
    const damage = Math.max(1, Math.floor(attacker.attack - effectiveDefense * 0.5));
    
    target.hp = Math.max(0, target.hp - damage);
    
    const attackerTeamName = attacker.team === 'red' ? '红方' : '蓝方';
    const targetTeamName = target.team === 'red' ? '红方' : '蓝方';
    battle.logs.push(`${attackerTeamName}${attacker.name}攻击${targetTeamName}${target.name}，造成${damage}点伤害，${target.name}剩余生命${target.hp}`);
    
    if (target.hp <= 0) {
      battle.logs.push(`${targetTeamName}${target.name}被消灭！`);
    }
    
    action = {
      type: 'attack',
      attackerId: attacker.id,
      targetId: target.id,
      damage,
      targetHp: target.hp
    };
  } else {
    const enemiesSorted = [...enemies].sort((a, b) => {
      const distA = hexDistance(attacker.x, attacker.y, a.x, a.y);
      const distB = hexDistance(attacker.x, attacker.y, b.x, b.y);
      return distA - distB;
    });
    
    if (enemiesSorted.length > 0) {
      const nearestEnemy = enemiesSorted[0];
      const dist = hexDistance(attacker.x, attacker.y, nearestEnemy.x, nearestEnemy.y);
      
      let bestX = attacker.x;
      let bestY = attacker.y;
      let bestDist = dist;
      
      for (let dy = -attacker.speed; dy <= attacker.speed; dy++) {
        for (let dx = -attacker.speed; dx <= attacker.speed; dx++) {
          const nx = attacker.x + dx;
          const ny = attacker.y + dy;
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
          
          const moveDist = hexDistance(attacker.x, attacker.y, nx, ny);
          if (moveDist > attacker.speed) continue;
          
          const occupied = battle.units.some(u => u.hp > 0 && u.x === nx && u.y === ny && u.id !== attacker.id);
          if (occupied) continue;
          
          const newDist = hexDistance(nx, ny, nearestEnemy.x, nearestEnemy.y);
          if (newDist < bestDist) {
            bestDist = newDist;
            bestX = nx;
            bestY = ny;
          }
        }
      }
      
      if (bestX !== attacker.x || bestY !== attacker.y) {
        const oldX = attacker.x;
        const oldY = attacker.y;
        attacker.x = bestX;
        attacker.y = bestY;
        
        action = {
          type: 'move',
          unitId: attacker.id,
          fromX: oldX,
          fromY: oldY,
          toX: bestX,
          toY: bestY
        };
      }
    }
  }
  
  res.json({
    battleId,
    units: battle.units,
    logs: battle.logs.slice(-100),
    turn: battle.turn,
    status: battle.status,
    action
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
