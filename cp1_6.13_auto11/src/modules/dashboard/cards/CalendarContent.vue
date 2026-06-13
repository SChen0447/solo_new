<template>
  <div class="calendar-content">
    <div class="calendar-header">
      <button class="nav-btn" @click="prevMonth">‹</button>
      <span class="month-title">{{ monthTitle }}</span>
      <button class="nav-btn" @click="nextMonth">›</button>
    </div>
    <div class="weekday-row">
      <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
    </div>
    <div class="days-grid">
      <span
        v-for="(day, index) in days"
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !day.currentMonth,
          'today': day.isToday,
          'holiday': day.isHoliday && config.showHolidays,
          'first-day': index % 7 === config.firstDayOfWeek
        }"
      >
        {{ day.date }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { CalendarConfig } from '../../../types/card'

interface DayItem {
  date: number
  currentMonth: boolean
  isToday: boolean
  isHoliday: boolean
}

export default defineComponent({
  name: 'CalendarContent',
  props: {
    config: {
      type: Object as () => CalendarConfig,
      required: true
    }
  },
  setup(props) {
    const today = new Date()
    const currentYear = ref(today.getFullYear())
    const currentMonth = ref(today.getMonth())

    const allWeekdays = ['日', '一', '二', '三', '四', '五', '六']

    const weekdays = computed(() => {
      const start = props.config.firstDayOfWeek
      const result = []
      for (let i = 0; i < 7; i++) {
        result.push(allWeekdays[(start + i) % 7])
      }
      return result
    })

    const monthTitle = computed(() => {
      return `${currentYear.value}年${currentMonth.value + 1}月`
    })

    const days = computed((): DayItem[] => {
      const year = currentYear.value
      const month = currentMonth.value
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const prevLastDay = new Date(year, month, 0)

      const result: DayItem[] = []
      const firstDayOfWeek = (firstDay.getDay() - props.config.firstDayOfWeek + 7) % 7

      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = prevLastDay.getDate() - i
        result.push({
          date,
          currentMonth: false,
          isToday: false,
          isHoliday: false
        })
      }

      for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayDate = new Date(year, month, i)
        const dayOfWeek = dayDate.getDay()
        const isToday =
          year === today.getFullYear() &&
          month === today.getMonth() &&
          i === today.getDate()
        const isHoliday = dayOfWeek === 0 || dayOfWeek === 6
        result.push({
          date: i,
          currentMonth: true,
          isToday,
          isHoliday
        })
      }

      const remaining = 42 - result.length
      for (let i = 1; i <= remaining; i++) {
        const dayDate = new Date(year, month + 1, i)
        const dayOfWeek = dayDate.getDay()
        result.push({
          date: i,
          currentMonth: false,
          isToday: false,
          isHoliday: dayOfWeek === 0 || dayOfWeek === 6
        })
      }

      return result
    })

    function prevMonth() {
      if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
      } else {
        currentMonth.value--
      }
    }

    function nextMonth() {
      if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
      } else {
        currentMonth.value++
      }
    }

    return {
      weekdays,
      monthTitle,
      days,
      prevMonth,
      nextMonth
    }
  }
})
</script>

<style scoped>
.calendar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.month-title {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #2a2a2a;
  color: #888888;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: #333333;
  color: #ffffff;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.weekday {
  text-align: center;
  font-size: 11px;
  color: #666666;
  font-weight: 600;
  padding: 4px 0;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  flex: 1;
}

.day-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #ffffff;
  border-radius: 4px;
  transition: all 0.15s ease;
  min-height: 28px;
  cursor: default;
}

.day-cell:hover:not(.today) {
  background: #2a2a2a;
}

.day-cell.other-month {
  color: #444444;
}

.day-cell.today {
  background: #4fc3f7;
  color: #121212;
  font-weight: 700;
}

.day-cell.holiday {
  color: #ef5350;
}

.day-cell.today.holiday {
  color: #121212;
}
</style>
