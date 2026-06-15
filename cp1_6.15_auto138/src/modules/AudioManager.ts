export type SoundType = 'jump' | 'collision' | 'collect' | 'bounce' | 'door' | 'fail' | 'win';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  public init(): void {
    if (typeof window !== 'undefined' && !this.initialized) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.initialized = true;
    }
  }

  public playSound(type: SoundType): void {
    if (!this.audioContext) {
      this.init();
    }
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    switch (type) {
      case 'jump':
        this.playJumpSound();
        break;
      case 'collision':
        this.playCollisionSound();
        break;
      case 'collect':
        this.playCollectSound();
        break;
      case 'bounce':
        this.playBounceSound();
        break;
      case 'door':
        this.playDoorSound();
        break;
      case 'fail':
        this.playFailSound();
        break;
      case 'win':
        this.playWinSound();
        break;
    }
  }

  private playJumpSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  private playCollisionSound(): void {
    if (!this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * 0.08;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  private playCollectSound(): void {
    if (!this.audioContext) return;

    const oscillator1 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(600, this.audioContext.currentTime);

    gainNode1.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.12);

    oscillator1.connect(gainNode1);
    gainNode1.connect(this.audioContext.destination);

    oscillator1.start();
    oscillator1.stop(this.audioContext.currentTime + 0.12);

    const oscillator2 = this.audioContext.createOscillator();
    const gainNode2 = this.audioContext.createGain();

    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.12);

    gainNode2.gain.setValueAtTime(0.3, this.audioContext.currentTime + 0.12);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator2.connect(gainNode2);
    gainNode2.connect(this.audioContext.destination);

    oscillator2.start(this.audioContext.currentTime + 0.12);
    oscillator2.stop(this.audioContext.currentTime + 0.2);
  }

  private playBounceSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  private playDoorSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  private playFailSound(): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  private playWinSound(): void {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime + index * 0.15);

      gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + index * 0.15 + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(this.audioContext!.currentTime + index * 0.15);
      oscillator.stop(this.audioContext!.currentTime + index * 0.15 + 0.3);
    });
  }
}
