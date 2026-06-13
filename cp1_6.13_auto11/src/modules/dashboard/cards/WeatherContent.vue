<template>
  <div class="weather-content">
    <div class="weather-city">{{ config.city }}</div>
    <div class="weather-main">
      <span class="weather-icon">{{ weatherIcon }}</span>
      <span class="weather-temp">{{ temperature }}°C</span>
    </div>
    <div class="weather-desc">{{ weatherDesc }}</div>
    <div class="weather-details">
      <div class="detail-item">
        <span class="detail-label">湿度</span>
        <span class="detail-value">{{ humidity }}%</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">风速</span>
        <span class="detail-value">{{ windSpeed }} km/h</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { WeatherConfig } from '../../../types/card'

export default defineComponent({
  name: 'WeatherContent',
  props: {
    config: {
      type: Object as () => WeatherConfig,
      required: true
    }
  },
  setup(props) {
    const temperature = ref(23)
    const humidity = ref(65)
    const windSpeed = ref(12)
    const weatherType = ref<'sunny' | 'cloudy' | 'rainy'>('sunny')

    const weatherIcon = computed(() => {
      switch (weatherType.value) {
        case 'sunny':
          return '☀️'
        case 'cloudy':
          return '☁️'
        case 'rainy':
          return '🌧️'
        default:
          return '☀️'
      }
    })

    const weatherDesc = computed(() => {
      switch (weatherType.value) {
        case 'sunny':
          return '晴朗'
        case 'cloudy':
          return '多云'
        case 'rainy':
          return '小雨'
        default:
          return '晴朗'
      }
    })

    let interval: number | null = null

    function updateWeather() {
      const types: Array<'sunny' | 'cloudy' | 'rainy'> = ['sunny', 'cloudy', 'rainy']
      weatherType.value = types[Math.floor(Math.random() * types.length)]
      temperature.value = Math.floor(Math.random() * 20) + 10
      humidity.value = Math.floor(Math.random() * 40) + 40
      windSpeed.value = Math.floor(Math.random() * 20) + 5
    }

    watch(
      () => props.config.city,
      () => {
        updateWeather()
      }
    )

    onMounted(() => {
      updateWeather()
      interval = window.setInterval(updateWeather, 30000)
    })

    onUnmounted(() => {
      if (interval) {
        clearInterval(interval)
      }
    })

    return {
      temperature,
      humidity,
      windSpeed,
      weatherIcon,
      weatherDesc
    }
  }
})
</script>

<style scoped>
.weather-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.weather-city {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.weather-icon {
  font-size: 48px;
}

.weather-temp {
  font-size: 42px;
  font-weight: 300;
  color: #4fc3f7;
}

.weather-desc {
  font-size: 14px;
  color: #aaaaaa;
  text-transform: capitalize;
}

.weather-details {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #666666;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}
</style>
