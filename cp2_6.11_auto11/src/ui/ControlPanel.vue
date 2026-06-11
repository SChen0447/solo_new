<template>
  <div class="control-panel">
    <div class="panel-content">
      <div class="brush-modes">
        <button
          v-for="mode in brushModes"
          :key="mode.value"
          :class="['brush-btn', mode.value, { active: brushMode === mode.value }]"
          @click="selectBrushMode(mode.value)"
        >
          <span class="icon">{{ mode.icon }}</span>
          <span class="label">{{ mode.label }}</span>
        </button>
      </div>

      <div class="radius-control">
        <label class="control-label">
          操作半径: <span class="value">{{ brushRadius.toFixed(1) }}</span>
        </label>
        <input
          type="range"
          :value="brushRadius"
          @input="handleRadiusChange"
          min="1"
          max="5"
          step="0.1"
          class="radius-slider"
        />
        <div class="radius-marks">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
      </div>

      <div class="history-controls">
        <button
          class="history-btn undo"
          :disabled="!canUndo"
          @click="$emit('undo')"
        >
          <span class="icon">↶</span>
          <span class="label">撤销</span>
        </button>
        <button
          class="history-btn redo"
          :disabled="!canRedo"
          @click="$emit('redo')"
        >
          <span class="icon">↷</span>
          <span class="label">重做</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { BrushMode } from '../core/MeshDeformer'

const props = defineProps<{
  brushMode: BrushMode
  brushRadius: number
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  'update:brushMode': [mode: BrushMode]
  'update:brushRadius': [radius: number]
  'undo': []
  'redo': []
}>()

const brushModes = ref([
  { value: 'smooth' as BrushMode, label: '平滑', icon: '◎' },
  { value: 'inflate' as BrushMode, label: '膨胀', icon: '⊕' },
  { value: 'deflate' as BrushMode, label: '凹陷', icon: '⊖' },
  { value: 'scrape' as BrushMode, label: '刮削', icon: '⟋' }
])

function selectBrushMode(mode: BrushMode): void {
  emit('update:brushMode', mode)
}

function handleRadiusChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const radius = parseFloat(target.value)
  emit('update:brushRadius', radius)
}
</script>

<style scoped>
.control-panel {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 900px;
  height: 180px;
  z-index: 50;
  pointer-events: none;
}

.panel-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 160px;
  background: linear-gradient(
    to top,
    rgba(10, 15, 30, 0.95) 0%,
    rgba(15, 25, 50, 0.85) 70%,
    rgba(20, 35, 70, 0) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top-left-radius: 50% 80px;
  border-top-right-radius: 50% 80px;
  border: 1px solid rgba(0, 255, 245, 0.2);
  border-bottom: none;
  box-shadow: 
    0 -5px 50px rgba(0, 255, 245, 0.1),
    inset 0 1px 0 rgba(0, 255, 245, 0.1);
  padding: 30px 60px 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  pointer-events: auto;
}

.brush-modes {
  display: flex;
  gap: 12px;
  flex: 1;
}

.brush-btn {
  flex: 1;
  min-width: 80px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 245, 0.3);
  border-radius: 12px;
  color: #00fff5;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.brush-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 255, 245, 0.1),
    transparent
  );
  transition: left 0.5s ease;
}

.brush-btn:hover::before {
  left: 100%;
}

.brush-btn:hover {
  transform: scale(1.1);
  border-color: #00fff5;
  box-shadow: 
    0 0 20px rgba(0, 255, 245, 0.4),
    inset 0 0 20px rgba(0, 255, 245, 0.05);
}

.brush-btn.active {
  transform: scale(1.05);
  box-shadow: 
    0 0 25px rgba(0, 255, 245, 0.5),
    inset 0 0 30px rgba(0, 255, 245, 0.1);
}

.brush-btn.smooth {
  color: #00fff5;
  border-color: rgba(0, 255, 245, 0.4);
}

.brush-btn.smooth.active,
.brush-btn.smooth:hover {
  border-color: #00fff5;
  box-shadow: 
    0 0 20px rgba(0, 255, 245, 0.4),
    inset 0 0 20px rgba(0, 255, 245, 0.05);
}

.brush-btn.inflate {
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.4);
}

.brush-btn.inflate.active,
.brush-btn.inflate:hover {
  border-color: #00ff88;
  box-shadow: 
    0 0 20px rgba(0, 255, 136, 0.4),
    inset 0 0 20px rgba(0, 255, 136, 0.05);
}

.brush-btn.deflate {
  color: #ff4466;
  border-color: rgba(255, 68, 102, 0.4);
}

.brush-btn.deflate.active,
.brush-btn.deflate:hover {
  border-color: #ff4466;
  box-shadow: 
    0 0 20px rgba(255, 68, 102, 0.4),
    inset 0 0 20px rgba(255, 68, 102, 0.05);
}

.brush-btn.scrape {
  color: #ffaa00;
  border-color: rgba(255, 170, 0, 0.4);
}

.brush-btn.scrape.active,
.brush-btn.scrape:hover {
  border-color: #ffaa00;
  box-shadow: 
    0 0 20px rgba(255, 170, 0, 0.4),
    inset 0 0 20px rgba(255, 170, 0, 0.05);
}

.brush-btn .icon {
  font-size: 24px;
  line-height: 1;
}

.brush-btn .label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.radius-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}

.control-label {
  color: #00fff5;
  font-size: 13px;
  font-weight: 500;
  text-shadow: 0 0 10px rgba(0, 255, 245, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label .value {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 15px rgba(0, 255, 245, 0.5);
}

.radius-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 3px;
  outline: none;
  border: 1px solid rgba(0, 255, 245, 0.3);
}

.radius-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #00fff5;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(0, 255, 245, 0.6);
  transition: all 0.2s ease;
}

.radius-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 25px rgba(0, 255, 245, 0.8);
}

.radius-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #00fff5;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 15px rgba(0, 255, 245, 0.6);
}

.radius-marks {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.radius-marks span {
  color: rgba(0, 255, 245, 0.5);
  font-size: 11px;
}

.history-controls {
  display: flex;
  gap: 12px;
}

.history-btn {
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 245, 0.3);
  border-radius: 10px;
  color: #00fff5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 500;
}

.history-btn:hover:not(:disabled) {
  transform: scale(1.1);
  border-color: #00fff5;
  box-shadow: 
    0 0 20px rgba(0, 255, 245, 0.4),
    inset 0 0 20px rgba(0, 255, 245, 0.05);
}

.history-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.history-btn.undo {
  color: #ff6b9d;
  border-color: rgba(255, 107, 157, 0.4);
}

.history-btn.undo:hover:not(:disabled) {
  border-color: #ff6b9d;
  box-shadow: 
    0 0 20px rgba(255, 107, 157, 0.4),
    inset 0 0 20px rgba(255, 107, 157, 0.05);
}

.history-btn.redo {
  color: #6bff9d;
  border-color: rgba(107, 255, 157, 0.4);
}

.history-btn.redo:hover:not(:disabled) {
  border-color: #6bff9d;
  box-shadow: 
    0 0 20px rgba(107, 255, 157, 0.4),
    inset 0 0 20px rgba(107, 255, 157, 0.05);
}

.history-btn .icon {
  font-size: 18px;
}

@media (max-width: 768px) {
  .control-panel {
    width: 100%;
    height: auto;
  }
  
  .panel-content {
    flex-direction: column;
    height: auto;
    padding: 20px 30px;
    gap: 15px;
  }
  
  .brush-modes {
    width: 100%;
  }
  
  .radius-control {
    width: 100%;
    min-width: unset;
  }
  
  .history-controls {
    width: 100%;
  }
  
  .history-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
