export function rollDice(sides: number = 20): number {
  return Math.floor(Math.random() * sides) + 1;
}

export interface CombatResult {
  roll: number;
  hit: boolean;
  damage: number;
}

export function resolveCombat(
  attackBonus: number,
  monsterDefense: number
): CombatResult {
  const roll = rollDice(20);
  const total = roll + attackBonus;
  const hit = total >= monsterDefense;
  const damage = hit ? Math.floor(Math.random() * 8) + 3 + attackBonus : 0;
  return { roll, hit, damage };
}

export function checkAgilitySave(dc: number = 12): boolean {
  const roll = rollDice(20);
  return roll >= dc;
}
