import { PlayEvent, Recording, PlaybackSpeed } from '../types';

export class Recorder {
  private events: PlayEvent[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private savedRecording: Recording | null = null;
  private maxDuration: number = 30000;
  
  private playbackTimeouts: number[] = [];
  private isPlaying: boolean = false;
  private playbackSpeed: PlaybackSpeed = 1;

  public startRecording(): void {
    this.events = [];
    this.startTime = performance.now();
    this.isRecording = true;
  }

  public stopRecording(): Recording | null {
    if (!this.isRecording) return null;
    
    this.isRecording = false;
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    if (this.events.length === 0) {
      return null;
    }

    const recording: Recording = {
      id: `rec-${Date.now()}`,
      events: [...this.events],
      duration,
      createdAt: Date.now(),
    };

    this.savedRecording = recording;
    return recording;
  }

  public recordEvent(bellId: string, velocity: number = 1): void {
    if (!this.isRecording) return;
    
    const elapsed = performance.now() - this.startTime;
    
    if (elapsed > this.maxDuration) {
      this.stopRecording();
      return;
    }

    const roundedTimestamp = Math.round(elapsed / 10) * 10;
    
    this.events.push({
      bellId,
      timestamp: roundedTimestamp,
      velocity,
    });
  }

  public startPlayback(
    onPlayEvent: (bellId: string, velocity: number) => void,
    onComplete: () => void
  ): void {
    if (!this.savedRecording || this.isPlaying) return;

    this.isPlaying = true;
    this.playbackTimeouts = [];

    const recording = this.savedRecording;

    recording.events.forEach((event) => {
      const adjustedTime = event.timestamp / this.playbackSpeed;
      const timeout = window.setTimeout(() => {
        onPlayEvent(event.bellId, event.velocity);
      }, adjustedTime);
      this.playbackTimeouts.push(timeout);
    });

    const totalDuration = recording.duration / this.playbackSpeed;
    const endTimeout = window.setTimeout(() => {
      this.isPlaying = false;
      this.playbackTimeouts = [];
      onComplete();
    }, totalDuration + 50);
    this.playbackTimeouts.push(endTimeout);
  }

  public stopPlayback(): void {
    this.playbackTimeouts.forEach((t) => clearTimeout(t));
    this.playbackTimeouts = [];
    this.isPlaying = false;
  }

  public setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;
  }

  public getPlaybackSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getSavedRecording(): Recording | null {
    return this.savedRecording;
  }

  public getElapsedTime(): number {
    if (!this.isRecording) return 0;
    return performance.now() - this.startTime;
  }

  public destroy(): void {
    this.stopPlayback();
    this.events = [];
    this.savedRecording = null;
  }
}
