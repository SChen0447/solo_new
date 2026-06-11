<template>
  <div 
    class="idea-card"
    :style="{ animationDelay: `${index * 0.08}s` }"
    @click="$emit('openDetail', idea.id)"
  >
    <div class="card-header">
      <div class="avatar" :style="{ backgroundColor: avatarInfo.color }">
        <span class="avatar-emoji">{{ avatarInfo.emoji }}</span>
      </div>
      <div class="author-info">
        <span class="author-name">{{ idea.authorName }}</span>
        <span class="post-time">{{ formatTime(idea.createdAt) }}</span>
      </div>
    </div>

    <h3 class="card-title">{{ idea.title }}</h3>
    <p class="card-description">{{ truncatedDescription }}</p>

    <div class="vote-section" @click.stop>
      <button 
        class="vote-btn up" 
        :class="{ active: userVote === 'up' }"
        @click="handleVote('up', $event)"
      >
        <span class="ripple"></span>
        <span class="vote-icon">👍</span>
        <span class="vote-count">{{ idea.votes.up }}</span>
      </button>
      <button 
        class="vote-btn neutral" 
        :class="{ active: userVote === 'neutral' }"
        @click="handleVote('neutral', $event)"
      >
        <span class="ripple"></span>
        <span class="vote-icon">🤔</span>
        <span class="vote-count">{{ idea.votes.neutral }}</span>
      </button>
      <button 
        class="vote-btn down" 
        :class="{ active: userVote === 'down' }"
        @click="handleVote('down', $event)"
      >
        <span class="ripple"></span>
        <span class="vote-icon">👎</span>
        <span class="vote-count">{{ idea.votes.down }}</span>
      </button>
    </div>

    <div class="card-footer">
      <span class="score" :class="scoreClass">
        净值: {{ netScore }}
      </span>
      <span class="comment-count">
        💬 {{ idea.comments.length }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Idea, VoteType } from '@/composables/useIdeas'

const props = defineProps<{
  idea: Idea
  index: number
  userVote: VoteType
  formatTime: (timestamp: number) => string
  parseAvatar: (avatar: string) => { color: string; emoji: string }
}>()

const emit = defineEmits<{
  vote: [ideaId: string, voteType: VoteType]
  openDetail: [ideaId: string]
}>()

const avatarInfo = computed(() => props.parseAvatar(props.idea.authorAvatar))

const truncatedDescription = computed(() => {
  if (props.idea.description.length <= 60) return props.idea.description
  return props.idea.description.substring(0, 60) + '...'
})

const netScore = computed(() => props.idea.votes.up - props.idea.votes.down)

const scoreClass = computed(() => {
  const score = netScore.value
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
})

function handleVote(voteType: VoteType, event: Event) {
  const button = event.currentTarget as HTMLElement
  const ripple = button.querySelector('.ripple') as HTMLElement
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (event as MouseEvent).clientX - rect.left - size / 2
  const y = (event as MouseEvent).clientY - rect.top - size / 2
  
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  ripple.classList.add('animate')
  
  setTimeout(() => {
    ripple.classList.remove('animate')
  }, 600)

  emit('vote', props.idea.id, voteType)
}
</script>

<style scoped>
.idea-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: springIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
  transform: translateY(40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.idea-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-yellow), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.idea-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 212, 59, 0.2);
}

.idea-card:hover::before {
  opacity: 1;
}

@keyframes springIn {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.avatar-emoji {
  font-size: 22px;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.post-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.vote-section {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.vote-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.vote-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.vote-btn:active {
  transform: scale(0.95);
}

.vote-btn.up.active {
  background: rgba(81, 207, 102, 0.2);
  color: var(--success);
  box-shadow: 0 0 0 2px var(--success) inset;
}

.vote-btn.neutral.active {
  background: rgba(255, 212, 59, 0.2);
  color: var(--warning);
  box-shadow: 0 0 0 2px var(--warning) inset;
}

.vote-btn.down.active {
  background: rgba(255, 107, 107, 0.2);
  color: var(--danger);
  box-shadow: 0 0 0 2px var(--danger) inset;
}

.vote-icon {
  font-size: 16px;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  pointer-events: none;
}

.ripple.animate {
  animation: rippleEffect 0.6s ease-out;
}

@keyframes rippleEffect {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.score {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
}

.score.positive {
  color: var(--success);
  background: rgba(81, 207, 102, 0.15);
}

.score.negative {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.15);
}

.score.neutral {
  color: var(--text-secondary);
}

.comment-count {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
