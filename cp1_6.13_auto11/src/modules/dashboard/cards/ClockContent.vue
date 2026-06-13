<template>
  <div class="clock-content">
    <div class="clock-time">
      <span class="time-hours">{{ hours }}</span>
      <span class="time-separator" :class="{ blink: showSeparator }">:</span>
      <span class="time-minutes">{{ minutes }}</span>
      <span v-if="config.showSeconds" class="time-separator" :class="{ blink: showSeparator }">:</span>
      <span v-if="config.showSeconds" class="time-seconds">{{ seconds }}</span>
    </div>
    <div class="clock-date">{{ dateStr }}</div>
    <div class="clock-timezone">{{ timezoneDisplay }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import type { ClockConfig } from '../../../types/card'

export default defineComponent({
  name: 'ClockContent',
  props: {
    config: {
      type: Object as () => ClockConfig,
      required: true
    }
  },
  setup(props) {
    const now = ref(new Date())
    const showSeparator = ref(true)

    const hours = computed(() => {
      return String(now.value.getHours()).padStart(2, '0')
    })

    const minutes = computed(() => {
      return String(now.value.getMinutes()).padStart(2, '0')
    })

    const seconds = computed(() => {
      return String(now.value.getSeconds()).padStart(2, '0')
    })

    const dateStr = computed(() => {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
      return now.value.toLocaleDateString('zh-CN', options)
    })

    const timezoneDisplay = computed(() => {
      const map: Record<string, string> = {
        'Asia/Shanghai': '北京时间 (GMT+8)',
        'Asia/Tokyo': '东京时间 (GMT+9)',
        'America/New_York': '纽约时间 (GMT-5)',
        'Europe/London': '伦敦时间 (GMT+0)',
        'UTC': 'UTC 标准时间'
      }
      return map[props.config.timezone] || props.config.timezone
    })

    let interval: number | null = null

    function updateTime() {
      now.value = new Date()
      showSeparator.value = !showSeparator.value
    }

    onMounted(() => {
      updateTime()
      interval = window.setInterval(updateTime, 1000)
    })

    onUnmounted(() => {
      if (interval) {
        clearInterval(interval)
      }
    })

    return {
      hours,
      minutes,
      seconds,
      dateStr,
      timezoneDisplay,
      showSeparator
    }
  }
})
</script>

<style scoped>
.clock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.clock-time {
  display: flex;
  align-items: baseline;
  font-family: 'Courier New', monospace;
}

.time-hours,
.time-minutes {
  font-size: 56px;
  font-weight: 300;
  color: #ffffff;
  letter-spacing: 2px;
}

.time-seconds {
  font-size: 32px;
  font-weight: 300;
  color: #4fc3f7;
  letter-spacing: 1px;
}

.time-separator {
  font-size: 48px;
  font-weight: 300;
  color: #666666;
  margin: 0 4px;
  transition: opacity 0.3s ease;
}

.time-separator.blink {
  opacity: 1;
}

.time-separator:not(.blink) {
  opacity: 0.3;
}

.clock-date {
  font-size: 14px;
  color: #aaaaaa;
}

.clock-timezone {
  font-size: 12px;
  color: #666666;
  margin-top: 4px;
}
</style>
