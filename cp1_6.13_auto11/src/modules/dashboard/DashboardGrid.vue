<template>
  <div
    ref="gridRef"
    class="dashboard-grid"
    :class="{
      'is-drag-over': isDragOver,
      'is-dragging': isDragging
    }"
    @card-drag-move="handleDragMove"
    @card-drag-drop="handleDragDrop"
  >
    <TransitionGroup
      name="card-list"
      tag="div"
      class="grid-inner"
    >
      <DraggableCard
        v-for="card in layoutStore.cards"
        :key="card.instanceId"
        :instance-id="card.instanceId"
        :type="card.type"
        :is-placeholder="draggingId === card.instanceId"
        @open-settings="handleOpenSettings"
        @drag-start="handleCardDragStart"
        @drag-end="handleCardDragEnd"
      />
    </TransitionGroup>
    <div v-if="layoutStore.cards.length === 0" class="empty-hint">
      <div class="empty-icon">📋</div>
      <div class="empty-text">拖拽左侧卡片到此处开始构建仪表盘</div>
    </div>
    <div
      v-if="showDropIndicator"
      class="drop-indicator"
      :style="dropIndicatorStyle"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import DraggableCard from './DraggableCard.vue'
import { useLayoutStore } from '../../stores/layoutStore'
import type { CardType } from '../../types/card'

interface CardRect {
  instanceId: string
  rect: DOMRect
  index: number
}

export default defineComponent({
  name: 'DashboardGrid',
  components: {
    DraggableCard
  },
  emits: ['openSettings'],
  setup(_, { emit }) {
    const layoutStore = useLayoutStore()
    const gridRef = ref<HTMLElement | null>(null)
    const isDragging = ref(false)
    const isDragOver = ref(false)
    const draggingId = ref<string | null>(null)
    const draggingType = ref<CardType | null>(null)
    const isFromSidebar = ref(false)
    const dropTargetIndex = ref(-1)
    const showDropIndicator = ref(false)
    const cardRects = reactive<CardRect[]>([])
    const rafId = ref<number | null>(null)

    const dropIndicatorStyle = computed(() => {
      if (!gridRef.value || dropTargetIndex.value < 0) {
        return {}
      }
      const index = dropTargetIndex.value
      const cols = getColumnCount()
      const row = Math.floor(index / cols)
      const col = index % cols
      const gap = 24
      const padding = 0
      const cardWidth = (gridRef.value.clientWidth - padding * 2 - gap * (cols - 1)) / cols
      const cardHeight = 280

      return {
        left: `${padding + col * (cardWidth + gap)}px`,
        top: `${padding + row * (cardHeight + gap)}px`,
        width: `${cardWidth}px`,
        height: `${cardHeight}px`
      }
    })

    function getColumnCount(): number {
      if (!gridRef.value) return 3
      const width = gridRef.value.clientWidth
      if (width >= 1200) return 3
      if (width >= 768) return 2
      return 1
    }

    function measureCardRects() {
      if (!gridRef.value) return
      const cards = gridRef.value.querySelectorAll('.card-wrapper')
      cardRects.length = 0
      cards.forEach((cardEl, index) => {
        const wrapper = cardEl as HTMLElement
        const instanceId = wrapper.getAttribute('data-instance-id') || ''
        const rect = wrapper.getBoundingClientRect()
        cardRects.push({
          instanceId,
          rect,
          index
        })
      })
    }

    function findDropIndex(clientX: number, clientY: number): number {
      measureCardRects()
      
      const cols = getColumnCount()
      const rows = Math.ceil(Math.max(layoutStore.cards.length, 1) / cols)
      
      if (cardRects.length === 0) {
        return 0
      }

      const gridRect = gridRef.value!.getBoundingClientRect()
      const relativeX = clientX - gridRect.left
      const relativeY = clientY - gridRect.top
      const gap = 24
      const cardWidth = cardRects[0]?.rect.width || 200
      const cardHeight = cardRects[0]?.rect.height || 280
      const effectiveCardW = cardWidth + gap
      const effectiveCardH = cardHeight + gap

      if (relativeX < 0 || relativeY < 0) {
        return 0
      }

      let col = Math.floor(relativeX / effectiveCardW)
      let row = Math.floor(relativeY / effectiveCardH)
      
      col = Math.min(Math.max(col, 0), cols - 1)
      row = Math.min(Math.max(row, 0), rows)

      const centerX = col * effectiveCardW + cardWidth / 2
      const centerY = row * effectiveCardH + cardHeight / 2
      
      if (relativeX > centerX + cardWidth / 4 && col < cols - 1) {
        col++
      }
      if (relativeY > centerY + cardHeight / 4 && row < rows) {
        row++
      }

      let targetIndex = row * cols + col
      targetIndex = Math.min(targetIndex, layoutStore.cards.length)
      
      if (draggingId.value && !isFromSidebar.value) {
        const currentIndex = layoutStore.getCardIndex(draggingId.value)
        if (targetIndex > currentIndex) {
          targetIndex = Math.min(targetIndex, layoutStore.cards.length)
        }
      }

      return targetIndex
    }

    function handleDragMove(e: Event) {
      const customEvent = e as CustomEvent
      const { clientX, clientY, instanceId, type, fromSidebar } = customEvent.detail

      if (!isDragging.value) {
        isDragging.value = true
        draggingId.value = instanceId
        draggingType.value = type
        isFromSidebar.value = fromSidebar || false
      }

      if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value)
      }

      rafId.value = requestAnimationFrame(() => {
        if (!gridRef.value) return
        const gridRect = gridRef.value.getBoundingClientRect()
        const isInside =
          clientX >= gridRect.left &&
          clientX <= gridRect.right &&
          clientY >= gridRect.top &&
          clientY <= gridRect.bottom

        isDragOver.value = isInside
        if (isInside) {
          dropTargetIndex.value = findDropIndex(clientX, clientY)
          showDropIndicator.value = true
        } else {
          showDropIndicator.value = false
        }
      })
    }

    function handleDragDrop(e: Event) {
      const customEvent = e as CustomEvent
      const { clientX, clientY, type, fromSidebar } = customEvent.detail

      if (isDragOver.value && gridRef.value) {
        const gridRect = gridRef.value.getBoundingClientRect()
        const isInside =
          clientX >= gridRect.left &&
          clientX <= gridRect.right &&
          clientY >= gridRect.top &&
          clientY <= gridRect.bottom

        if (isInside) {
          const targetIndex = findDropIndex(clientX, clientY)
          
          if (fromSidebar) {
            layoutStore.addCard(type, targetIndex)
          } else if (draggingId.value) {
            const fromIndex = layoutStore.getCardIndex(draggingId.value)
            if (fromIndex !== -1 && fromIndex !== targetIndex) {
              layoutStore.moveCard(fromIndex, targetIndex)
            }
          }
        }
      }

      resetDragState()
    }

    function resetDragState() {
      isDragging.value = false
      isDragOver.value = false
      draggingId.value = null
      draggingType.value = null
      isFromSidebar.value = false
      dropTargetIndex.value = -1
      showDropIndicator.value = false
      if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value)
        rafId.value = null
      }
    }

    function handleCardDragStart(payload: { instanceId: string; type: CardType }) {
      isDragging.value = true
      draggingId.value = payload.instanceId
      draggingType.value = payload.type
      isFromSidebar.value = false
    }

    function handleCardDragEnd() {
      setTimeout(() => {
        resetDragState()
      }, 50)
    }

    function handleOpenSettings(payload: { instanceId: string; type: CardType }) {
      emit('openSettings', payload)
    }

    function handleSidebarDragOver(e: DragEvent) {
      e.preventDefault()
    }

    onMounted(() => {
      window.addEventListener('resize', measureCardRects)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', measureCardRects)
      if (rafId.value !== null) {
        cancelAnimationFrame(rafId.value)
      }
    })

    return {
      gridRef,
      layoutStore,
      isDragging,
      isDragOver,
      draggingId,
      showDropIndicator,
      dropIndicatorStyle,
      handleDragMove,
      handleDragDrop,
      handleCardDragStart,
      handleCardDragEnd,
      handleOpenSettings,
      handleSidebarDragOver
    }
  }
})
</script>

<style scoped>
.dashboard-grid {
  position: relative;
  width: 100%;
  min-height: 400px;
  padding: 8px;
  transition: all 0.2s ease;
}

.dashboard-grid.is-drag-over {
  background: rgba(79, 195, 247, 0.05);
  outline: 2px dashed rgba(79, 195, 247, 0.5);
  outline-offset: -2px;
  border-radius: 8px;
}

.grid-inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}

.card-list-move,
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card-list-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.card-list-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}

.card-list-leave-active {
  position: absolute;
}

.drop-indicator {
  position: absolute;
  border: 2px dashed #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 8px;
  pointer-events: none;
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  z-index: 10;
}

.empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #444444;
  pointer-events: none;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

@media (max-width: 1199px) and (min-width: 768px) {
  .grid-inner {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .grid-inner {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .dashboard-grid {
    padding: 4px;
  }
}
</style>
