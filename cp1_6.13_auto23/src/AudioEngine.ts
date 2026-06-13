export interface NoteEvent {
  timestamp: number;
  noteId: number;
}

const NOTE_FREQUENCIES: number[] = (() => {
  const freqs: number[] = [];
  const baseFreq = 261.63;
  for (let i = 0; i < 50; i++) {
    freqs.push(baseFreq * Math.pow(2, i / 12));
  }
  return freqs;
})();

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recording = false;
  private recordStartTime = 0;
  private recordedEvents: NoteEvent[] = [];
  private playbackTimeouts: number[] = [];
  private isPlayingBack = false;

  init(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNote(noteId: number): void {
    if (!this.ctx || !this.masterGain) return;

    const freq = NOTE_FREQUENCIES[noteId % NOTE_FREQUENCIES.length];
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;

    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.3;

    osc1.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);

    if (this.recording) {
      const elapsed = performance.now() - this.recordStartTime;
      this.recordedEvents.push({ timestamp: elapsed, noteId });
    }
  }

  startRecording(): void {
    this.recording = true;
    this.recordStartTime = performance.now();
    this.recordedEvents = [];
  }

  stopRecording(): NoteEvent[] {
    this.recording = false;
    return [...this.recordedEvents];
  }

  isRecording(): boolean {
    return this.recording;
  }

  getRecordedEvents(): NoteEvent[] {
    return [...this.recordedEvents];
  }

  startPlayback(events: NoteEvent[], onNoteTrigger: (noteId: number) => void): void {
    if (!events.length || this.isPlayingBack) return;
    this.stopPlayback();
    this.isPlayingBack = true;

    events.forEach((event) => {
      const id = window.setTimeout(() => {
        this.playNote(event.noteId);
        onNoteTrigger(event.noteId);
      }, event.timestamp);
      this.playbackTimeouts.push(id);
    });
  }

  stopPlayback(): void {
    this.playbackTimeouts.forEach((id) => clearTimeout(id));
    this.playbackTimeouts = [];
    this.isPlayingBack = false;
  }

  getIsPlayingBack(): boolean {
    return this.isPlayingBack;
  }

  getWaveformData(buffer: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(buffer);
    }
  }

  getFrequencyData(buffer: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(buffer);
    }
  }

  dispose(): void {
    this.stopPlayback();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
