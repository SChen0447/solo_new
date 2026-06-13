import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { CardItem, CardType } from '../types/card'

const STORAGE_KEY = 'dashboard_layout'

const DEFAULT_LAYOUT: CardItem[] = [
  { id: 'weather-1', type: 'weather', instanceId: 'weather-1' },
  { id: 'clock-1', type: 'clock', instanceId: 'clock-1' },
  { id: 'rss-1', type: 'rss', instanceId: 'rss-1' },
  { id: 'calendar-1', type: 'calendar', instanceId: 'calendar-1' },
  { id: 'chart-1', type: 'chart', instanceId: 'chart-1' }
]

function loadFromStorage(): CardItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load layout from localStorage:', e)
  }
  return [...DEFAULT_LAYOUT]
}

function saveToStorage(layout: CardItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch (e) {
    console.error('Failed to save layout to localStorage:', e)
  }
}

export const useLayoutStore = defineStore('layout', () => {
  const cards = ref<CardItem[]>(loadFromStorage())

  watch(
    cards,
    (newCards) => {
      saveToStorage(newCards)
    },
    { deep: true }
  )

  function addCard(type: CardType, index?: number): string {
    const timestamp = Date.now()
    const instanceId = `${type}-${timestamp}`
    const newCard: CardItem = {
      id: instanceId,
      type,
      instanceId
    }
    
    if (index !== undefined && index >= 0 && index <= cards.value.length) {
      cards.value.splice(index, 0, newCard)
    } else {
      cards.value.push(newCard)
    }
    
    return instanceId
  }

  function removeCard(instanceId: string): void {
    const index = cards.value.findIndex((c) => c.instanceId === instanceId)
    if (index !== -1) {
      cards.value.splice(index, 1)
    }
  }

  function moveCard(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= cards.value.length) return
    if (toIndex < 0 || toIndex > cards.value.length) return

    const [card] = cards.value.splice(fromIndex, 1)
    const adjustedIndex = toIndex > fromIndex ? toIndex - 1 : toIndex
    cards.value.splice(adjustedIndex, 0, card)
  }

  function getCardIndex(instanceId: string): number {
    return cards.value.findIndex((c) => c.instanceId === instanceId)
  }

  function resetLayout(): void {
    cards.value = [...DEFAULT_LAYOUT]
  }

  function clearLayout(): void {
    cards.value = []
  }

  return {
    cards,
    addCard,
    removeCard,
    moveCard,
    getCardIndex,
    resetLayout,
    clearLayout
  }
})
