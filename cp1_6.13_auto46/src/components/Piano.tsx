import { useCallback, useEffect, useMemo } from 'react';
import { useAudio } from '@/hooks/useAudio';
import { usePianoStore } from '@/store/usePianoStore';
import { SONGS } from '@/data/songs';
import './Piano.css';

interface PianoKeyData {
  note: string;
  isBlack: boolean;
  keyLabel: string | null;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_SET = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);

const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C3', 'x': 'D3', 'c': 'E3', 'v': 'F3', 'b': 'G3', 'n': 'A3', 'm': 'B3',
  'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 'g': 'G4', 'h': 'A4', 'j': 'B4',
  'k': 'C5', 'l': 'D5', ';': 'E5',
  'q': 'C6', 'w': 'D6', 'e': 'E6', 'r': 'F6', 't': 'G6', 'y': 'A6', 'u': 'B6',
  '1': 'C#3', '2': 'D#3', '4': 'F#3', '5': 'G#3', '6': 'A#3',
  'i': 'C#4', 'o': 'D#4', 'p': 'F#4', '[': 'F#4', ']': 'G#4', '\\': 'A#4',
};

const WHITE_KEY_W = 30;
const WHITE_KEY_H = 200;
const BLACK_KEY_W = 18;
const BLACK_KEY_H = 120;

function buildKeys(): PianoKeyData[] {
  const keys: PianoKeyData[] = [];
  for (let octave = 3; octave <= 6; octave++) {
    for (const name of NOTE_NAMES) {
      const note = `${name}${octave}`;
      const isBlack = BLACK_SET.has(name);
      const mapKey = Object.entries(KEYBOARD_MAP).find(([, v]) => v === note)?.[0] ?? null;
      keys.push({ note, isBlack, keyLabel: mapKey });
    }
  }
  return keys;
}

export default function Piano() {
  const { playNote } = useAudio();
  const activeNotes = usePianoStore((s) => s.activeNotes);
  const addActiveNote = usePianoStore((s) => s.addActiveNote);
  const removeActiveNote = usePianoStore((s) => s.removeActiveNote);
  const isRecording = usePianoStore((s) => s.isRecording);
  const addRecordedNote = usePianoStore((s) => s.addRecordedNote);
  const handleNotePlayed = usePianoStore((s) => s.handleNotePlayed);
  const currentSongIndex = usePianoStore((s) => s.currentSongIndex);
  const learningMode = usePianoStore((s) => s.learningMode);

  const keys = useMemo(buildKeys, []);
  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);
  const totalWhiteWidth = whiteKeys.length * WHITE_KEY_W;
  const songNotes = SONGS[currentSongIndex]?.notes ?? [];

  const triggerNote = useCallback((note: string) => {
    playNote(note);
    addActiveNote(note);
    if (isRecording) addRecordedNote(note);
    if (learningMode) handleNotePlayed(note, songNotes);
  }, [playNote, addActiveNote, isRecording, addRecordedNote, learningMode, handleNotePlayed, songNotes]);

  const releaseNote = useCallback((note: string) => {
    removeActiveNote(note);
  }, [removeActiveNote]);

  useEffect(() => {
    const held = new Set<string>();

    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const note = KEYBOARD_MAP[key];
      if (note && !held.has(key)) {
        held.add(key);
        triggerNote(note);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      held.delete(key);
      const note = KEYBOARD_MAP[key];
      if (note) releaseNote(note);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [triggerNote, releaseNote]);

  const getBlackKeyLeft = (blackKey: PianoKeyData): number => {
    const noteName = blackKey.note.replace(/\d/, '');
    const octave = parseInt(blackKey.note.slice(-1), 10);
    const whiteBefore = blackKeys.slice(0, blackKeys.indexOf(blackKey)).filter(
      (k) => parseInt(k.note.slice(-1), 10) < octave ||
        (parseInt(k.note.slice(-1), 10) === octave && WHITE_NAMES.indexOf(k.note.replace(/\d/, '')) < WHITE_NAMES.indexOf(noteName.replace('#', '')))
    );
    const whiteIdx = (octave - 3) * 7 + WHITE_NAMES.indexOf(noteName.replace('#', '') as typeof WHITE_NAMES[number]);
    return whiteIdx * WHITE_KEY_W + WHITE_KEY_W - BLACK_KEY_W / 2;
  };

  return (
    <div className="piano-wrapper">
      <div className="piano-container" style={{ width: totalWhiteWidth + 16, height: WHITE_KEY_H + 16 }}>
        <div className="piano-white-row">
          {whiteKeys.map((k) => {
            const isActive = activeNotes.has(k.note);
            return (
              <div
                key={k.note}
                className={`piano-key piano-white ${isActive ? 'piano-active' : ''}`}
                style={{ width: WHITE_KEY_W, height: WHITE_KEY_H }}
                onMouseDown={() => triggerNote(k.note)}
                onMouseUp={() => releaseNote(k.note)}
                onMouseLeave={() => { if (activeNotes.has(k.note)) releaseNote(k.note); }}
                onTouchStart={(e) => { e.preventDefault(); triggerNote(k.note); }}
                onTouchEnd={(e) => { e.preventDefault(); releaseNote(k.note); }}
              >
                {k.keyLabel && <span className="piano-label">{k.keyLabel.toUpperCase()}</span>}
                <span className="piano-note-label">{k.note}</span>
              </div>
            );
          })}
        </div>
        <div className="piano-black-row">
          {blackKeys.map((k) => {
            const isActive = activeNotes.has(k.note);
            const left = getBlackKeyLeft(k);
            return (
              <div
                key={k.note}
                className={`piano-key piano-black ${isActive ? 'piano-active' : ''}`}
                style={{ left: left + 8, width: BLACK_KEY_W, height: BLACK_KEY_H }}
                onMouseDown={() => triggerNote(k.note)}
                onMouseUp={() => releaseNote(k.note)}
                onMouseLeave={() => { if (activeNotes.has(k.note)) releaseNote(k.note); }}
                onTouchStart={(e) => { e.preventDefault(); triggerNote(k.note); }}
                onTouchEnd={(e) => { e.preventDefault(); releaseNote(k.note); }}
              >
                {k.keyLabel && <span className="piano-label piano-label-black">{k.keyLabel.toUpperCase()}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
