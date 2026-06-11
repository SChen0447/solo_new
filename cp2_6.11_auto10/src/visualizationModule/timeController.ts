export type TimeChangeCallback = (monthIndex: number) => void;
export type PlayStateChangeCallback = (isPlaying: boolean) => void;

export class TimeController {
  private currentMonth: number = 0;
  private totalMonths: number = 12;
  private isPlaying: boolean = false;
  private playInterval: number = 1200;
  private lastUpdateTime: number = 0;
  private accumulatedTime: number = 0;
  private onChangeCallbacks: TimeChangeCallback[] = [];
  private onPlayStateChangeCallbacks: PlayStateChangeCallback[] = [];

  constructor(totalMonths: number = 12) {
    this.totalMonths = totalMonths;
  }

  setTotalMonths(total: number): void {
    this.totalMonths = total;
    if (this.currentMonth >= total) {
      this.currentMonth = total - 1;
    }
  }

  getCurrentMonth(): number {
    return this.currentMonth;
  }

  getTotalMonths(): number {
    return this.totalMonths;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setMonth(monthIndex: number): void {
    const clamped = Math.max(0, Math.min(this.totalMonths - 1, monthIndex));
    if (clamped !== this.currentMonth) {
      this.currentMonth = clamped;
      this.notifyChange();
    }
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastUpdateTime = performance.now();
    this.accumulatedTime = 0;
    this.notifyPlayStateChange();
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.notifyPlayStateChange();
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next(): void {
    if (this.currentMonth < this.totalMonths - 1) {
      this.setMonth(this.currentMonth + 1);
    } else {
      this.setMonth(0);
    }
  }

  prev(): void {
    if (this.currentMonth > 0) {
      this.setMonth(this.currentMonth - 1);
    } else {
      this.setMonth(this.totalMonths - 1);
    }
  }

  onChange(callback: TimeChangeCallback): void {
    this.onChangeCallbacks.push(callback);
  }

  onPlayStateChange(callback: PlayStateChangeCallback): void {
    this.onPlayStateChangeCallbacks.push(callback);
  }

  private notifyChange(): void {
    for (const cb of this.onChangeCallbacks) {
      cb(this.currentMonth);
    }
  }

  private notifyPlayStateChange(): void {
    for (const cb of this.onPlayStateChangeCallbacks) {
      cb(this.isPlaying);
    }
  }

  update(currentTime: number): void {
    if (!this.isPlaying) return;

    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    this.accumulatedTime += deltaTime;

    if (this.accumulatedTime >= this.playInterval) {
      this.accumulatedTime = 0;
      this.next();

      if (this.currentMonth === 0) {
        this.pause();
      }
    }
  }

  getPlayProgress(): number {
    if (!this.isPlaying) return 0;
    return this.accumulatedTime / this.playInterval;
  }

  getSmoothMonth(): number {
    if (!this.isPlaying) return this.currentMonth;
    return this.currentMonth + this.getPlayProgress();
  }

  setPlayInterval(ms: number): void {
    this.playInterval = Math.max(200, ms);
  }

  getPlayInterval(): number {
    return this.playInterval;
  }

  getMonthLabel(monthIndex?: number): string {
    const m = monthIndex !== undefined ? monthIndex : this.currentMonth;
    return `${m + 1}月`;
  }
}
