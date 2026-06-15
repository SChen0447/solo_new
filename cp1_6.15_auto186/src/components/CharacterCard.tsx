import React, { memo, useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useCharacterStore } from '@/characterStore';
import type { Character, Attributes, StatusEffect } from '@/types';
import { StatBar } from './StatBar';
import { StatusEffectIcon } from './StatusEffectIcon';

const ATTR_KEYS: (keyof Attributes)[] = [
  'strength',
  'agility',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const ATTR_CN: Record<keyof Attributes, string> = {
  strength: '力',
  agility: '敏',
  constitution: '体',
  intelligence: '智',
  wisdom: '感',
  charisma: '魅',
};

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function CharacterCardBase({
  character,
  isSelected,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: CharacterCardProps) {
  const selectCharacter = useCharacterStore((s) => s.selectCharacter);
  const removeCharacter = useCharacterStore((s) => s.removeCharacter);
  const setHp = useCharacterStore((s) => s.setHp);
  const removeStatusEffect = useCharacterStore((s) => s.removeStatusEffect);

  const longPressTimer = useRef<number | null>(null);
  const [editingHp, setEditingHp] = useState(false);
  const dragStarted = useRef(false);

  const handleClick = useCallback(() => {
    if (!dragStarted.current) {
      dragStarted.current = false;
      return;
    }
    selectCharacter(character.id);
  }, [character.id, selectCharacter]);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = window.setTimeout(() => {
      dragStarted.current = true;
    }, 250);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleHpEdit = useCallback(() => {
    if (!isSelected) return;
    setEditingHp(true);
  }, [isSelected]);

  const handleHpChange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const valStr = window.prompt(`编辑 ${character.name} 的生命值 (0-${character.maxHp})`, String(character.hp));
      if (valStr !== null) {
        const val = parseInt(valStr, 10);
        if (!Number.isNaN(val)) setHp(character.id, val);
      }
      setEditingHp(false);
    },
    [character.id, character.hp, character.maxHp, character.name, setHp],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(`确定删除角色 "${character.name}" ?`)) {
        removeCharacter(character.id);
      }
    },
    [character.id, character.name, removeCharacter],
  );

  const handleRemoveEffect = useCallback(
    (effectId: string) => {
      removeStatusEffect(character.id, effectId);
    },
    [character.id, removeStatusEffect],
  );

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(index);
    isDraggingRef.current = true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(index);
  };

  const handleDragEnd = () => {
    onDragEnd();
    isDraggingRef.current = false;
  };

  const isDraggingRef = useRef(false);

  const classes = [
    'character-card',
    isSelected ? 'selected' :