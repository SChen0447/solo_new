<script setup lang="ts">
import { ref, type PropType } from 'vue'
import type { HistoryEvent } from '@/data/events'

const props = defineProps({
  events: {
    type: Array as PropType<HistoryEvent[]>,
    required: true
  }
})

const emit = defineEmits<{
  (e: 'echo', event: HistoryEvent): void
}>()

const flippedCards = ref<Set<string>>(new Set())

function toggleFlip(id: string) {
  if (flippedCards.value.has(id)) {
    flippedCards.value.delete(id)
  } else {
    flippedCards.value.add(id)
  }
}

function handleEcho(event: HistoryEvent, evt: Event) {
  evt.stopPropagation()
  emit('echo', event)
}
</script>

<template>
  <div class="timeline-container">
    <div class="timeline-connector" aria-hidden="true"></div>
    <div class="cards-grid">
      <div
        v-for="(event, index) in props.events"
        :key="event.id"
        class="card-wrapper"
        :style="{ animationDelay: `${index * 60}ms` }"
      >
        <div
          class="card"
          :class="{ flipped: flippedCards.has(event.id) }"
          @click="toggleFlip(event.id)"
          tabindex="0"
          @keydown.enter="toggleFlip(event.id)"
          @keydown.space.prevent="toggleFlip(event.id)"
        >
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="card-corner top-left" aria-hidden="true"></div>
              <div class="card-corner top-right" aria-hidden="true"></div>
              <div class="card-corner bottom-left" aria-hidden="true"></div>
              <div class="card-corner bottom-right" aria-hidden="true"></div>
              <div class="year-badge">{{ event.year }}</div>
              <h3 class="event-title">{{ event.title }}</h3>
              <p class="flip-hint">点击卡片查看详情 →</p>
            </div>
            <div class="card-face card-back">
              <div class="card-corner top-left" aria-hidden="true"></div>
              <div class="card-corner top-right" aria-hidden="true"></div>
              <div class="card-corner bottom-left" aria-hidden="true"></div>
              <div class="card-corner bottom-right" aria-hidden="true"></div>
              <div class="card-back-header">
                <span class="back-year">{{ event.year }}</span>
                <button
                  class="close-back-btn"
                  @click.stop="toggleFlip(event.id)"
                  aria-label="关闭详情"
                >
                  ×
                </button>
              </div>
              <p class="event-description">{{ event.description }}</p>
              <button
                class="echo-btn"
                @click="handleEcho(event, $event)"
              >
                <span class="echo-icon">♪</span>
                聆听回音
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  position: relative;
  width: 100%;
  padding: 24px 0 48px;
}

.timeline-connector {
  position: absolute;
  top: 120px;
  left: 5%;
  right: 5%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 165, 116, 0.4) 10%,
    rgba(212, 165, 116, 0.4) 90%,
    transparent
  );
  z-index: 0;
}

.cards-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 28px 24px;
  padding: 0 16px;
}

.card-wrapper {
  animation: cardEnter 500ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card {
  width: 100%;
  height: 320px;
  perspective: 1200px;
  cursor: pointer;
  outline: none;
}

.card:focus-visible .card-inner {
  box-shadow:
    0 0 0 3px rgba(212, 165, 116, 0.3),
    0 12px 32px rgba(0, 0, 0, 0.4);
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.card:hover .card-inner {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card.flipped:hover .card-inner {
  transform: rotateY(180deg) translateY(-4px);
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border: 1px solid rgba(212, 165, 116, 0.6);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f4e7cf;
  background-image:
    radial-gradient(ellipse at 15% 20%, rgba(180, 140, 90, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 80%, rgba(160, 110, 70, 0.1) 0%, transparent 45%),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 3px,
      rgba(170, 130, 85, 0.04) 3px,
      rgba(170, 130, 85, 0.04) 6px
    ),
    linear-gradient(135deg, #f8edda 0%, #ecddc0 100%);
}

.card-face::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(120, 80, 40, 0.08) 0%, transparent 8%),
    radial-gradient(circle at 70% 60%, rgba(120, 80, 40, 0.06) 0%, transparent 6%),
    radial-gradient(circle at 40% 80%, rgba(120, 80, 40, 0.07) 0%, transparent 5%);
}

.card-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(212, 165, 116, 0.5);
}

.card-corner.top-left {
  top: 6px;
  left: 6px;
  border-right: none;
  border-bottom: none;
}

.card-corner.top-right {
  top: 6px;
  right: 6px;
  border-left: none;
  border-bottom: none;
}

.card-corner.bottom-left {
  bottom: 6px;
  left: 6px;
  border-right: none;
  border-top: none;
}

.card-corner.bottom-right {
  bottom: 6px;
  right: 6px;
  border-left: none;
  border-top: none;
}

.card-back {
  transform: rotateY(180deg);
  padding-top: 18px;
}

.year-badge {
  align-self: flex-start;
  padding: 6px 14px;
  background: linear-gradient(135deg, #2c1810 0%, #3d2418 100%);
  color: #d4a574;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
  border: 1px solid rgba(212, 165, 116, 0.4);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.event-title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  color: #2c1810;
  margin: 0 0 16px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.flip-hint {
  margin-top: auto;
  font-family: 'Georgia', serif;
  font-size: 13px;
  color: rgba(44, 24, 16, 0.55);
  font-style: italic;
  letter-spacing: 0.3px;
}

.card-back-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.back-year {
  font-family: 'Georgia', serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 0.6);
  letter-spacing: 0.3px;
}

.close-back-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(212, 165, 116, 0.6);
  background: rgba(255, 255, 255, 0.4);
  color: #2c1810;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;
}

.close-back-btn:hover {
  background: rgba(44, 24, 16, 0.1);
  transform: rotate(90deg);
}

.event-description {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 14.5px;
  line-height: 1.75;
  color: #3a2818;
  margin: 0 0 18px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  text-align: justify;
}

.event-description::-webkit-scrollbar {
  width: 4px;
}

.event-description::-webkit-scrollbar-track {
  background: transparent;
}

.event-description::-webkit-scrollbar-thumb {
  background: rgba(212, 165, 116, 0.5);
  border-radius: 2px;
}

.echo-btn {
  margin-top: auto;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #2c1810 0%, #4a2e1c 50%, #2c1810 100%);
  color: #d4a574;
  border: 1px solid rgba(212, 165, 116, 0.7);
  border-radius: 10px;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.echo-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #3d2418 0%, #5c3a24 50%, #3d2418 100%);
}

.echo-btn:active {
  transform: translateY(0);
}

.echo-icon {
  font-size: 18px;
  animation: echoPulse 2s ease-in-out infinite;
}

@keyframes echoPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
    padding: 0 12px;
    gap: 20px;
  }

  .card {
    height: 300px;
  }

  .event-title {
    font-size: 20px;
  }

  .timeline-connector {
    display: none;
  }
}
</style>
