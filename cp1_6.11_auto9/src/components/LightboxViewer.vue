<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick
} from 'vue'
import type { ImageItem } from '@/services/imageService'

interface Props {
  images: ImageItem[]
  currentIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'index-change', index: number): void
}>()

const imageContainerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const startTranslateX = ref(0)
const startTranslateY = ref(0)
const isImageLoaded = ref(false)
const imageNaturalWidth = ref(0)
const imageNaturalHeight = ref(0)

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.25

const currentImage = computed(() => props.images[props.currentIndex])

const counterText = computed(() => {
  return `第 ${props.currentIndex + 1} 张 / 共 ${props.images.length} 张`
})

const imageTransform = computed(() => {
  return `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`
})

const resetTransform = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const goToPrev = () => {
  const newIndex =
    (props.currentIndex - 1 + props.images.length) % props.images.length
  emit('index-change', newIndex)
}

const goToNext = () => {
  const newIndex = (props.currentIndex + 1) % props.images.length
  emit('index-change', newIndex)
}

const goToIndex = (index: number) => {
  if (index !== props.currentIndex) {
    emit('index-change', index)
  }
}

const handleImageLoad = () => {
  isImageLoaded.value = true
  if (imageRef.value) {
    imageNaturalWidth.value = imageRef.value.naturalWidth
    imageNaturalHeight.value = imageRef.value.naturalHeight
  }
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
  const newScale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, scale.value + delta)
  )

  if (imageContainerRef.value && imageRef.value) {
    const rect = imageContainerRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    const scaleRatio = newScale / scale.value
    translateX.value = mouseX - (mouseX - translateX.value) * scaleRatio
    translateY.value = mouseY - (mouseY - translateY.value) * scaleRatio
  }

  scale.value = newScale

  if (scale.value === MIN_SCALE) {
    translateX.value = 0
    translateY.value = 0
  }
}

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  startTranslateX.value = translateX.value
  startTranslateY.value = translateY.value
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  e.preventDefault()
  translateX.value = startTranslateX.value + (e.clientX - dragStartX.value)
  translateY.value = startTranslateY.value + (e.clientY - dragStartY.value)
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      goToPrev()
      break
    case 'ArrowRight':
      e.preventDefault()
      goToNext()
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

const handleBgClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    isDragging.value = true
    dragStartX.value = e.touches[0].clientX
    dragStartY.value = e.touches[0].clientY
    startTranslateX.value = translateX.value
    startTranslateY.value = translateY.value
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || e.touches.length !== 1) return
  e.preventDefault()
  translateX.value = startTranslateX.value + (e.touches[0].clientX - dragStartX.value)
  translateY.value = startTranslateY.value + (e.touches[0].clientY - dragStartY.value)
}

const handleTouchEnd = () => {
  isDragging.value = false
}

watch(
  () => props.currentIndex,
  () => {
    isImageLoaded.value = false
    resetTransform()
    nextTick(() => {
      if (imageRef.value && imageRef.value.complete) {
        handleImageLoad()
      }
    })
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('touchend', handleTouchEnd)
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('touchmove', handleTouchMove)
})
</script>

<template>
  <div class="lightbox-overlay" @click="handleBgClick">
    <div class="lightbox-header">
      <div class="header-content">
        <span class="counter">{{ counterText }}</span>
        <span class="title">{{ currentImage?.title }}</span>
      </div>
      <button class="close-btn" @click="emit('close')" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div
      ref="imageContainerRef"
      class="lightbox-image-container"
      @wheel.prevent.passive="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      :class="{ dragging: isDragging }"
    >
      <button
        class="nav-btn nav-prev"
        @click.stop="goToPrev"
        aria-label="上一张"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="image-wrapper">
        <div v-if="!isImageLoaded" class="image-loader">
          <div class="loader-spinner"></div>
        </div>
        <img
          ref="imageRef"
          :src="currentImage?.fullUrl"
          :alt="currentImage?.title"
          :style="{
            transform: imageTransform,
            opacity: isImageLoaded ? 1 : 0
          }"
          class="lightbox-image"
          @load="handleImageLoad"
          draggable="false"
        />
      </div>

      <button
        class="nav-btn nav-next"
        @click.stop="goToNext"
        aria-label="下一张"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    <div class="lightbox-footer">
      <div class="indicator-wrapper">
        <button
          v-for="(_, index) in images"
          :key="index"
          class="indicator-dot"
          :class="{ active: index === currentIndex }"
          @click="goToIndex(index)"
          :aria-label="`跳转到第 ${index + 1} 张`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(4px);
}

.lightbox-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0) 100%
  );
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.counter {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.title {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  transition: color var(--duration) var(--ease);
}

.title:hover {
  color: var(--text-primary);
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all var(--duration) var(--ease);
  padding: 8px;
}

.close-btn:hover {
  background: var(--surface-hover);
  transform: rotate(90deg);
  color: #ff6b6b;
}

.lightbox-image-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  user-select: none;
}

.lightbox-image-container.dragging {
  cursor: grabbing;
}

.image-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
  transform-origin: center center;
  cursor: grab;
  transition: opacity var(--duration) var(--ease);
  will-change: transform;
  -webkit-user-drag: none;
  pointer-events: none;
}

.dragging .lightbox-image {
  cursor: grabbing;
}

.image-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.loader-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  backdrop-filter: blur(8px);
  transition: all var(--duration) var(--ease);
  z-index: 5;
  padding: 12px;
}

.nav-btn:hover {
  background: var(--surface-hover);
  transform: translateY(-50%) scale(1.1);
  color: var(--accent-hover);
  box-shadow: 0 4px 20px rgba(100, 181, 246, 0.2);
}

.nav-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.nav-prev {
  left: 24px;
}

.nav-next {
  right: 24px;
}

.lightbox-footer {
  position: relative;
  padding: 20px 24px 28px;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0) 100%
  );
  z-index: 10;
}

.indicator-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 100%;
  padding: 8px 16px;
}

.indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  transition: all var(--duration) var(--ease);
  padding: 0;
  flex-shrink: 0;
}

.indicator-dot:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.3);
}

.indicator-dot.active {
  width: 32px;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--accent) 0%, #ce93d8 100%);
  box-shadow: 0 0 16px rgba(100, 181, 246, 0.5);
}

@media (max-width: 600px) {
  .lightbox-header {
    padding: 12px 16px;
  }

  .header-content {
    gap: 10px;
  }

  .counter {
    font-size: 13px;
  }

  .title {
    font-size: 12px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    padding: 6px;
  }

  .lightbox-image-container {
    padding: 12px;
  }

  .nav-btn {
    width: 42px;
    height: 42px;
    padding: 10px;
  }

  .nav-prev {
    left: 10px;
  }

  .nav-next {
    right: 10px;
  }

  .nav-btn svg {
    width: 22px;
    height: 22px;
  }

  .lightbox-footer {
    padding: 12px 16px 20px;
  }

  .indicator-wrapper {
    gap: 8px;
    padding: 4px 8px;
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
  }

  .indicator-dot.active {
    width: 24px;
    height: 8px;
  }
}
</style>
