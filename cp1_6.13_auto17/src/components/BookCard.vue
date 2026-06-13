<template>
  <div
    ref="cardRef"
    class="book-card"
    :class="{
      'is-read': book.status === 'read',
      'is-dragging': isDragging,
      'is-slotting': isSlotting,
      'is-highlighted': isHighlighted,
      'is-flow-in': isFlowIn
    }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-inner" :style="cardInnerStyle">
      <div class="cover-wrap">
        <img
          class="cover"
          :src="book.coverUrl"
          :alt="book.title"
          loading="lazy"
          @error="onCoverError"
        />
        <div v-if="book.status === 'read'" class="read-badge">
          <span>✓ 已读</span>
        </div>
        <div v-if="book.status === 'reading'" class="reading-badge">
          <span>📖 在读</span>
        </div>
      </div>

      <div class="card-body">
        <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
        <p class="book-author">{{ book.author }}</p>

        <div class="tag-list">
          <span
            v-for="t in book.tags"
            :key="t"
            class="tag-chip"
          >{{ t }}</span>
        </div>

        <div class="status-switcher">
          <button
            v-for="st in statuses"
            :key="st.value"
            class="status-btn"
            :class="{ active: book.status === st.value }"
            @click.stop="onStatusClick(st.value, $event)"
          >{{ st.label }}</button>
        </div>
      </div>

      <button class="delete-btn" @click.stop="onDelete($event)" title="删除">
        ✕
      </button>
    </div>

    <Transition name="highlight-overlay">
      <div v-if="isHighlighted" class="highlight-overlay">
        <div class="highlight-title">{{ book.title }}</div>
        <div class="highlight-author">— {{ book.author }}</div>
      </div>
    </Transition>

    <Transition name="particle">
      <div v-if="showParticles" class="particle-container">
        <span
          v-for="(p, i) in particles"
          :key="i"
          class="particle"
          :style="p.style"
        ></span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Book, ReadingStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

const props = defineProps<{
  book: Book
  isSlotting?: boolean
  isHighlighted?: boolean
  flowInDelay?: number
}>()

const emit = defineEmits<{
  (e: 'update:status', status: ReadingStatus): void
  (e: 'drag-start', payload: { id: string; el: HTMLElement }): void
  (e: 'drag-end'): void
  (e: 'delete'): void
  (e: 'highlight-done'): void
}>()

const cardRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isDragging = ref(false)
const isFlowIn = ref(false)
const showParticles = ref(false)

const statuses: { value: ReadingStatus; label: string }[] = [
  { value: 'unread', label: STATUS_LABELS.unread },
  { value: 'reading', label: STATUS_LABELS.reading },
  { value: 'read', label: STATUS_LABELS.read }
]

interface Particle {
  style: Record<string, string>
}

const particles = ref<Particle[]>([])

const cardInnerStyle = computed(() => {
  if (isHovered.value && !isDragging.value) {
    return {
      transform: 'translateY(-4px)',
      boxShadow: '0 6px 20px rgba(62, 39, 35, 0.35)'
    }
  }
  return {}
})

const createRipple = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const ripple = document.createElement('span')
  ripple.className = 'ripple-effect'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`
  target.appendChild(ripple)
  setTimeout(() => ripple.remove(), 600)
}

const onStatusClick = (status: ReadingStatus, e: MouseEvent) => {
  createRipple(e)
  emit('update:status', status)
}

const onDelete = (e: MouseEvent) => {
  createRipple(e)
  emit('delete')
}

const onDragStart = (e: DragEvent) => {
  if (!e.dataTransfer || !cardRef.value) return
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.book.id)
  try {
    e.dataTransfer.setDragImage(cardRef.value, 80, 120)
  } catch {
    /* ignore */
  }
  emit('drag-start', { id: props.book.id, el: cardRef.value })
}

const onDragEnd = () => {
  isDragging.value = false
  emit('drag-end')
}

const onCoverError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect fill="%23fff8e1" width="300" height="400"/><text x="50%25" y="50%25" font-family="sans-serif" font-size="18" fill="%233e2723" text-anchor="middle" dominant-baseline="middle">📖 无封面</text></svg>'
}

const explodeParticles = () => {
  const colors = ['#ff9800', '#ffb74d', '#ffe082', '#f57c00', '#fff176', '#ffc107']
  const count = 32
  const result: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const dist = 70 + Math.random() * 60
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist
    const size = 6 + Math.random() * 8
    const color = colors[Math.floor(Math.random() * colors.length)]
    const delay = Math.random() * 0.1
    result.push({
      style: {
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        animationDelay: `${delay}s`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px'
      }
    })
  }
  particles.value = result
  showParticles.value = true
  setTimeout(() => {
    showParticles.value = false
    particles.value = []
  }, 1000)
}

let flowInTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  const delay = props.flowInDelay ?? 0
  flowInTimer = setTimeout(() => {
    isFlowIn.value = true
  }, 50 + delay)
})

watch(() => props.isHighlighted, (val, old) => {
  if (val && !old) {
    explodeParticles()
    const timer = setTimeout(() => {
      emit('highlight-done')
    }, 2500)
    onBeforeUnmount(() => clearTimeout(timer))
  }
})

onBeforeUnmount(() => {
  if (flowInTimer) clearTimeout(flowInTimer)
})
</script>

<style scoped>
.book-card {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  cursor: grab;
  user-select: none;
  perspective: 1000px;
  opacity: 0;
  transform: translateX(-30px) scale(0.85);
  transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.book-card.is-flow-in {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.book-card.is-dragging {
  z-index: 50;
  opacity: 0.35;
  transform: scale(0.92);
  pointer-events: none;
}

.book-card.is-slotting {
  animation: slotShake 0.12s linear infinite;
}

.book-card.is-highlighted {
  z-index: 200;
}

.book-card.is-highlighted .card-inner {
  animation: highlightPulse 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  border-color: #ff9800 !important;
  background: linear-gradient(135deg, #fff8e1 0%, #fff3c4 100%) !important;
}

@keyframes slotShake {
  0% { transform: translateX(-2px) scale(0.98); opacity: 0.55; }
  25% { transform: translateX(2px) scale(1.02); opacity: 0.9; }
  50% { transform: translateX(-1px) scale(0.99); opacity: 0.7; }
  75% { transform: translateX(3px) scale(1.01); opacity: 1; }
  100% { transform: translateX(-2px) scale(0.98); opacity: 0.6; }
}

@keyframes highlightPulse {
  0% { transform: scale(1); box-shadow: 0 4px 12px rgba(62, 39, 35, 0.3); }
  40% { transform: scale(1.12); box-shadow: 0 20px 48px rgba(255, 152, 0, 0.55), 0 0 40px rgba(255, 193, 7, 0.4); }
  100% { transform: scale(1.08); box-shadow: 0 14px 36px rgba(255, 152, 0, 0.45), 0 0 24px rgba(255, 193, 7, 0.3); }
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff8e1;
  border: 2px solid #8d6e63;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(62, 39, 35, 0.2);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
  display: flex;
  flex-direction: column;
}

.book-card.is-read .card-inner {
  filter: grayscale(0.7) opacity(0.8);
  background: #efebe9;
}

.cover-wrap {
  position: relative;
  width: 100%;
  flex: 1 1 62%;
  overflow: hidden;
  background: #d7ccc8;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.book-card:hover:not(.is-dragging):not(.is-slotting) .cover {
  transform: scale(1.05);
}

.read-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #66bb6a, #388e3c);
  color: #fff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(56, 142, 60, 0.4);
}

.reading-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(245, 124, 0, 0.4);
}

.card-body {
  flex: 1 1 38%;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff8e1;
  position: relative;
}

.book-title {
  font-size: 15px;
  font-weight: 700;
  color: #3e2723;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  font-size: 12px;
  color: #795548;
  margin: 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.tag-chip {
  font-size: 10px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ffe082, #ffc107);
  color: #5d4037;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.status-switcher {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.status-btn {
  flex: 1;
  padding: 4px 0;
  font-size: 11px;
  border: 1px solid #bcaaa4;
  background: #fff;
  color: #6d4c41;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.status-btn:hover:not(.active) {
  background: #ffe0b2;
  border-color: #8d6e63;
}

.status-btn.active {
  background: linear-gradient(135deg, #5d4037, #3e2723);
  color: #fff8e1;
  border-color: #3e2723;
}

.ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple 0.6s ease-out;
  pointer-events: none;
  z-index: 10;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.status-btn .ripple-effect {
  background: rgba(62, 39, 35, 0.25);
}

.delete-btn {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(62, 39, 35, 0.75);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  overflow: hidden;
  position: absolute;
}

.book-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

.highlight-overlay {
  position: absolute;
  bottom: -56px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 140%;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.5);
  z-index: 210;
  pointer-events: none;
}

.highlight-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.highlight-author {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.9;
  font-style: italic;
}

.highlight-overlay-enter-active,
.highlight-overlay-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.highlight-overlay-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.highlight-overlay-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.particle-container {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 220;
}

.particle {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(0, 0) scale(1);
  animation: particleExplode 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

@keyframes particleExplode {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

.particle-enter-active,
.particle-leave-active {
  transition: opacity 0.1s;
}
</style>
