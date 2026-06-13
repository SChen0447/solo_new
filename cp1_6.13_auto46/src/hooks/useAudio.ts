import { useRef, useCallback, useEffect } from 'react';

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, 'E#': 5, Fb: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, 'B#': 12, Cb: 11,
};

export function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return 440;
  const [, pitch, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitoneFromC = NOTE_SEMITONES[pitch] ?? 0;
  const midi = (octave + 1) * 12 + semitoneFromC;
  const a4Midi = 69;
  const a4Freq = 440;
  return a4Freq * Math.pow(2, (midi - a4Midi) / 12);
}

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playNote = useCallback((note: string, duration = 0.5) => {
    try {
      const ctx = ensureContext();
      const frequency = noteToFrequency(note);
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = frequency;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = frequency * 2;

      const gain = ctx.createGain();
      const attack = 0.02;
      const decay = 0.1;
      const sustain = 0.7;
      const release = 0.3;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.9, now + attack);
      gain.gain.linearRampToValueAtTime(0.9 * sustain, now + attack + decay);
      gain.gain.setValueAtTime(0.9 * sustain, now + duration);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration + release);

      const mixGain = ctx.createGain();
      mixGain.gain.value = 0.35;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(mixGain);
      mixGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + release + 0.05);
      osc2.stop(now + duration + release + 0.05);
    } catch (err) {
      console.warn('Audio play error', err);
    }
  }, [ensureContext]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return { playNote };
}
