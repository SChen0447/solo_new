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
          v-if="visibleImages.has(index)"
          :src="img.thumbUrl"
          :alt="img.title"
          :class="['thumbnail-image', { loaded: loadedImages.has(index) }]"
          @load="handleImageLoad(index)"
        />
        <div v-else class="thumbnail-placeholder">
          <div class="placeholder-shimmer"></div>
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
  grid-template-columns: repeat(4, 1fr);
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

.thumbnail-placeholder {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.placeholder-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--duration) var(--ease),
    transform 0.6s var(--ease);
}

.thumbnail-image.loaded {
  opacity: 1;
}

.thumbnail-card:hover .thumbnail-image {
  transform: scale(1.1);
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  transition: background var(--duration) var(--ease);
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

@media (min-width: 601px) and (max-width: 1024px) {
  .thumbnail-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

@media (max-width: 600px) {
  .thumbnail-grid {
    grid-template-columns: repeat(2, 1fr);
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
