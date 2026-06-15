import { useAudioStore } from './store';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 50;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      useAudioStore.getState().setAudioContext(this.audioContext);
    }
  }

  public async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('文件大小不能超过20MB');
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
    if (!validTypes.includes(file.type)) {
      throw new Error('只支持MP3和WAV格式的音频文件');
    }

    if (!this.audioContext) {
      this.initAudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  public createAudioGraph(buffer: AudioBuffer): void {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    this.stop();

    this.source = this.audioContext!.createBufferSource();
    this.source.buffer = buffer;

    this.bassFilter = this.audioContext!.createBiquadFilter();
    this.bassFilter.type = 'peaking';
    this.bassFilter.frequency.value = 165;
    this.bassFilter.Q.value = 1.0;
    this.bassFilter.gain.value = 0;

    this.trebleFilter = this.audioContext!.createBiquadFilter();
    this.trebleFilter.type = 'peaking';
    this.trebleFilter.frequency.value = 5000;
    this.trebleFilter.Q.value = 1.0;
    this.trebleFilter.gain.value = 0;

    this.gainNode = this.audioContext!.createGain();
    this.gainNode.gain.value = 1.0;

    this.analyser = this.audioContext!.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.source.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext!.destination);

    useAudioStore.getState().setAudioSource(this.source);
    useAudioStore.getState().setAnalyser(this.analyser);
    useAudioStore.getState().setGainNode(this.gainNode);
    useAudioStore.getState().setBassFilter(this.bassFilter);
    useAudioStore.getState().setTrebleFilter(this.trebleFilter);

    const state = useAudioStore.getState();
    this.gainNode.gain.value = state.volume;
    this.bassFilter.gain.value = state.bassGain;
    this.trebleFilter.gain.value = state.trebleGain;

    this.source.onended = () => {
      useAudioStore.getState().setPlaying(false);
      this.stopSpectrumUpdate();
    };
  }

  public play(): void {
    if (this.source && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.source.start(0);
      useAudioStore.getState().setPlaying(true);
      this.startSpectrumUpdate();
    }
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.bassFilter) {
      this.bassFilter.disconnect();
      this.bassFilter = null;
    }
    if (this.trebleFilter) {
      this.trebleFilter.disconnect();
      this.trebleFilter = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.stopSpectrumUpdate();
    useAudioStore.getState().setPlaying(false);
  }

  private startSpectrumUpdate(): void {
    this.lastUpdateTime = performance.now();
    this.updateSpectrum();
  }

  private stopSpectrumUpdate(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateSpectrum = (): void => {
    const now = performance.now();
    if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
      this.lastUpdateTime = now;

      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);

        const resampledData = this.resampleData(this.dataArray, 400);
        useAudioStore.getState().setFrequencyData(resampledData);
      }
    }

    if (useAudioStore.getState().isPlaying) {
      this.animationId = requestAnimationFrame(this.updateSpectrum);
    }
  };

  private resampleData(data: Uint8Array, targetLength: number): Uint8Array {
    const result = new Uint8Array(targetLength);
    const sourceLength = data.length;
    const step = sourceLength / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let sum = 0;
      let count = 0;

      for (let j = start; j < end && j < sourceLength; j++) {
        sum += data[j];
        count++;
      }

      result[i] = count > 0 ? Math.floor(sum / count) : 0;
    }

    return result;
  }

  public destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    useAudioStore.getState().reset();
  }
}

export const audioEngine = new AudioEngine();
