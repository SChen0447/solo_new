import type { CharacterAsset, PropAsset } from './types'

export const CHARACTERS: CharacterAsset[] = [
  { id: 'char-1', name: '勇敢骑士', type: 'character', emoji: '🧑‍🦰', color: '#4A90D9' },
  { id: 'char-2', name: '魔法公主', type: 'character', emoji: '👸', color: '#E91E63' },
  { id: 'char-3', name: '智慧老人', type: 'character', emoji: '🧙', color: '#9C27B0' },
  { id: 'char-4', name: '可爱精灵', type: 'character', emoji: '🧚', color: '#00BCD4' },
  { id: 'char-5', name: '威猛战士', type: 'character', emoji: '🦸', color: '#FF5722' },
  { id: 'char-6', name: '神秘旅人', type: 'character', emoji: '🥷', color: '#607D8B' },
  { id: 'char-7', name: '快乐小丑', type: 'character', emoji: '🤡', color: '#FFC107' },
  { id: 'char-8', name: '优雅女王', type: 'character', emoji: '👑', color: '#795548' },
]

export const PROPS: PropAsset[] = [
  { id: 'prop-1', name: '大树', type: 'prop', emoji: '🌳' },
  { id: 'prop-2', name: '房子', type: 'prop', emoji: '🏠' },
  { id: 'prop-3', name: '魔法棒', type: 'prop', emoji: '🪄' },
  { id: 'prop-4', name: '宝剑', type: 'prop', emoji: '⚔️' },
  { id: 'prop-5', name: '城堡', type: 'prop', emoji: '🏰' },
  { id: 'prop-6', name: '彩虹', type: 'prop', emoji: '🌈' },
  { id: 'prop-7', name: '星星', type: 'prop', emoji: '⭐' },
  { id: 'prop-8', name: '月亮', type: 'prop', emoji: '🌙' },
]

export const ALL_ASSETS = [...CHARACTERS, ...PROPS]
