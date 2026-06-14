export interface AudioData {
  frequencyData: Float32Array;
  timeDomainData: Float32Array;
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  volume: number;
}

class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Float32Array = new Float32Array();
  private timeDomainData: Float32Array = new Float32Array();
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private onEndedCallback: (() => void) | null = null;
  private duration: number = 0;

  async loadAudioFile(file: File): Promise<number> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Float32Array(bufferLength);
    this.timeDomainData = new Float32Array(bufferLength);

    return this.duration;
  }

  play(onEnded?: () => void): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    if (this.source) {
      this.source.stop();
      this.source.disconnect();
    }

    this.onEndedCallback = onEnded || null;

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.onended = () => {
      this.isPlaying = false;
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    const offset = this.pauseTime % this.duration;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.audioContext || !this.source || !this.isPlaying) return;
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  seek(time: number): void {
    if (!this.duration) return;
    this.pauseTime = Math.max(0, Math.min(time, this.duration));
    if (this.isPlaying) {
      this.play(this.onEndedCallback || undefined);
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.duration;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(volume, 1));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getAudioData(): AudioData {
    if (!this.analyser) {
      return {
        frequencyData: new Float32Array(),
        timeDomainData: new Float32Array(),
        lowFrequency: 0,
        midFrequency: 0,
        highFrequency: 0,
        volume: 0
      };
    }

    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    const bufferLength = this.frequencyData.length;
    const lowEnd = Math.floor(bufferLength * 0.1);
    const midEnd = Math.floor(bufferLength * 0.5);

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let volumeSum = 0;

    for (let i = 0; i < lowEnd; i++) {
      lowSum += this.normalizeFrequency(this.frequencyData[i]);
    }

    for (let i = lowEnd; i < midEnd; i++) {
      midSum += this.normalizeFrequency(this.frequencyData[i]);
    }

    for (let i = midEnd; i < bufferLength; i++) {
      highSum += this.normalizeFrequency(this.frequencyData[i]);
    }

    for (let i = 0; i < this.timeDomainData.length; i++) {
      volumeSum += Math.abs(this.timeDomainData[i]);
    }

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      lowFrequency: lowSum / lowEnd,
      midFrequency: midSum / (midEnd - lowEnd),
      highFrequency: highSum / (bufferLength - midEnd),
      volume: volumeSum / this.timeDomainData.length
    };
  }

  private normalizeFrequency(value: number): number {
    const minDb = -100;
    const maxDb = -10;
    return Math.max(0, Math.min(1, (value - minDb) / (maxDb - minDb)));
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
  }
}

const audioAnalyzer = new AudioAnalyzer();

export function getAudioData(): AudioData {
  return audioAnalyzer.getAudioData();
}

export default audioAnalyzer;
