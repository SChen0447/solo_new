export interface BeatEvent {
  time: number;
  index: number;
}

export interface Track {
  name: string;
  sequence: number[];
}

export const TRACKS: Track[] = [
  {
    name: 'Steady Pulse',
    sequence: [500, 500, 500, 500, 500, 500, 500, 500,
               500, 500, 500, 500, 500, 500, 500, 500,
               400, 400, 400, 400, 400, 400, 400, 400,
               400, 400, 400, 400, 400, 400, 400, 400,
               350, 350, 350, 350, 350, 350, 350, 350,
               350, 350, 350, 350, 350, 350, 350, 350,
               300, 300, 300, 300, 300, 300, 300, 300,
               300, 300, 300, 300, 300, 300, 300, 300],
  },
  {
    name: 'Syncopation',
    sequence: [600, 300, 600, 300, 600, 300, 600, 300,
               500, 250, 500, 250, 500, 250, 500, 250,
               400, 200, 400, 200, 600, 200, 400, 200,
               400, 200, 400, 200, 600, 200, 400, 200,
               350, 175, 350, 175, 350, 175, 350, 175,
               500, 175, 350, 175, 350, 175, 350, 175,
               300, 150, 300, 150, 300, 150, 300, 150,
               450, 150, 300, 150, 300, 150, 300, 150],
  },
];

export class BeatEngine {
  private track: Track;
  private beatTimes: number[] = [];
  private startTime: number = 0;
  private nextBeatIndex: number = 0;
  private running: boolean = false;

  constructor(trackIndex: number) {
    this.track = TRACKS[trackIndex];
    this.buildBeatTimes();
  }

  private buildBeatTimes(): void {
    this.beatTimes = [];
    let acc = 0;
    for (const interval of this.track.sequence) {
      acc += interval;
      this.beatTimes.push(acc);
    }
  }

  start(): void {
    this.startTime = performance.now();
    this.nextBeatIndex = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  getElapsed(): number {
    return performance.now() - this.startTime;
  }

  pollBeats(): BeatEvent[] {
    if (!this.running) return [];

    const elapsed = this.getElapsed();
    const events: BeatEvent[] = [];

    while (this.nextBeatIndex < this.beatTimes.length &&
           this.beatTimes[this.nextBeatIndex] <= elapsed) {
      events.push({
        time: this.beatTimes[this.nextBeatIndex],
        index: this.nextBeatIndex,
      });
      this.nextBeatIndex++;
    }

    return events;
  }

  getCurrentSpeed(): number {
    const idx = Math.min(this.nextBeatIndex, this.track.sequence.length - 1);
    return this.track.sequence[idx];
  }

  getJumpDuration(): number {
    const speed = this.getCurrentSpeed();
    return speed * 0.85;
  }

  isFinished(): boolean {
    return this.nextBeatIndex >= this.beatTimes.length;
  }

  getTrackName(): string {
    return this.track.name;
  }

  getTotalBeats(): number {
    return this.beatTimes.length;
  }

  isRunning(): boolean {
    return this.running;
  }

  getTimeToNextBeat(): number {
    if (this.nextBeatIndex >= this.beatTimes.length) return Infinity;
    return this.beatTimes[this.nextBeatIndex] - this.getElapsed();
  }

  getBeatTime(index: number): number {
    return this.beatTimes[index] ?? 0;
  }
}
