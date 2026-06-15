import type { ParsedCommand, DiceRollResult, StatusEffectType } from './types';

function cryptoRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const randomBuffer = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % range);
  }
  return min + Math.floor(Math.random() * range);
}

const DICE_NOTATION_REGEX = /(\d+)d(\d+)\s*([+-]\s*\d+)?/i;
const ROLL_COMMAND_REGEX = /^\/roll\s+(.+)$/i;
const CHECK_COMMAND_REGEX = /^\/check\s+(.+)$/i;
const HEAL_COMMAND_REGEX = /^\/heal\s+(.+?)\s+(\d+)$/i;
const DAMAGE_COMMAND_REGEX = /^\/damage\s+(.+?)\s+(\d+)$/i;
const STATUS_COMMAND_REGEX = /^\/status\s+(.+?)\s+(poison|paralyze|burn|shield|stealth)\s+(\d+)$/i;

export function parseRollCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  const statusMatch = trimmed.match(STATUS_COMMAND_REGEX);
  if (statusMatch) {
    return {
      type: 'status',
      targetName: statusMatch[1].trim(),
      effectType: statusMatch[2] as StatusEffectType,
      turns: parseInt(statusMatch[3], 10),
    };
  }

  const healMatch = trimmed.match(HEAL_COMMAND_REGEX);
  if (healMatch) {
    return {
      type: 'heal',
      targetName: healMatch[1].trim(),
      amount: parseInt(healMatch[2], 10),
    };
  }

  const damageMatch = trimmed.match(DAMAGE_COMMAND_REGEX);
  if (damageMatch) {
    return {
      type: 'damage',
      targetName: damageMatch[1].trim(),
      amount: parseInt(damageMatch[2], 10),
    };
  }

  const checkMatch = trimmed.match(CHECK_COMMAND_REGEX);
  if (checkMatch) {
    const skillName = checkMatch[1].trim();
    if (!skillName) {
      return { type: 'invalid', reason: '请指定技能名称，例如：/check 潜行' };
    }
    return { type: 'check', skillName };
  }

  const rollMatch = trimmed.match(ROLL_COMMAND_REGEX);
  if (rollMatch) {
    const notation = rollMatch[1].trim();
    const diceMatch = notation.match(DICE_NOTATION_REGEX);
    if (!diceMatch) {
      return { type: 'invalid', reason: '骰子格式错误，请使用 NdM±K 格式，例如：/roll 1d20+5' };
    }
    const count = parseInt(diceMatch[1], 10);
    const sides = parseInt(diceMatch[2], 10);
    const modifierStr = diceMatch[3] ? diceMatch[3].replace(/\s+/g, '') : '0';
    const modifier = parseInt(modifierStr, 10) || 0;

    if (count < 1 || count > 100) {
      return { type: 'invalid', reason: '骰子数量必须在 1-100 之间' };
    }
    const validSides = [4, 6, 8, 10, 12, 20, 100];
    if (!validSides.includes(sides)) {
      return { type: 'invalid', reason: `骰子面数必须是: ${validSides.join(', ')}` };
    }

    return { type: 'roll', diceNotation: `${count}d${sides}`, modifier };
  }

  return { type: 'invalid', reason: '未知指令，请使用 /roll、/check、/heal、/damage 或 /status' };
}

export function rollDice(count: number, sides: number, modifier: number = 0): DiceRollResult {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(cryptoRandomInt(1, sides));
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  let isCritical = false;
  let isFumble = false;
  if (sides === 20 && count === 1) {
    if (values[0] === 20) isCritical = true;
    if (values[0] === 1) isFumble = true;
  }

  return {
    originalCommand: `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''}`,
    rolls: [{ count, sides, values }],
    modifier,
    total,
    isCritical,
    isFumble,
  };
}

export function rollFromNotation(notation: string): DiceRollResult {
  const match = notation.match(DICE_NOTATION_REGEX);
  if (!match) {
    throw new Error(`无效骰子格式: ${notation}`);
  }
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifierStr = match[3] ? match[3].replace(/\s+/g, '') : '0';
  const modifier = parseInt(modifierStr, 10) || 0;
  return rollDice(count, sides, modifier);
}

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
