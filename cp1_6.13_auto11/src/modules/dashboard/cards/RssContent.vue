<template>
  <div class="rss-content">
    <div class="rss-source" :title="config.url">
      {{ displayUrl }}
    </div>
    <div class="rss-list">
      <div
        v-for="(item, index) in newsItems"
        :key="index"
        class="rss-item"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <span class="rss-item-title">{{ item.title }}</span>
        <span class="rss-item-time">{{ item.time }}</span>
      </div>
    </div>
    <div v-if="newsItems.length === 0" class="rss-empty">
      正在加载新闻...
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, watch } from 'vue'
import type { RssConfig } from '../../../types/card'

interface NewsItem {
  title: string
  time: string
}

export default defineComponent({
  name: 'RssContent',
  props: {
    config: {
      type: Object as () => RssConfig,
      required: true
    }
  },
  setup(props) {
    const newsItems = ref<NewsItem[]>([])

    const displayUrl = computed(() => {
      try {
        const url = new URL(props.config.url)
        return url.hostname
      } catch {
        return props.config.url
      }
    })

    const mockNews = [
      { title: '人工智能技术取得重大突破，新一代大模型发布', time: '10分钟前' },
      { title: '全球气候峰会达成新协议，各国承诺减排目标', time: '30分钟前' },
      { title: '科技巨头发布新产品系列，市场反应积极', time: '1小时前' },
      { title: '新能源汽车销量创新高，市场份额持续增长', time: '2小时前' },
      { title: '太空探索新进展，空间站完成重要升级', time: '3小时前' }
    ]

    function loadNews() {
      newsItems.value = []
      setTimeout(() => {
        newsItems.value = [...mockNews]
      }, 200)
    }

    watch(
      () => props.config.url,
      () => {
        loadNews()
      }
    )

    onMounted(() => {
      loadNews()
    })

    return {
      newsItems,
      displayUrl
    }
  }
})
</script>

<style scoped>
.rss-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.rss-source {
  font-size: 12px;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-bottom: 8px;
  border-bottom: 1px solid #333333;
}

.rss-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.rss-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  animation: slideIn 0.3s ease forwards;
  opacity: 0;
}

.rss-item:hover {
  background-color: #2a2a2a;
}

.rss-item-title {
  font-size: 13px;
  color: #ffffff;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rss-item-time {
  font-size: 11px;
  color: #666666;
}

.rss-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  font-size: 13px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
