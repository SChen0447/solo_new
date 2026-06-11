// @ts-nocheck
export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
  array: Float32Array;
}

export type AudioSourceType = 'file' | 'microphone' | null;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  
  private frequencyData: Float32Array;
  private timeData: Float32Array;
  private fftSize = 2048;
  private smoothingTimeConstant = 0.8;
  
  private isPlaying = false;
  private sourceType: AudioSourceType = null;
  
  private eventTarget: EventTarget;
  
  constructor() {
    this.eventTarget = new EventTarget();
    this.frequencyData = new Float32Array(this.fftSize / 2);
    this.timeData = new Float32Array(this.fftSize / 2);
  }
  
  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.7;
      
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser.frequencyBinCount);
    }
  }
  
  async loadFile(file: File): Promise<void> {
    this.stop();
    this.initContext();
    
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.audioElement = new Audio();
      this.audioElement.src = url;
      this.audioElement.crossOrigin = 'anonymous';
      
      this.audioElement.addEventListener('canplay', () => {
        if (!this.audioContext || !this.analyser) return;
        
        this.source = this.audioContext.createMediaElementSource(this.audioElement!);
        this.source.connect(this.analyser);
        
        this.sourceType = 'file';
        resolve();
      });
      
      this.audioElement.addEventListener('error', () => {
        reject(new Error('音频文件加载失败'));
      });
    });
  }
  
  async startMicrophone(): Promise<void> {
    this.stop();
    this.initContext();
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      if (!this.audioContext || !this.analyser) return;
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);
      
      this.sourceType = 'microphone';
      this.isPlaying = true;
      
      this.dispatchEvent('play');
    } catch (error) {
      throw new Error('麦克风权限被拒绝或不可用');
    }
  }
  
  async play(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    if (this.audioElement && this.sourceType === 'file') {
      await this.audioElement.play();
      this.isPlaying = true;
      this.dispatchEvent('play');
    }
  }
  
  pause(): void {
    if (this.audioElement && this.sourceType === 'file') {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this.dispatchEvent('pause');
  }
  
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    this.isPlaying = false;
    this.sourceType = null;
    this.dispatchEvent('stop');
  }
  
  getFrequencyData(): FrequencyData {
    if (!this.analyser) {
      return {
        low: 0,
        mid: 0,
        high: 0,
        array: new Float32Array(1024)
      };
    }
    
    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeData);
    
    const normalizedData = new Float32Array(this.frequencyData.length);
    for (let i = 0; i < this.frequencyData.length; i++) {
      const dbValue = this.frequencyData[i];
      normalizedData[i] = Math.max(0, Math.min(1, (dbValue + 100) / 100));
    }
    
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binHz = nyquist / this.frequencyData.length;
    
    const lowStartBin = Math.floor(20 / binHz);
    const lowEndBin = Math.floor(250 / binHz);
    const midStartBin = lowEndBin + 1;
    const midEndBin = Math.floor(2000 / binHz);
    const highStartBin = midEndBin + 1;
    const highEndBin = Math.floor(20000 / binHz);
    
    let lowSum = 0;
    let lowCount = 0;
    for (let i = lowStartBin; i <= Math.min(lowEndBin, normalizedData.length - 1); i++) {
      lowSum += normalizedData[i];
      lowCount++;
    }
    
    let midSum = 0;
    let midCount = 0;
    for (let i = midStartBin; i <= Math.min(midEndBin, normalizedData.length - 1); i++) {
      midSum += normalizedData[i];
      midCount++;
    }
    
    let highSum = 0;
    let highCount = 0;
    for (let i = highStartBin; i <= Math.min(highEndBin, normalizedData.length - 1); i++) {
      highSum += normalizedData[i];
      highCount++;
    }
    
    return {
      low: lowCount > 0 ? Math.pow(lowSum / lowCount, 0.5) : 0,
      mid: midCount > 0 ? Math.pow(midSum / midCount, 0.5) : 0,
      high: highCount > 0 ? Math.pow(highSum / highCount, 0.5) : 0,
      array: normalizedData
    };
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getSourceType(): AudioSourceType {
    return this.sourceType;
  }
  
  addEventListener(type: string, callback: EventListener): void {
    this.eventTarget.addEventListener(type, callback);
  }
  
  removeEventListener(type: string, callback: EventListener): void {
    this.eventTarget.removeEventListener(type, callback);
  }
  
  private dispatchEvent(type: string): void {
    this.eventTarget.dispatchEvent(new Event(type));
  }
  
  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }
  
  dispose(): void {
    this.stop();
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
