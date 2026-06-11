export interface Track {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  fadeIn: number;
  fadeOut: number;
  waveformData: number[];
  file?: File;
  serverPath?: string;
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private trackSources: Map<string, AudioBufferSourceNode> = new Map();
  private trackGains: Map<string, GainNode> = new Map();
  private trackPanners: Map<string, StereoPannerNode> = new Map();
  private tracks: Map<string, Track> = new Map();
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onStateChange: ((state: AudioEngineState) => void) | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) this.initAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return this.audioContext!.decodeAudioData(arrayBuffer);
  }

  public extractWaveformData(audioBuffer: AudioBuffer, samples: number = 1000): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

