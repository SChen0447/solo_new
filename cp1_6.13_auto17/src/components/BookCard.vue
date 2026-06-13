<template>
  <div
    ref="cardRef"
    class="book-card"
    :class="cardClass"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-shadow" aria-hidden="true"></div>

    <div class="card-inner" :style="innerStyle">
      <div class="cover-wrap">
        <img
          class="cover"
          :src="book.coverUrl"
          :alt="book.title"
          loading="lazy"
          @error="onCoverError"
        />
        <div v-if="book.status === 'read'" class="badge badge-read">
          <span>✓ 已读</span>
        </div>
        <div v-else-if="book.status === 'reading'" class="badge badge-reading">
          <span>📖 在读</span>
        </div>

        <div v-if="isSlotCursor" class="slot-glow"></div>
      </div>

      <div class="card-body">
        <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
        <p class="book-author">{{ book.author }}</p>

        <div class="tag-list">
          <span v-for="t in book.tags" :key="t" class="tag-chip">{{ t }}</span>
        </div>

        <div class="status-switcher">
          <button
            v-for="st in statusList"
            :key="st.value"
            class="status-btn ripple-btn"
            :class="{ active: book.status === st.value }"
            @click="onStatusClick(st.value, $event)"
          >{{ st.label }}</button>
        </div>
      </div>

      <button class="delete-btn ripple-btn" @click="onDelete($event)" title="删除">
        ✕
      </button>
    </div>

    <Transition name="winner-overlay">
      <div v-if="isWinner" class="winner-overlay">
        <div class="winner-title">{{ book.title }}</div>
        <div class="winner-author">—— {{ book.author }}</div>
      </div>
    </Transition>

    <div v-if="showParticles" class="particles">
      <span
        v-for="(p, i) in particles"
        :key="i"
        class="particle"
        :style="p.style"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import type { Book, ReadingStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

const props = defineProps<{
  book: Book
  isSlotCursor?: boolean
  isWinner?: boolean
  flowInDelay?: number
}>()

const emit = defineEmits<{
  (e: 'update:status', status: ReadingStatus): void
  (e: 'drag-start', payload: { id: string; rect: DOMRect }): void
  (e: 'drag-end'): void
  (e: 'delete'): void
  (e: 'winner-ready'): void
}>()

const cardRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isDragging = ref(false)
const isEntered = ref(false)
const showParticles = ref(false)

const statusList = [
  { value: 'unread' as ReadingStatus, label: STATUS_LABELS.unread },
  { value: 'reading' as ReadingStatus, label: STATUS_LABELS.reading },
  { value: 'read' as ReadingStatus, label: STATUS_LABELS.read }
]

interface PStyle { style: Record<string, string | number> }
const particles = ref<PStyle[]>([])

const cardClass = computed(() => ({
  'is-read': props.book.status === 'read',
  'is-hover': isHovered.value && !isDragging.value,
  'is-dragging': isDragging.value,
  'is-slot-cursor': props.isSlotCursor,
  'is-winner': props.isWinner,
  'entered': isEntered.value,
  'flow-in': true
}))

const innerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (isHovered.value && !isDragging.value && !props.isWinner) {
    style.transform = 'translateY(-4px)'
    style.boxShadow = '0 6px 20px rgba(62, 39, 35, 0.38)'
  }
  return style
})

const flowDelay = computed(() => `${(props.flowInDelay ?? 0)}ms`)

const addRipple = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.6
  const ripple = document.createElement('span')
  ripple.style.cssText = `
    position:absolute;
    border-radius:50%;
    background:rgba(255,255,255,0.55);
    width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
    transform:scale(0);
    pointer-events:none;
    animation:ripple 0.6s ease-out forwards;
    z-index:20;
  `
  target.appendChild(ripple)
  setTimeout(() => ripple.remove(), 650)
}

const onStatusClick = (s: ReadingStatus, e: MouseEvent) => {
  addRipple(e)
  emit('update:status', s)
}

const onDelete = (e: MouseEvent) => {
  addRipple(e)
  emit('delete')
}

const onDragStart = (e: DragEvent) => {
  if (!e.dataTransfer || !cardRef.value) return
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-book-id', props.book.id)
  try {
    const img = cardRef.value.cloneNode(true) as HTMLElement
    img.style.width = cardRef.value.offsetWidth + 'px'
    img.style.height = cardRef.value.offsetHeight + 'px'
    img.style.position = 'absolute'
    img.style.top = '-9999px'
    img.style.filter = 'drop-shadow(0 12px 28px rgba(0,0,0,0.55))'
    img.style.transform = 'rotate(-3deg) scale(1.06)'
    img.style.opacity = '0.95'
    document.body.appendChild(img)
    const w = cardRef.value.offsetWidth
    const h = cardRef.value.offsetHeight
    e.dataTransfer.setDragImage(img, Math.floor(w / 2), Math.floor(h / 2))
    setTimeout(() => img.remove(), 0)
  } catch {
    /* ignore */
  }
  const rect = cardRef.value.getBoundingClientRect()
  emit('drag-start', { id: props.book.id, rect })
}

const onDragEnd = () => {
  isDragging.value = false
  emit('drag-end')
}

const onCoverError = (e: Event) => {
  const t = e.target as HTMLImageElement
  t.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect fill="#fff8e1" width="300" height="400"/><text x="50%" y="50%" font-size="40" text-anchor="middle" dominant-baseline="middle">📖</text></svg>`
  )
}

const explode = () => {
  const colors = ['#ff9800', '#ffb74d', '#ffe082', '#f57c00', '#fff176', '#ffc107', '#fff']
  const count = 40
  const arr: PStyle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const dist = 60 + Math.random() * 90
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist
    const size = 5 + Math.random() * 9
    const color = colors[Math.floor(Math.random() * colors.length)]
    const delay = Math.random() * 0.15
    arr.push({
      style: {
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        animationDelay: `${delay}s`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        boxShadow: `0 0 ${size}px ${color}`
      }
    })
  }
  particles.value = arr
  showParticles.value = true
  const t = setTimeout(() => {
    showParticles.value = false
    particles.value = []
  }, 1100)
  onBeforeUnmount(() => clearTimeout(t))
}

let mountTimer: ReturnType<typeof setTimeout> | null = null
onMounted(() => {
  mountTimer = setTimeout(() => {
    isEntered.value = true
  }, 60 + (props.flowInDelay ?? 0))
})

let winnerTimer: ReturnType<typeof setTimeout> | null = null
watch(() => props.isWinner, (v, old) => {
  if (v && !old) {
    explode()
    if (winnerTimer) clearTimeout(winnerTimer)
    winnerTimer = setTimeout(() => emit('winner-ready'), 2400)
    onBeforeUnmount(() => { if (winnerTimer) clearTimeout(winnerTimer) })
  }
})

onBeforeUnmount(() => {
  if (mountTimer) clearTimeout(mountTimer)
})
</script>

<style scoped>
.book-card {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  cursor: grab;
  user-select: none;
  /* 左流 + 缩放入场 */
  opacity: 0;
  transform: translateX(-48px) scale(0.72);
  transition:
    opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: v-bind('flowDelay');
  will-change: transform, opacity;
}

.book-card.entered {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.book-card.is-dragging {
  opacity: 0.2;
  transform: scale(0.9) rotate(-1deg);
  cursor: grabbing;
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.book-card.is-dragging .card-shadow {
  opacity: 0;
}

/* 老虎机滚动时被 cursor 命中的卡片 */
.book-card.is-slot-cursor .card-inner {
  animation: slotFlash 0.12s linear;
  z-index: 40;
}

@keyframes slotFlash {
  0% { transform: scale(1); filter: brightness(1); box-shadow: 0 2px 8px rgba(62,39,35,.2); }
  50% { transform: scale(1.1); filter: brightness(1.5); box-shadow: 0 0 36px rgba(255,193,7,.9), 0 16px 36px rgba(255,152,0,.7); }
  100% { transform: scale(1.04); filter: brightness(1.2); box-shadow: 0 0 20px rgba(255,193,7,.6), 0 10px 24px rgba(255,152,0,.45); }
}

.slot-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, rgba(255, 241, 118, 0.55), transparent 65%);
  pointer-events: none;
  animation: glowPulse 0.16s ease-in-out;
}

@keyframes glowPulse {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

/* 中奖卡片 */
.book-card.is-winner {
  z-index: 180;
}

.book-card.is-winner .card-inner {
  animation: winnerPop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  border-color: #ff6f00 !important;
  background: linear-gradient(135deg, #fff8e1 0%, #ffe082 100%) !important;
}

@keyframes winnerPop {
  0% { transform: scale(1); box-shadow: 0 4px 12px rgba(62,39,35,.3); }
  60% { transform: scale(1.16); box-shadow: 0 24px 52px rgba(255,152,0,.55), 0 0 56px rgba(255,193,7,.45); }
  100% { transform: scale(1.1); box-shadow: 0 18px 44px rgba(255,152,0,.5), 0 0 36px rgba(255,193,7,.4); }
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
  filter: grayscale(0.72) opacity(0.82);
  background: #efebe9;
}

.cover-wrap {
  position: relative;
  flex: 1 1 62%;
  overflow: hidden;
  background: #d7ccc8;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.45s ease;
}

.book-card.is-hover:not(.is-dragging) .cover {
  transform: scale(1.06);
}

.badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  letter-spacing: 0.5px;
}

.badge-read {
  background: linear-gradient(135deg, #66bb6a, #2e7d32);
}

.badge-reading {
  background: linear-gradient(135deg, #ff9800, #e65100);
}

.card-body {
  flex: 1 1 38%;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff8e1;
  position: relative;
  z-index: 2;
}

.book-title {
  font-size: 15px;
  font-weight: 700;
  color: #3e2723;
  line-height: 1.3;
  margin: 0;
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
  background: linear-gradient(135deg, #ffe082, #ffb74d);
  color: #5d4037;
  border-radius: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.status-switcher {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.status-btn {
  position: relative;
  overflow: hidden;
  flex: 1;
  padding: 4px 0;
  font-size: 11px;
  border: 1px solid #bcaaa4;
  background: #fff;
  color: #6d4c41;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s ease;
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

.delete-btn {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(62, 39, 35, 0.78);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  overflow: hidden;
}

.book-card.is-hover .delete-btn,
.book-card.is-winner .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #d32f2f;
  transform: scale(1.12);
}

/* 中奖 overlay */
.winner-overlay {
  position: absolute;
  left: 50%;
  bottom: -72px;
  transform: translateX(-50%);
  min-width: 150%;
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: #fff;
  padding: 14px 20px;
  border-radius: 14px;
  text-align: center;
  box-shadow: 0 12px 28px rgba(245, 124, 0, 0.5);
  z-index: 220;
  pointer-events: none;
  border: 2px solid #fff3c4;
}

.winner-title {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.winner-author {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.92;
  font-style: italic;
}

.winner-overlay-enter-active,
.winner-overlay-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.winner-overlay-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(14px) scale(0.9);
}
.winner-overlay-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.94);
}

/* 粒子爆炸 */
.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 230;
}

.particle {
  position: absolute;
  top: 0;
  left: 0;
  animation: particleFly 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes particleFly {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

/* ripple keyframes 内联兜底 */
@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}
</style>
