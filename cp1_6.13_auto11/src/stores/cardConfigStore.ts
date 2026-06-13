import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { CardConfigMap, CardType, CardConfig } from '../types/card'
import { DEFAULT_CONFIGS } from '../types/card'

const STORAGE_KEY = 'dashboard_card_configs'

function loadFromStorage(): CardConfigMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load card configs from localStorage:', e)
  }
  return {}
}

function saveToStorage(configs: CardConfigMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  } catch (e) {
    console.error('Failed to save card configs to localStorage:', e)
  }
}

export const useCardConfigStore = defineStore('cardConfig', () => {
  const configs = ref<CardConfigMap>(loadFromStorage())

  watch(
    configs,
    (newConfigs) => {
      saveToStorage(newConfigs)
    },
    { deep: true }
  )

  function getConfig(instanceId: string, type: CardType): CardConfig {
    if (configs.value[instanceId]) {
      return configs.value[instanceId]
    }
    return { ...DEFAULT_CONFIGS[type] }
  }

  function updateConfig(instanceId: string, config: CardConfig): void {
    configs.value[instanceId] = { ...config }
  }

  function removeConfig(instanceId: string): void {
    if (configs.value[instanceId]) {
      delete configs.value[instanceId]
    }
  }

  function resetConfig(instanceId: string, type: CardType): void {
    configs.value[instanceId] = { ...DEFAULT_CONFIGS[type] }
  }

  function resetAllConfigs(): void {
    configs.value = {}
  }

  function initConfigIfNeeded(instanceId: string, type: CardType): void {
    if (!configs.value[instanceId]) {
      configs.value[instanceId] = { ...DEFAULT_CONFIGS[type] }
    }
  }

  return {
    configs,
    getConfig,
    updateConfig,
    removeConfig,
    resetConfig,
    resetAllConfigs,
    initConfigIfNeeded
  }
})
