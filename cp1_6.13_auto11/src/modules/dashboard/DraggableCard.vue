<template>
  <div
    v-draggable="{
      instanceId,
      type,
      isDraggable: !isFromSidebar,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd
    }"
    class="card-wrapper"
    :class="{
      'is-dragging': isDragging,
      'is-placeholder': isPlaceholder,
      'is-new': isNew,
      'card-from-sidebar': isFromSidebar
    }"
    :data-instance-id="instanceId"
    :data-card-type="type"
    @click.stop
  >
    <div class="card" :class="`card-${type}`">
      <div class="card-header">
        <span class="card-icon">{{ cardIcon }}</span>
        <span class="card-title">{{ cardTitle }}</span>
        <div class="card-actions" v-if="!isFromSidebar && !isPlaceholder">
          <button class="card-btn settings-btn" @click.stop="openSettings" title="设置">
            ⚙️
          </button>
          <button class="card-btn delete-btn" @click.stop="removeCard" title="删除">
            ✕
          </button>
        </div>
        <div class="drag-handle" v-if="!isFromSidebar && !isPlaceholder" title="拖拽排序">
          ⋮⋮
        </div>
      </div>
      <div class="card-content">
        <WeatherContent v-if="type === 'weather'" :config="weatherConfig" />
        <RssContent v-else-if="type === 'rss'" :config="rssConfig" />
        <ClockContent v-else-if="type === 'clock'" :config="clockConfig" />
        <CalendarContent v-else-if="type === 'calendar'" :config="calendarConfig" />
        <ChartContent v-else-if="type === 'chart'" :config="chartConfig" />
        <div v-else-if="isFromSidebar" class="sidebar-card-preview">
          <span>拖拽到右侧添加</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import type { DirectiveBinding } from 'vue'
import type { CardType, WeatherConfig, RssConfig, ClockConfig, CalendarConfig, ChartConfig } from '../../types/card'
import { CARD_TYPES } from '../../types/card'
import { useCardConfigStore } from '../../stores/cardConfigStore'
import { useLayoutStore } from '../../stores/layoutStore'
import WeatherContent from './cards/WeatherContent.vue'
import RssContent from './cards/RssContent.vue'
import ClockContent from './cards/ClockContent.vue'
import CalendarContent from './cards/CalendarContent.vue'
import ChartContent from './cards/ChartContent.vue'

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  ghost: HTMLElement | null
}

export default defineComponent({
  name: 'DraggableCard',
  components: {
    WeatherContent,
    RssContent,
    ClockContent,
    CalendarContent,
    ChartContent
  },
  props: {
    instanceId: {
      type: String,
      required: true
    },
    type: {
      type: String as () => CardType,
      required: true
    },
    isFromSidebar: {
      type: Boolean,
      default: false
    },
    isPlaceholder: {
      type: Boolean,
      default: false
    }
  },
  emits: ['openSettings', 'dragStart', 'dragEnd'],
  setup(props, { emit }) {
    const cardConfigStore = useCardConfigStore()
    const layoutStore = useLayoutStore()
    const isDragging = ref(false)
    const isNew = ref(false)

    const cardInfo = computed(() => {
      return CARD_TYPES.find((c) => c.type === props.type) || { label: '', icon: '' }
    })

    const cardIcon = computed(() => cardInfo.value.icon)
    const cardTitle = computed(() => cardInfo.value.label)

    const weatherConfig = computed(() => cardConfigStore.getConfig(props.instanceId, props.type) as WeatherConfig)
    const rssConfig = computed(() => cardConfigStore.getConfig(props.instanceId, props.type) as RssConfig)
    const clockConfig = computed(() => cardConfigStore.getConfig(props.instanceId, props.type) as ClockConfig)
    const calendarConfig = computed(() => cardConfigStore.getConfig(props.instanceId, props.type) as CalendarConfig)
    const chartConfig = computed(() => cardConfigStore.getConfig(props.instanceId, props.type) as ChartConfig)

    watch(
      () => props.instanceId,
      () => {
        if (!props.isFromSidebar && !props.isPlaceholder) {
          cardConfigStore.initConfigIfNeeded(props.instanceId, props.type)
          isNew.value = true
          setTimeout(() => {
            isNew.value = false
          }, 500)
        }
      },
      { immediate: true }
    )

    function handleDragStart() {
      isDragging.value = true
      emit('dragStart', { instanceId: props.instanceId, type: props.type })
    }

    function handleDragEnd() {
      isDragging.value = false
      emit('dragEnd', { instanceId: props.instanceId, type: props.type })
    }

    function openSettings() {
      emit('openSettings', { instanceId: props.instanceId, type: props.type })
    }

    function removeCard() {
      layoutStore.removeCard(props.instanceId)
      cardConfigStore.removeConfig(props.instanceId)
    }

    return {
      isDragging,
      isNew,
      cardIcon,
      cardTitle,
      weatherConfig,
      rssConfig,
      clockConfig,
      calendarConfig,
      chartConfig,
      handleDragStart,
      handleDragEnd,
      openSettings,
      removeCard
    }
  },
  directives: {
    draggable: {
      mounted(el: HTMLElement, binding: DirectiveBinding) {
        const { isDraggable = true, onDragStart, onDragEnd, instanceId, type } = binding.value
        const dragState: DragState = {
          isDragging: false,
          startX: 0,
          startY: 0,
          offsetX: 0,
          offsetY: 0,
          ghost: null
        }

        el.setAttribute('draggable', String(isDraggable))
        el.setAttribute('data-instance-id', instanceId)
        el.setAttribute('data-card-type', type)

        function handleMouseDown(e: MouseEvent) {
          if (!isDraggable) return
          
          const target = e.target as HTMLElement
          if (target.closest('.card-btn') || target.closest('.card-actions')) {
            return
          }

          dragState.isDragging = true
          dragState.startX = e.clientX
          dragState.startY = e.clientY

          const rect = el.getBoundingClientRect()
          dragState.offsetX = e.clientX - rect.left
          dragState.offsetY = e.clientY - rect.top

          if (onDragStart) {
            onDragStart()
          }

          createGhost(e)
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
          e.preventDefault()
        }

        function createGhost(e: MouseEvent) {
          const ghost = el.cloneNode(true) as HTMLElement
          ghost.classList.add('drag-ghost')
          ghost.style.position = 'fixed'
          ghost.style.pointerEvents = 'none'
          ghost.style.zIndex = '9999'
          ghost.style.width = el.offsetWidth + 'px'
          ghost.style.opacity = '0.8'
          ghost.style.transform = 'scale(1.05)'
          ghost.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0, 0, 0, 0.3)'
          ghost.style.transition = 'opacity 0.1s ease, transform 0.1s ease'
          
          updateGhostPosition(e)
          document.body.appendChild(ghost)
          dragState.ghost = ghost
        }

        function updateGhostPosition(e: MouseEvent) {
          if (!dragState.ghost) return
          dragState.ghost.style.left = (e.clientX - dragState.offsetX) + 'px'
          dragState.ghost.style.top = (e.clientY - dragState.offsetY) + 'px'
        }

        function handleMouseMove(e: MouseEvent) {
          if (!dragState.isDragging) return
          updateGhostPosition(e)

          const customEvent = new CustomEvent('card-drag-move', {
            bubbles: true,
            detail: {
              instanceId,
              type,
              clientX: e.clientX,
              clientY: e.clientY,
              fromSidebar: binding.value.isFromSidebar
            }
          })
          el.dispatchEvent(customEvent)
        }

        function handleMouseUp(e: MouseEvent) {
          if (!dragState.isDragging) return
          
          dragState.isDragging = false

          const customEvent = new CustomEvent('card-drag-drop', {
            bubbles: true,
            detail: {
              instanceId,
              type,
              clientX: e.clientX,
              clientY: e.clientY,
              fromSidebar: binding.value.isFromSidebar
            }
          })
          el.dispatchEvent(customEvent)

          if (dragState.ghost) {
            dragState.ghost.style.transform = 'scale(1)'
            setTimeout(() => {
              if (dragState.ghost && dragState.ghost.parentNode) {
                dragState.ghost.parentNode.removeChild(dragState.ghost)
              }
              dragState.ghost = null
            }, 100)
          }

          if (onDragEnd) {
            onDragEnd()
          }

          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }

        el.addEventListener('mousedown', handleMouseDown)

        ;(el as any).__dragCleanup = () => {
          el.removeEventListener('mousedown', handleMouseDown)
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
          if (dragState.ghost && dragState.ghost.parentNode) {
            dragState.ghost.parentNode.removeChild(dragState.ghost)
          }
        }
      },
      updated(el: HTMLElement, binding: DirectiveBinding) {
        const { isDraggable = true } = binding.value
        el.setAttribute('draggable', String(isDraggable))
      },
      unmounted(el: HTMLElement) {
        if ((el as any).__dragCleanup) {
          ;(el as any).__dragCleanup()
        }
      }
    }
  }
})
</script>

<style scoped>
.card-wrapper {
  position: relative;
  width: 100%;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform, opacity;
}

.card-wrapper.is-new {
  animation: elasticBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.card-wrapper.is-placeholder {
  opacity: 0.4;
  pointer-events: none;
}

.card-wrapper.is-dragging {
  opacity: 0.3;
  transform: scale(0.95);
}

.card-wrapper.card-from-sidebar {
  cursor: grab;
  user-select: none;
}

.card-wrapper.card-from-sidebar:active {
  cursor: grabbing;
}

.card {
  background: #1e1e1e;
  border: 2px solid #333333;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card:hover {
  border-color: #4fc3f7;
  box-shadow: 0 0 15px rgba(79, 195, 247, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333333;
  gap: 8px;
}

.card-icon {
  font-size: 20px;
}

.card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card:hover .card-actions {
  opacity: 1;
}

.card-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #888888;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
}

.card-btn:hover {
  background: #333333;
  color: #ffffff;
}

.settings-btn:hover {
  color: #4fc3f7;
}

.delete-btn:hover {
  color: #ef5350;
}

.drag-handle {
  cursor: grab;
  color: #666666;
  padding: 0 4px;
  font-size: 16px;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.card-content {
  flex: 1;
  padding: 16px;
  min-height: 200px;
}

.sidebar-card-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666666;
  font-size: 12px;
}

.drag-ghost {
  pointer-events: none;
}

@keyframes elasticBounce {
  0% {
    transform: scale(1.1);
  }
  30% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.02);
  }
  70% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 1199px) and (min-width: 768px) {
  .card-content {
    min-height: 180px;
  }
}

@media (max-width: 767px) {
  .card-content {
    min-height: 160px;
  }
}
</style>
