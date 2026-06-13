<template>
  <div class="chart-content">
    <div class="chart-title">{{ config.title }}</div>
    <div class="chart-type-badge">{{ typeLabel }}</div>
    <div class="chart-container">
      <svg v-if="config.dataType === 'line'" class="chart-svg" viewBox="0 0 200 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#4fc3f7;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#4fc3f7;stop-opacity:0" />
          </linearGradient>
        </defs>
        <path :d="areaPath" fill="url(#lineGradient)" />
        <polyline :points="linePoints" fill="none" stroke="#4fc3f7" stroke-width="2" stroke-linejoin="round" />
        <circle v-for="(p, i) in dataPoints" :key="i" :cx="p.x" :cy="p.y" r="3" fill="#4fc3f7" />
      </svg>
      <svg v-else-if="config.dataType === 'bar'" class="chart-svg" viewBox="0 0 200 120" preserveAspectRatio="none">
        <g v-for="(bar, i) in barData" :key="i">
          <rect
            :x="bar.x"
            :y="bar.y"
            :width="bar.w"
            :height="bar.h"
            fill="#4fc3f7"
            :rx="3"
            :opacity="0.6 + i * 0.05"
          />
        </g>
      </svg>
      <svg v-else class="chart-svg" viewBox="0 0 200 120">
        <g transform="translate(100, 60)">
          <path
            v-for="(slice, i) in pieData"
            :key="i"
            :d="slice.path"
            :fill="slice.color"
            stroke="#1e1e1e"
            stroke-width="2"
          />
        </g>
      </svg>
    </div>
    <div class="chart-legend">
      <span v-for="(item, i) in legendItems" :key="i" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, watch } from 'vue'
import type { ChartConfig } from '../../../types/card'

export default defineComponent({
  name: 'ChartContent',
  props: {
    config: {
      type: Object as () => ChartConfig,
      required: true
    }
  },
  setup(props) {
    const chartData = ref<number[]>([30, 45, 28, 62, 48, 75, 55])

    const typeLabel = computed(() => {
      const map: Record<string, string> = {
        line: '折线图',
        bar: '柱状图',
        pie: '饼图'
      }
      return map[props.config.dataType] || '折线图'
    })

    const dataPoints = computed(() => {
      const maxVal = Math.max(...chartData.value)
      const w = 200
      const h = 100
      const padding = 10
      const stepX = (w - padding * 2) / (chartData.value.length - 1)
      return chartData.value.map((val, i) => ({
        x: padding + i * stepX,
        y: padding + (1 - val / maxVal) * (h - padding * 2)
      }))
    })

    const linePoints = computed(() => {
      return dataPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
    })

    const areaPath = computed(() => {
      const points = dataPoints.value
      if (points.length === 0) return ''
      const first = points[0]
      const last = points[points.length - 1]
      const baseY = 110
      return `M ${first.x},${baseY} L ${linePoints.value} L ${last.x},${baseY} Z`
    })

    const barData = computed(() => {
      const maxVal = Math.max(...chartData.value)
      const totalW = 200
      const h = 110
      const padding = 10
      const gap = 4
      const barW = (totalW - padding * 2 - gap * (chartData.value.length - 1)) / chartData.value.length
      return chartData.value.map((val, i) => ({
        x: padding + i * (barW + gap),
        y: padding + (1 - val / maxVal) * (h - padding),
        w: barW,
        h: (val / maxVal) * (h - padding)
      }))
    })

    const pieData = computed(() => {
      const total = chartData.value.reduce((a, b) => a + b, 0)
      const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac', '#ff8a65']
      let startAngle = -Math.PI / 2
      const radius = 50
      return chartData.value.slice(0, 7).map((val, i) => {
        const angle = (val / total) * Math.PI * 2
        const endAngle = startAngle + angle
        const x1 = Math.cos(startAngle) * radius
        const y1 = Math.sin(startAngle) * radius
        const x2 = Math.cos(endAngle) * radius
        const y2 = Math.sin(endAngle) * radius
        const largeArc = angle > Math.PI ? 1 : 0
        const path = `M 0,0 L ${x1},${y1} A ${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`
        startAngle = endAngle
        return {
          path,
          color: colors[i % colors.length]
        }
      })
    })

    const legendItems = computed(() => {
      const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月']
      const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac', '#ff8a65']
      return chartData.value.slice(0, 5).map((_, i) => ({
        label: labels[i],
        color: colors[i % colors.length]
      }))
    })

    function regenerateData() {
      chartData.value = Array.from({ length: 7 }, () => Math.floor(Math.random() * 70) + 20)
    }

    let interval: number | null = null

    watch(
      () => props.config.dataType,
      () => {
        regenerateData()
      }
    )

    onMounted(() => {
      regenerateData()
      interval = window.setInterval(regenerateData, 15000)
    })

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }

    return {
      typeLabel,
      linePoints,
      areaPath,
      dataPoints,
      barData,
      pieData,
      legendItems
    }
  }
})
</script>

<style scoped>
.chart-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.chart-type-badge {
  display: inline-block;
  align-self: flex-start;
  padding: 2px 8px;
  background: rgba(79, 195, 247, 0.15);
  color: #4fc3f7;
  font-size: 11px;
  border-radius: 4px;
}

.chart-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.chart-svg {
  width: 100%;
  height: 100%;
  max-height: 140px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid #333333;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #888888;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
