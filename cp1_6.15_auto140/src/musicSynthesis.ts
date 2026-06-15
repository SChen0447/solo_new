import { randomInt } from './utils';

export interface EmotionWeights {
  joy: number;
  sorrow: number;
}

export interface MusicController {
  play: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  isPlaying: () => boolean;
}

const PENTATONIC_SCALE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.00,
  A4: 440.00,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.00,
};

const NOTE_DURATION = 0.5;
const SAMPLE_RATE = 44100;

const DRONE_FREQUENCIES = [130.81, 146.83, 164.81, 196.00, 220.00];

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });
  }
  return audioContext;
}

export function generateMelody(emotion: EmotionWeights): MusicController {
  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.5;

  const melodyGain = ctx.createGain();
  melodyGain.connect(masterGain);
  melodyGain.gain.value = 0.35;

  const droneGain = ctx.createGain();
  droneGain.connect(masterGain);
  droneGain.gain.value = 0.15;

  const melodyNotes = generateMelodyNotes(emotion);
  let isPlaying = false;
  let currentTimeouts: number[] = [];
  let droneOscillators: OscillatorNode[] = [];
  let melodyNoteIndex = 0;

  function playDrone(): void {
    const baseFreq = DRONE_FREQUENCIES[randomInt(0, DRONE_FREQUENCIES.length - 1)];
    const freqs = [baseFreq, baseFreq * 1.5];

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 500;
      filter.Q.value = 1;

      gain.gain.value = 0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(droneGain);

      osc.start();
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);

      droneOscillators.push(osc);
    });
  }

  function stopDrone(): void {
    droneOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Ignore errors from already stopped oscillators
      }
    });
    droneOscillators = [];
  }

  function playNote(frequency: number, startTime: number, duration: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = frequency;

    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(melodyGain);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0.4, startTime + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, startTime + duration * 0.95);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function scheduleMelody(): void {
    if (!isPlaying) return;

    const note = melodyNotes[melodyNoteIndex % melodyNotes.length];
    const frequencies = Object.values(PENTATONIC_SCALE);
    const frequency = frequencies[note];

    const timeout = window.setTimeout(() => {
      if (isPlaying) {
        playNote(frequency, ctx.currentTime, NOTE_DURATION);
        melodyNoteIndex++;
        scheduleMelody();
      }
    }, NOTE_DURATION * 1000);

    currentTimeouts.push(timeout);
  }

  function play(): void {
    if (isPlaying) return;
    isPlaying = true;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    playDrone();

    const firstNote = melodyNotes[0];
    const frequencies = Object.values(PENTATONIC_SCALE);
    playNote(frequencies[firstNote], ctx.currentTime, NOTE_DURATION);
    melodyNoteIndex = 1;

    scheduleMelody();
  }

  function stop(): void {
    isPlaying = false;

    currentTimeouts.forEach((timeout) => clearTimeout(timeout));
    currentTimeouts = [];

    stopDrone();

    melodyGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    setTimeout(() => {
      melodyGain.gain.value = 0.35;
      droneGain.gain.value = 0.15;
    }, 600);
  }

  function setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    masterGain.gain.linearRampToValueAtTime(clampedVolume, ctx.currentTime + 0.1);
  }

  function isPlayingCheck(): boolean {
    return isPlaying;
  }

  return {
    play,
    stop,
    setVolume,
    isPlaying: isPlayingCheck,
  };
}

function generateMelodyNotes(emotion: EmotionWeights): number[] {
  const melodyLength = randomInt(8, 16);
  const notes: number[] = [];

  const baseRange = emotion.sorrow > emotion.joy ? [0, 1, 2, 3, 4] : [3, 4, 5, 6, 7];

  for (let i = 0; i < melodyLength; i++) {
    const rangeIndex = randomInt(0, baseRange.length - 1);
    notes.push(baseRange[rangeIndex]);
  }

  if (notes.length > 0) {
    const endNote = emotion.sorrow > emotion.joy ? 0 : 7;
    notes[notes.length - 1] = endNote;
  }

  return notes;
}
