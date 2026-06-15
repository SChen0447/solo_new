import { DateTime } from 'luxon';
import { eventBus, Events } from '../utils/EventBus';
import { CountdownConfig, Timezone } from '../config/ConfigDataModel';

export interface RemainingTime {
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  isExpired: boolean;
}

type TimerStatus = 'running' | 'paused' | 'stopped';

class CountdownEngine {
  private timerId: number | null = null;
  private targetTimestamp: number = 0;
  private pausedRemainingMs: number = 0;
  private status: TimerStatus = 'stopped';
  private config: CountdownConfig | null = null;

  constructor() {
    eventBus.on(Events.CONFIG_CHANGED, this.handleConfigChange.bind(this));
    eventBus.on(Events.TIMER_CONTROL, this.handleControl.bind(this));
  }

  private handleConfigChange(config: CountdownConfig): void {
    this.config = config;
    this.reset();
  }

  private handleControl(action: 'start' | 'pause' | 'resume' | 'reset'): void {
    switch (action) {
      case 'start':
        this.start();
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.resume();
        break;
      case 'reset':
        this.reset();
        break;
    }
  }

  private parseTimezone(timezone: Timezone): number {
    const match = timezone.match(/UTC([+-]\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  }

  private calculateTargetTimestamp(config: CountdownConfig): number {
    const tzOffset = this.parseTimezone(config.timezone);
    
    if (config.useTargetTime && config.targetTime) {
      const target = DateTime.fromISO(config.targetTime, { zone: `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}` });
      if (target.isValid) {
        return target.toMillis();
      }
    }

    const durationMs = (config.durationHours * 3600 + config.durationMinutes * 60 + config.durationSeconds) * 1000;
    return Date.now() + durationMs;
  }

  private calculateRemaining(targetMs: number): RemainingTime {
    const now = Date.now();
    const totalMs = Math.max(0, targetMs - now);
    const isExpired = totalMs <= 0;

    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;

    return {
      totalMs,
      hours,
      minutes,
      seconds,
      milliseconds,
      isExpired
    };
  }

  start(): void {
    if (!this.config) return;
    
    if (this.status === 'paused') {
      this.resume();
      return;
    }

    this.targetTimestamp = this.calculateTargetTimestamp(this.config);
    this.status = 'running';
    this.startTicking();
  }

  private startTicking(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }

    const tick = () => {
      const remaining = this.calculateRemaining(this.targetTimestamp);
      eventBus.emit(Events.TICK, remaining);

      if (remaining.isExpired) {
        this.stop();
        eventBus.emit(Events.TIMER_ENDED);
      }
    };

    tick();
    this.timerId = window.setInterval(tick, 50);
  }

  pause(): void {
    if (this.status !== 'running' || this.timerId === null) return;

    clearInterval(this.timerId);
    this.timerId = null;
    this.pausedRemainingMs = Math.max(0, this.targetTimestamp - Date.now());
    this.status = 'paused';
  }

  resume(): void {
    if (this.status !== 'paused') return;

    this.targetTimestamp = Date.now() + this.pausedRemainingMs;
    this.status = 'running';
    this.startTicking();
  }

  reset(): void {
    this.stop();
    this.pausedRemainingMs = 0;
    
    if (this.config) {
      const targetMs = this.calculateTargetTimestamp(this.config);
      const remaining = this.calculateRemaining(targetMs);
      eventBus.emit(Events.TICK, remaining);
    }
  }

  private stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.status = 'stopped';
  }

  getStatus(): TimerStatus {
    return this.status;
  }

  destroy(): void {
    this.stop();
  }
}

export const countdownEngine = new CountdownEngine();
