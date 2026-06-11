<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { ImageItem } from '@/services/imageService'
import { imageService } from '@/services/imageService'
import ThumbnailGrid from '@/components/ThumbnailGrid.vue'
import LightboxViewer from '@/components/LightboxViewer.vue'

const images = ref<ImageItem[]>([])
const loading = ref(true)
const currentIndex = ref(-1)
const isLightboxOpen = ref(false)

onMounted(async () => {
  try {
    images.value = await imageService.getImages()
  } finally {
    loading.value = false
  }
})

const handleThumbnailClick = (index: number) => {
  currentIndex.value = index
  isLightboxOpen.value = true
}

const handleClose = () => {
  isLightboxOpen.value = false
  currentIndex.value = -1
}

const handleIndexChange = (index: number) => {
  currentIndex.value = index
}

watch(currentIndex, (newIndex) => {
  if (newIndex >= 0 && images.value.length > 0) {
    imageService.preloadNeighbors(images.value, newIndex)
  }
})

watch(isLightboxOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <div class="logo">
          <span class="logo-icon">📷</span>
          <h1 class="logo-text">Lightbox Gallery</h1>
        </div>
        <p class="subtitle">沉浸式图片画廊 · 共 {{ images.length }} 张作品</p>
      </div>
    </header>

    <main class="app-main">
      <ThumbnailGrid
        v-if="!loading"
        :images="images"
        @thumbnail-click="handleThumbnailClick"
      />
      <div v-else class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    </main>

    <Transition name="fade">
      <LightboxViewer
        v-if="isLightboxOpen && images.length > 0"
        :images="images"
        :current-index="currentIndex"
        @close="handleClose"
        @index-change="handleIndexChange"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 48px 24px 32px;
  text-align: center;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 36px;
  filter: drop-shadow(0 2px 8px rgba(100, 181, 246, 0.3));
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent) 0%, #ce93d8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 15px;
  letter-spacing: 0.5px;
}

.app-main {
  flex: 1;
  padding: 0 24px 64px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 0;
  gap: 20px;
  color: var(--text-secondary);
}

.spinner {
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration) var(--ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .app-header {
    padding: 32px 16px 24px;
  }

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-size: 24px;
  }

  .app-main {
    padding: 0 16px 48px;
  }
}
</style>
