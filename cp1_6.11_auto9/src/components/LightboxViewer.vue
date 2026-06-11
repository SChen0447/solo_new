<!--
  LightboxViewer.vue - 全屏灯箱查看器组件

  调用关系：
    - 被 App.vue 引用：App.template → <LightboxViewer :images :currentIndex @close @index-change />
    - 接收 App.vue 传入的 images 数组和 currentIndex

  数据流向：
    App.vue (images ref, currentIndex ref) → props → 渲染灯箱
    用户交互（键盘/鼠标/触摸） → emit('index-change', newIndex) → App.vue (handleIndexChange) → 更新 currentIndex
    用户关闭灯箱 → emit('close') → App.vue (handleClose) → 关闭灯箱
    App.vue watch(currentIndex) → imageService.preloadNeighbors() → 预加载相邻图片

  功能：
    - 全屏灯箱预览，图片居中显示
    - 鼠标滚轮缩放（以光标位置为中心），平移拖拽
    - 双指缩放手势（移动端），以双指中心点为缩放原点，补偿缩放后平移偏移
    - 键盘导航：左右方向键切换，ESC关闭，自动聚焦+阻止冒泡
    - 底部圆点指示器，点击跳转，区分激活/可点击样式
    - requestAnimationFrame FPS 帧率统计，UI 实时显示，低于55fps触发降级
    - 切换计时：从用户触发到图片完全显示（含过渡动画）的完整时间
    - GPU 硬件加速（will-change, transform: translateZ(0)）
-->
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

const overlayRef = ref<HTMLElement | null>(null)
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
const hasImageError = ref(false)
const isTransitionComplete = ref(false)

const MIN_SCALE = 1
const MAX_SCALE = 5
const SCALE_STEP = 0.15
const TRANSITION_DURATION = 300

let lastPinchDistance = 0
let lastTouchTime = 0
const TOUCH_THROTTLE_MS = 16

let fpsFrameCount = 0
let fpsLastTime = 0
let fpsAnimId = 0
const fpsDisplay = ref(0)
const isLowFps = ref(false)

let switchStartTime = 0
let switchAnimTimer: ReturnType<typeof setTimeout> | null = null

const currentImage = computed(() => props.images[props.currentIndex])

const counterText = computed(() => {
  return `第 ${props.currentIndex + 1} 张 / 共 ${props.images.length} 张`
})

const fpsClass = computed(() => ({
  'fps-good': fpsDisplay.value >= 55,
  'fps-warn': fpsDisplay.value > 0 && fpsDisplay.value < 55
}))

const imageTransform = computed(() => {
  return `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale3d(${scale.value}, ${scale.value}, 1)`
})

const shouldDisableAnimation = computed(() => isLowFps.value)

const resetTransform = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const recordSwitchStart = () => {
  switchStartTime = performance.now()
  isTransitionComplete.value = false
  if (switchAnimTimer) {
    clearTimeout(switchAnimTimer)
    switchAnimTimer = null
  }
}

const completeSwitchTiming = () => {
  if (switchStartTime > 0 && !isTransitionComplete.value) {
    isTransitionComplete.value = true
    const elapsed = performance.now() - switchStartTime
    console.log(
      `[Lightbox Performance] 图片切换完整时间(含动画): ${elapsed.toFixed(1)}ms` +
      `${elapsed < 100 ? ' ✅' : ' ⚠️ 超过100ms'}`
    )
    switchStartTime = 0
  }
}

const goToPrev = () => {
  recordSwitchStart()
  const newIndex =
    (props.currentIndex - 1 + props.images.length) % props.images.length
  emit('index-change', newIndex)
}

const goToNext = () => {
  recordSwitchStart()
  const newIndex = (props.currentIndex + 1) % props.images.length
  emit('index-change', newIndex)
}

const goToIndex = (index: number) => {
  if (index !== props.currentIndex) {
    recordSwitchStart()
    emit('index-change', index)
  }
}

const handleImageLoad = () => {
  isImageLoaded.value = true
  hasImageError.value = false

  if (switchAnimTimer) {
    clearTimeout(switchAnimTimer)
  }
  switchAnimTimer = setTimeout(() => {
    completeSwitchTiming()
    switchAnimTimer = null
  }, shouldDisableAnimation.value ? 0 : TRANSITION_DURATION)
}

const handleImageError = () => {
  hasImageError.value = true
  isImageLoaded.value = false
  completeSwitchTiming()
}

const handleTransitionEnd = () => {
  completeSwitchTiming()
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
  const newScale = clampScale(scale.value + delta)

  if (imageContainerRef.value) {
    const rect = imageContainerRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    const scaleRatio = newScale / scale.value
    translateX.value = mouseX - (mouseX - translateX.value) * scaleRatio
    translateY.value = mouseY - (mouseY - translateY.value) * scaleRatio
  }

  scale.value = newScale

  if (scale.value <= MIN_SCALE) {
    scale.value = MIN_SCALE
    translateX.value = 0
    translateY.value = 0
  }
}

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  e.preventDefault()
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  startTranslateX.value = translateX.value
  startTranslateY.value = translateY.value
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  e.preventDefault()
  e.stopPropagation()
  translateX.value = startTranslateX.value + (e.clientX - dragStartX.value)
  translateY.value = startTranslateY.value + (e.clientY - dragStartY.value)
}

const handleMouseUp = () => {
  isDragging.value = false
}

const getPinchCenter = (touches: TouchList) => {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

const getPinchDistance = (touches: TouchList): number => {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

const handleTouchStart = (e: TouchEvent) => {
  e.stopPropagation()
  if (e.touches.length === 2) {
    isDragging.value = false
    lastPinchDistance = getPinchDistance(e.touches)
    const center = getPinchCenter(e.touches)
    dragStartX.value = center.x
    dragStartY.value = center.y
    startTranslateX.value = translateX.value
    startTranslateY.value = translateY.value
  } else if (e.touches.length === 1) {
    const now = performance.now()
    if (now - lastTouchTime < TOUCH_THROTTLE_MS) return
    lastTouchTime = now
    isDragging.value = true
    dragStartX.value = e.touches[0].clientX
    dragStartY.value = e.touches[0].clientY
    startTranslateX.value = translateX.value
    startTranslateY.value = translateY.value
  }
}

const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (e.touches.length === 2) {
    isDragging.value = false

    const newDist = getPinchDistance(e.touches)
    const center = getPinchCenter(e.touches)

    if (lastPinchDistance > 0) {
      const pinchScale = newDist / lastPinchDistance
      const oldScale = scale.value
      const newScale = clampScale(oldScale * pinchScale)

      if (imageContainerRef.value) {
        const rect = imageContainerRef.value.getBoundingClientRect()
        const pivotX = center.x - rect.left - rect.width / 2
        const pivotY = center.y - rect.top - rect.height / 2

        const scaleRatio = newScale / oldScale
        const newTx = pivotX - (pivotX - translateX.value) * scaleRatio
        const newTy = pivotY - (pivotY - translateY.value) * scaleRatio

        translateX.value = newTx
        translateY.value = newTy
      }

      scale.value = newScale
    }

    lastPinchDistance = newDist
    startTranslateX.value = translateX.value
    startTranslateY.value = translateY.value
    dragStartX.value = center.x
    dragStartY.value = center.y
  } else if (e.touches.length === 1 && isDragging.value) {
    const now = performance.now()
    if (now - lastTouchTime < TOUCH_THROTTLE_MS) return
    lastTouchTime = now
    translateX.value = startTranslateX.value + (e.touches[0].clientX - dragStartX.value)
    translateY.value = startTranslateY.value + (e.touches[0].clientY - dragStartY.value)
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  e.stopPropagation()
  if (e.touches.length < 2) {
    lastPinchDistance = 0
  }
  if (e.touches.length === 0) {
    isDragging.value = false
  }
  if (scale.value <= MIN_SCALE) {
    resetTransform()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  e.stopPropagation()
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

const fpsLoop = (timestamp: number) => {
  fpsFrameCount++
  if (fpsLastTime === 0) {
    fpsLastTime = timestamp
  }
  const elapsed = timestamp - fpsLastTime
  if (elapsed >= 1000) {
    const current = Math.round((fpsFrameCount * 1000) / elapsed)
    fpsDisplay.value = current
    isLowFps.value = current < 55
    console.log(
      `[Lightbox FPS] 当前帧率: ${current}fps` +
      `${current >= 55 ? ' ✅' : ' ⚠️ 低于55fps - 已触发降级策略'}`
    )
    fpsFrameCount = 0
    fpsLastTime = timestamp
  }
  fpsAnimId = requestAnimationFrame(fpsLoop)
}

const startFpsMonitor = () => {
  fpsLastTime = 0
  fpsFrameCount = 0
  fpsDisplay.value = 0
  isLowFps.value = false
  fpsAnimId = requestAnimationFrame(fpsLoop)
  console.log('[Lightbox FPS] 性能监控已启动')
}

const stopFpsMonitor = () => {
  if (fpsAnimId) {
    cancelAnimationFrame(fpsAnimId)
    fpsAnimId = 0
  }
  if (switchAnimTimer) {
    clearTimeout(switchAnimTimer)
    switchAnimTimer = null
  }
  console.log('[Lightbox FPS] 性能监控已停止')
}

watch(
  () => props.currentIndex,
  () => {
    isImageLoaded.value = false
    hasImageError.value = false
    isTransitionComplete.value = false
    resetTransform()
    nextTick(() => {
      if (imageRef.value && imageRef.value.complete) {
        handleImageLoad()
      }
    })
  }
)

onMounted(() => {
  if (overlayRef.value) {
    overlayRef.value.focus()
  }

  recordSwitchStart()
  startFpsMonitor()
})

onBeforeUnmount(() => {
  stopFpsMonitor()
})
</script>

<template>
  <div
    ref="overlayRef"
    class="lightbox-overlay"
    :class="{ 'low-fps': isLowFps }"
    tabindex="-1"
    @click="handleBgClick"
    @keydown="handleKeydown"
  >
    <div class="fps-indicator" :class="fpsClass">
      {{ fpsDisplay > 0 ? fpsDisplay + ' FPS' : '-- FPS' }}
    </div>

    <div class="lightbox-header">
      <div class="header-content">
        <span class="counter">{{ counterText }}</span>
        <span class="title">{{ currentImage?.title }}</span>
      </div>
      <button class="close-btn" @click.stop="emit('close')" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div
      ref="imageContainerRef"
      class="lightbox-image-container"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
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
        <div v-if="!isImageLoaded && !hasImageError" class="image-loader">
          <div class="loader-spinner"></div>
        </div>
        <div v-if="hasImageError" class="image-error">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>图片加载失败</span>
        </div>
        <img
          ref="imageRef"
          :src="currentImage?.fullUrl"
          :alt="currentImage?.title"
          :style="{
            transform: imageTransform,
            opacity: isImageLoaded ? 1 : 0
          }"
          :class="['lightbox-image', { 'no-transition': shouldDisableAnimation }]"
          @load="handleImageLoad"
          @error="handleImageError"
          @transitionend="handleTransitionEnd"
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
          :class="{
            active: index === currentIndex,
            clickable: index !== currentIndex
          }"
          @click.stop="goToIndex(index)"
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
  outline: none;
}

.lightbox-overlay.low-fps {
  backdrop-filter: none;
}

.lightbox-overlay.low-fps .lightbox-image {
  transition: none !important;
}

.lightbox-overlay.low-fps .nav-btn {
  transition: none !important;
}

.lightbox-overlay.low-fps .indicator-dot {
  transition: none !important;
}

.lightbox-overlay.low-fps .close-btn {
  transition: none !important;
}

.lightbox-overlay:focus-visible {
  outline: none;
}

.fps-indicator {
  position: fixed;
  top: 16px;
  right: 72px;
  z-index: 1001;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 0.5px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border);
  pointer-events: none;
}

.fps-indicator.fps-good {
  color: #66bb6a;
  border-color: rgba(102, 187, 106, 0.3);
}

.fps-indicator.fps-warn {
  color: #ff7043;
  border-color: rgba(255, 112, 67, 0.3);
  animation: fps-pulse 1s ease-in-out infinite;
}

@keyframes fps-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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
  touch-action: none;
  will-change: transform;
  transform: translateZ(0);
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
  will-change: transform;
  transform: translateZ(0);
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
  backface-visibility: hidden;
}

.lightbox-image.no-transition {
  transition: none !important;
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
  z-index: 2;
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

.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  z-index: 2;
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
  transition: transform var(--duration) var(--ease),
    background var(--duration) var(--ease),
    color var(--duration) var(--ease);
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
  border: none;
  padding: 0;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  cursor: default;
  transition: width var(--duration) var(--ease),
    height var(--duration) var(--ease),
    border-radius var(--duration) var(--ease),
    background var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease),
    transform var(--duration) var(--ease);
}

.indicator-dot.clickable {
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
}

.indicator-dot.clickable:hover {
  background: rgba(255, 255, 255, 0.55);
  transform: scale(1.4);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

.indicator-dot.clickable:active {
  transform: scale(0.9);
}

.indicator-dot.active {
  width: 32px;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--accent) 0%, #ce93d8 100%);
  box-shadow: 0 0 16px rgba(100, 181, 246, 0.5);
  cursor: default;
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

  .fps-indicator {
    top: 12px;
    right: 56px;
    font-size: 11px;
    padding: 3px 8px;
  }
}
</style>
