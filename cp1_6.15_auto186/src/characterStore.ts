import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Character,
  Attributes,
  StatusEffect,
  StatusEffectType,
  CharacterClass,
} from './types';
import { STATUS_EFFECT_PRESETS, CLASS_AVATARS } from './types';

function calculateMaxHp(level: number, constitution: number, charClass: CharacterClass): number {
  const baseHp: Record<CharacterClass, number> = { '战士': 12, '法师': 6, '盗贼': 8, '牧师': 10 };
  const base = baseHp[charClass];
  const conMod = Math.floor((constitution - 10) / 2);
  const perLevel = Math.max(1, Math.floor(base / 2) + conMod);
  return base + conMod + Math.max(0, level - 1) * perLevel;
}

function calculateMaxMp(level: number, intelligence: number, charClass: CharacterClass): number {
  const isCaster = charClass === '法师' || charClass === '牧师';
  if (!isCaster) return 0;
  const intMod = Math.floor((intelligence - 10) / 2);
  const basePerLevel = charClass === '法师' ? 4 : 3;
  return Math.max(0, level * (basePerLevel + intMod));
}

interface CharacterState {
  characters: Character[];
  selectedCharacterId: string | null;
  addCharacter: (data: {
    name: string;
    characterClass: CharacterClass;
    level: number;
    attributes: Attributes;
  }) => Character;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  reorderCharacters: (fromIndex: number, toIndex: number) => void;
  selectCharacter: (id: string | null) => void;
  healCharacter: (id: string, amount: number) => number;
  damageCharacter: (id: string, amount: number) => number;
  setHp: (id: string, hp: number) => void;
  setMp: (id: string, mp: number) => void;
  addStatusEffect: (characterId: string, type: StatusEffectType, turns: number) => void;
  removeStatusEffect: (characterId: string, effectId: string) => void;
  decrementAllStatusTurns: () => void;
  findCharacterByName: (name: string) => Character | undefined;
  getSelectedCharacter: () => Character | undefined;
  getAttributeModifier: (characterId: string, attr: keyof Attributes) => number;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  selectedCharacterId: null,

  addCharacter: (data) => {
    const id = uuidv4();
    const maxHp = calculateMaxHp(data.level, data.attributes.constitution, data.characterClass);
    const maxMp = calculateMaxMp(data.level, data.attributes.intelligence, data.characterClass);
    const currentOrder = get().characters.length;
    const newChar: Character = {
      id,
      name: data.name,
      characterClass: data.characterClass,
      level: data.level,
      avatar: CLASS_AVATARS[data.characterClass],
      hp: maxHp,
      maxHp,
      mp: maxMp,
      maxMp,
      attributes: { ...data.attributes },
      statusEffects: [],
      order: currentOrder,
    };
    set((state) => ({
      characters: [...state.characters, newChar],
      selectedCharacterId: state.selectedCharacterId ?? id,
    }));
    return newChar;
  },

  removeCharacter: (id) => {
    set((state) => {
      const filtered = state.characters.filter((c) => c.id !== id);
      return {
        characters: filtered,
        selectedCharacterId:
          state.selectedCharacterId === id
            ? filtered.length > 0
              ? filtered[0].id
              : null
            : state.selectedCharacterId,
      };
    });
  },

  updateCharacter: (id, updates) => {
    set((state) => ({
      characters: state.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  reorderCharacters: (fromIndex, toIndex) => {
    set((state) => {
      const sorted = [...state.characters].sort((a, b) => a.order - b.order);
      const [removed] = sorted.splice(fromIndex, 1);
      if (!removed) return state;
      sorted.splice(toIndex, 0, removed);
      const reordered = sorted.map((c, idx) => ({ ...c, order: idx }));
      return { characters: reordered };
    });
  },

  selectCharacter: (id) => set({ selectedCharacterId: id }),

  healCharacter: (id, amount) => {
    const state = get();
    const char = state.characters.find((c) => c.id === id);
    if (!char) return 0;
    const actualHeal = Math.min(amount, char.maxHp - char.hp);
    if (actualHeal > 0) {
      set({
        characters: state.characters.map((c) =>
          c.id === id ? { ...c, hp: c.hp + actualHeal } : c,
        ),
      });
    }
    return actualHeal;
  },

  damageCharacter: (id, amount) => {
    const state = get();
    const char = state.characters.find((c) => c.id === id);
    if (!char) return 0;
    const actualDamage = Math.min(amount, char.hp);
    if (actualDamage > 0) {
      set({
        characters: state.characters.map((c) =>
          c.id === id ? { ...c, hp: Math.max(0, c.hp - actualDamage) } : c,
        ),
      });
    }
    return actualDamage;
  },

  setHp: (id, hp) => {
    set((state) => ({
      characters: state.characters.map((c) => {
        if (c.id !== id) return c;
        const newHp = Math.max(0, Math.min(c.maxHp, hp));
        return { ...c, hp: newHp };
      }),
    }));
  },

  setMp: (id, mp) => {
    set((state) => ({
      characters: state.characters.map((c) => {
        if (c.id !== id) return c;
        const newMp = Math.max(0, Math.min(c.maxMp, mp));
        return { ...c, mp: newMp };
      }),
    }));
  },

  addStatusEffect: (characterId, type, turns) => {
    const preset = STATUS_EFFECT_PRESETS[type];
    const effect: StatusEffect = {
      id: uuidv4(),
      type: preset.type,
      name: preset.name,
      color: preset.color,
      remainingTurns: turns,
    };
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? { ...c, statusEffects: [...c.statusEffects, effect] }
          : c,
      ),
    }));
  },

  removeStatusEffect: (characterId, effectId) => {
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? { ...c, statusEffects: c.statusEffects.filter((e) => e.id !== effectId) }
          : c,
      ),
    }));
  },

  decrementAllStatusTurns: () => {
    set((state) => ({
      characters: state.characters.map((c) => ({
        ...c,
        statusEffects: c.statusEffects
          .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
          .filter((e) => e.remainingTurns > 0),
      })),
    }));
  },

  findCharacterByName: (name) => {
    const n = name.trim().toLowerCase();
    return get().characters.find((c) => c.name.toLowerCase() === n);
  },

  getSelectedCharacter: () => {
    const { characters, selectedCharacterId } = get();
    return characters.find((c) => c.id === selectedCharacterId);
  },

  getAttributeModifier: (characterId, attr) => {
    const char = get().characters.find((c) => c.id === characterId);
    if (!char) return 0;
    return Math.floor((char.attributes[attr] - 10) / 2);
  },
}));
