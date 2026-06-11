<!--
  ThumbnailGrid.vue - 缩略图网格组件

  调用关系：
    - 被 App.vue 引用：App.template → <ThumbnailGrid :images="images" @thumbnail-click="handleThumbnailClick" />
    - 接收 App.vue 传入的 images 数组（来自 imageService.getImages()）

  数据流向：
    App.vue (images ref) → props.images → 渲染缩略图网格
    用户点击缩略图 → emit('thumbnail-click', index) → App.vue (handleThumbnailClick) → 打开灯箱

  功能：
    - IntersectionObserver 实现懒加载：图片进入视口 200px 范围后才开始加载
    - 渐进式加载：先显示低分辨率模糊占位图，缩略图加载完成后淡入替换
    - 加载失败时显示错误状态占位
    - CSS Grid auto-fill + minmax 实现自适应响应式列数
-->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { ImageItem } from '@/services/imageService'

interface Props {
  images: ImageItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'thumbnail-click', index: number): void
}>()

const loadedImages = ref<Set<number>>(new Set())
const errorImages = ref<Set<number>>(new Set())
const visibleImages = ref<Set<number>>(new Set())
const thumbnailRefs = ref<Map<number, HTMLElement>>(new Map())

let observer: IntersectionObserver | null = null

const setThumbnailRef = (index: number, el: HTMLElement | null) => {
  if (el) {
    thumbnailRefs.value.set(index, el)
    observer?.observe(el)
  } else {
    const existing = thumbnailRefs.value.get(index)
    if (existing) {
      observer?.unobserve(existing)
      thumbnailRefs.value.delete(index)
    }
  }
}

const handleImageLoad = (index: number) => {
  loadedImages.value.add(index)
  errorImages.value.delete(index)
}

const handleImageError = (index: number) => {
  errorImages.value.add(index)
  loadedImages.value.delete(index)
}

const handleClick = (index: number) => {
  emit('thumbnail-click', index)
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const indexAttr = entry.target.getAttribute('data-index')
        if (!indexAttr) return
        const idx = Number(indexAttr)
        if (entry.isIntersecting) {
          visibleImages.value.add(idx)
        } else {
          visibleImages.value.delete(idx)
        }
      })
    },
    { rootMargin: '200px', threshold: 0.1 }
  )

  thumbnailRefs.value.forEach((el) => {
    observer!.observe(el)
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="thumbnail-grid">
    <div
      v-for="(img, index) in images"
      :key="img.id"
      :ref="(el) => setThumbnailRef(index, el as HTMLElement | null)"
      :data-index="index"
      class="thumbnail-card"
      @click="handleClick(index)"
    >
      <div class="thumbnail-wrapper">
        <img
          :src="img.placeholderUrl"
          :alt="''"
          class="thumbnail-placeholder-img"
        />
        <img
          v-if="visibleImages.has(index) && !errorImages.has(index)"
          :src="img.thumbUrl"
          :alt="img.title"
          :class="['thumbnail-image', { loaded: loadedImages.has(index) }]"
          @load="handleImageLoad(index)"
          @error="handleImageError(index)"
        />
        <div v-if="errorImages.has(index)" class="thumbnail-error">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="error-text">加载失败</span>
        </div>
        <div class="thumbnail-overlay">
          <span class="view-icon">🔍</span>
        </div>
      </div>
      <div class="thumbnail-info">
        <span class="thumbnail-title">{{ img.title }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.thumbnail-card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease);
}

.thumbnail-card:hover {
  transform: scale(1.05);
  z-index: 2;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.thumbnail-wrapper {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  background: linear-gradient(135deg, #2a2a4e 0%, #26334e 100%);
}

.thumbnail-placeholder-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.2);
  opacity: 0.6;
  transition: opacity 0.6s var(--ease);
  pointer-events: none;
}

.thumbnail-card:hover .thumbnail-placeholder-img {
  opacity: 0.3;
}

.thumbnail-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--duration) var(--ease),
    transform 0.6s var(--ease);
  z-index: 1;
}

.thumbnail-image.loaded {
  opacity: 1;
}

.thumbnail-card:hover .thumbnail-image {
  transform: scale(1.1);
}

.thumbnail-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  z-index: 2;
  background: linear-gradient(135deg, #2a2a4e 0%, #26334e 100%);
}

.error-text {
  font-size: 12px;
  opacity: 0.7;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  transition: background var(--duration) var(--ease);
  z-index: 3;
}

.thumbnail-card:hover .thumbnail-overlay {
  background: rgba(0, 0, 0, 0.3);
}

.view-icon {
  font-size: 28px;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity var(--duration) var(--ease),
    transform var(--duration) var(--ease);
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
}

.thumbnail-card:hover .view-icon {
  opacity: 1;
  transform: scale(1);
}

.thumbnail-info {
  padding: 12px 14px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.thumbnail-title {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  transition: color var(--duration) var(--ease);
}

.thumbnail-card:hover .thumbnail-title {
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .thumbnail-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 600px) {
  .thumbnail-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .thumbnail-title {
    font-size: 12px;
  }

  .thumbnail-info {
    padding: 10px 12px;
  }
}
</style>
