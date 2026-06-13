<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, type PropType } from 'vue'
import type { HistoryEvent, ERAS } from '@/data/events'
import { ERAS as ERA_LIST } from '@/data/events'

interface EraType {
  key: string
  label: string
}

const props = defineProps({
  searchResults: {
    type: Array as PropType<HistoryEvent[]>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (e: 'search', keyword: string): void
  (e: 'select', event: HistoryEvent): void
}>()

const inputValue = ref('')
const selectedIndex = ref(-1)
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)

let debounceTimer: number | null = null

function onInput() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = window.setTimeout(() => {
    emit('search', inputValue.value)
    selectedIndex.value = -1
    showDropdown.value = inputValue.value.trim().length > 0
    debounceTimer = null
  }, 300)
}

function onKeyDown(e: KeyboardEvent) {
  if (!showDropdown.value || props.searchResults.length === 0) {
    if (e.key === 'Enter' && inputValue.value.trim()) {
      emit('search', inputValue.value)
      showDropdown.value = true
    }
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % props.searchResults.length
      scrollSelectedIntoView()
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value =
        selectedIndex.value <= 0
          ? props.searchResults.length - 1
          : selectedIndex.value - 1
      scrollSelectedIntoView()
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex.value >= 0 && selectedIndex.value < props.searchResults.length) {
        handleSelect(props.searchResults[selectedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      showDropdown.value = false
      selectedIndex.value = -1
      break
  }
}

function scrollSelectedIntoView() {
  nextTick(() => {
    if (!dropdownRef.value) return
    const el = dropdownRef.value.querySelector<HTMLElement>(
      `.search-result-item[data-index="${selectedIndex.value}"]`
    )
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}

function handleSelect(event: HistoryEvent) {
  emit('select', event)
  showDropdown.value = false
  inputValue.value = ''
  selectedIndex.value = -1
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    inputRef.value &&
    !inputRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    showDropdown.value = false
  }
}

function getEraLabel(key: string): string {
  const found = (ERA_LIST as EraType[]).find((e) => e.key === key)
  return found ? found.label : key
}

function highlightText(text: string, keyword: string): string {
  if (!keyword.trim()) return text
  try {
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${esc})`, 'gi'), '<<<HIGHLIGHT>>>$1<<</HIGHLIGHT>>>')
  } catch {
    return text
  }
}

watch(
  () => props.searchResults,
  () => {
    if (selectedIndex.value >= props.searchResults.length) {
      selectedIndex.value = -1
    }
  }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="search-panel">
    <div class="search-input-wrapper">
      <span class="search-icon" aria-hidden="true">⌕</span>
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="search-input"
        placeholder="搜索历史事件、关键词或年份……"
        @input="onInput"
        @keydown="onKeyDown"
        @focus="showDropdown = inputValue.trim().length > 0"
        aria-label="搜索历史事件"
        aria-autocomplete="list"
        :aria-expanded="showDropdown"
      />
      <div v-if="loading" class="search-spinner" aria-hidden="true"></div>
    </div>

    <Transition
      enter-active-class="dropdown-enter-active"
      leave-active-class="dropdown-leave-active"
      enter-from-class="dropdown-enter-from"
      leave-to-class="dropdown-leave-to"
    >
      <div
        v-if="showDropdown && inputValue.trim()"
        ref="dropdownRef"
        class="search-dropdown"
        role="listbox"
      >
        <div v-if="loading && searchResults.length === 0" class="search-empty">
          正在搜索……
        </div>
        <div
          v-else-if="searchResults.length === 0"
          class="search-empty"
        >
          <span class="empty-icon">📜</span>
          <p>没有找到相关的历史事件</p>
          <p class="empty-hint">试试其他关键词吧</p>
        </div>
        <template v-else>
          <div class="search-count">
            找到 <strong>{{ searchResults.length }}</strong> 条结果
            <span class="kbd-hint" v-if="searchResults.length > 1">↑↓ 选择</span>
          </div>
          <ul class="search-results-list">
            <li
              v-for="(event, idx) in searchResults"
              :key="event.id"
              class="search-result-item"
              :class="{ selected: selectedIndex === idx }"
              :data-index="idx"
              role="option"
              :aria-selected="selectedIndex === idx"
              tabindex="-1"
              @click="handleSelect(event)"
              @mouseenter="selectedIndex = idx"
            >
              <div class="result-main">
                <div class="result-title">
                  <span
                    v-html="highlightText(event.title, inputValue).replace(/<<<HIGHLIGHT>>>(.*?)<<<\/HIGHLIGHT>>>/g, '<mark>$1</mark>')"
                  ></span>
                </div>
                <div class="result-meta">
                  <span class="result-year">{{ event.year }}</span>
                  <span class="result-era" v-for="era in event.eras" :key="era">
                    {{ getEraLabel(era) }}
                  </span>
                </div>
              </div>
              <div class="result-desc">
                <span
                  v-html="highlightText(event.description.slice(0, 60) + (event.description.length > 60 ? '…' : ''), inputValue).replace(/<<<HIGHLIGHT>>>(.*?)<<<\/HIGHLIGHT>>>/g, '<mark>$1</mark>')"
                ></span>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.search-panel {
  position: relative;
  width: 100%;
  max-width: 520px;
  z-index: 100;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  font-size: 20px;
  color: #d4a574;
  pointer-events: none;
  z-index: 2;
  opacity: 0.8;
}

.search-input {
  width: 100%;
  padding: 12px 44px 12px 46px;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 15px;
  color: #f4e7cf;
  background: rgba(44, 24, 16, 0.6);
  border: 1px solid rgba(212, 165, 116, 0.6);
  border-radius: 10px;
  outline: none;
  transition:
    border-color 200ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
    background 200ms cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
}

.search-input::placeholder {
  color: rgba(212, 165, 116, 0.45);
  font-style: italic;
}

.search-input:focus {
  border-color: rgba(212, 165, 116, 1);
  box-shadow:
    0 0 0 3px rgba(212, 165, 116, 0.15),
    0 0 20px rgba(212, 165, 116, 0.08);
  background: rgba(44, 24, 16, 0.85);
}

.search-spinner {
  position: absolute;
  right: 14px;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(212, 165, 116, 0.25);
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #3a2418 0%, #2c1810 100%);
  border: 1px solid rgba(212, 165, 116, 0.6);
  border-radius: 12px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 165, 116, 0.15),
    inset 0 1px 0 rgba(212, 165, 116, 0.08);
  backdrop-filter: blur(16px);
  z-index: 200;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.search-empty {
  padding: 40px 24px;
  text-align: center;
  color: rgba(212, 165, 116, 0.6);
  font-family: 'Georgia', serif;
}

.empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.6;
}

.search-empty p {
  margin: 4px 0;
  font-size: 14px;
}

.empty-hint {
  opacity: 0.6;
  font-size: 13px;
  font-style: italic;
}

.search-count {
  padding: 10px 16px;
  font-family: 'Georgia', serif;
  font-size: 12.5px;
  color: rgba(212, 165, 116, 0.7);
  border-bottom: 1px solid rgba(212, 165, 116, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: 0.3px;
}

.search-count strong {
  color: #d4a574;
  font-weight: 700;
  font-size: 13.5px;
}

.kbd-hint {
  opacity: 0.55;
  font-size: 11.5px;
  font-style: italic;
}

.search-results-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.search-results-list::-webkit-scrollbar {
  width: 6px;
}

.search-results-list::-webkit-scrollbar-track {
  background: transparent;
}

.search-results-list::-webkit-scrollbar-thumb {
  background: rgba(212, 165, 116, 0.3);
  border-radius: 3px;
}

.search-results-list::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 165, 116, 0.5);
}

.search-result-item {
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 150ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  margin-bottom: 2px;
}

.search-result-item:last-child {
  margin-bottom: 0;
}

.search-result-item:hover,
.search-result-item.selected {
  background: rgba(212, 165, 116, 0.12);
  border-color: rgba(212, 165, 116, 0.35);
}

.search-result-item.selected {
  background: rgba(212, 165, 116, 0.18);
}

.result-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 6px;
}

.result-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 15px;
  font-weight: 600;
  color: #f4e7cf;
  line-height: 1.4;
}

.result-title :deep(mark) {
  background: rgba(212, 165, 116, 0.35);
  color: #fff4df;
  padding: 0 3px;
  border-radius: 3px;
  font-weight: 700;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-family: 'Georgia', serif;
}

.result-year {
  padding: 2px 8px;
  background: rgba(212, 165, 116, 0.18);
  color: #d4a574;
  border-radius: 10px;
  font-weight: 600;
  border: 1px solid rgba(212, 165, 116, 0.3);
}

.result-era {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(212, 165, 116, 0.8);
  border-radius: 10px;
  border: 1px solid rgba(212, 165, 116, 0.15);
}

.result-desc {
  font-family: 'Georgia', serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(212, 165, 116, 0.6);
}

.result-desc :deep(mark) {
  background: rgba(212, 165, 116, 0.25);
  color: #eacfa5;
  padding: 0 2px;
  border-radius: 2px;
}

@media (max-width: 640px) {
  .search-panel {
    max-width: 100%;
  }

  .search-input {
    font-size: 14px;
    padding: 10px 40px 10px 42px;
  }

  .search-dropdown {
    max-height: 60vh;
  }
}
</style>
