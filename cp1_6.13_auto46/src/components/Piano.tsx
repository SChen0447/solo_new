import { useCallback, useEffect, useMemo } from 'react';
import { useAudio } from '@/hooks/useAudio';
import { usePianoStore } from '@/store/usePianoStore';
import './Piano.css';

interface PianoKey {
  note: string;
  isBlack: boolean;
  keyLabel: string | null;
}

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_AFTER: Record<string, string | null> = {
  C: 'C#', D: 'D#', E: null, F: 'F#', G: 'G#', A: 'A#', B: null,
};

const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3',
  'v': 'F3', 'g': 'F#3', 'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
  'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
  'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5',
};

const WHITE_KEY_WIDTH = 30;
const WHITE_KEY_HEIGHT = 200;
const BLACK_KEY_WIDTH = 18;
const BLACK_KEY_HEIGHT = 120;

function buildKeys(): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let octave = 3; octave <= 6; octave++) {
    for (const w of WHITE_NOTES) {
      const note = `${w}${octave}`;
      const mapKey = Object.entries(KEYBOARD_MAP).find(([, v]) => v === note)?.[0] ?? null;
      keys.push({ note, isBlack: false, keyLabel: mapKey });
      const black = BLACK_AFTER[w];
      if (black) {
        const bNote = `${black}${octave}`;
        const bKey = Object.entries(KEYBOARD_MAP).find(([, v]) => v === bNote)?.[0] ?? null;
        keys.push({ note: bNote, isBlack: true, keyLabel: bKey });
      }
    }
  }
  return keys;
}

export default function Piano() {
  const { playNote } = useAudio();
  const {
    activeNotes, addActiveNote, removeActiveNote,
    isRecording, addRecordedNote, handleNotePlayed,
  } = usePianoStore();

  const keys = useMemo(buildKeys, []);

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const totalWhiteWidth = whiteKeys.length * WHITE_KEY_WIDTH;

  const triggerNote = useCallback((note: string) => {
    playNote(note);
    addActiveNote(note);
    if (isRecording) addRecordedNote(note);
  }, [playNote, addActiveNote, isRecording, addRecordedNote]);

  const releaseNote = useCallback((note: string) => {
    removeActiveNote(note);
  }, [removeActiveNote]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const note = KEYBOARD_MAP[key];
    if (note) {
      triggerNote(note);
    }
  }, [triggerNote]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const note = KEYBOARD_MAP[key];
    if (note) {
      releaseNote(note);
    }
  }, [releaseNote]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  const songNotes = usePianoStore((s) => {
    const { currentSongIndex } = s;
    return [];
  });

  const handlePress = useCallback((note: string) => {
    triggerNote(note);
    // Handle learning mode feedback in App via store callback when needed
    // Here we just notify store:
    const state = usePianoStore.getState();
    if (state.learningMode && songNotes.length === 0) {
      // fallback: handled in App
    }
  }, [triggerNote, songNotes.length]);

  const computeBlackOffset = (whiteIndex: number): number => {
    return whiteIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
  };

  let blackIndex = 0;
  const blackKeysWithOffset: { key: PianoKey; left: number }[] = [];
  let whiteIdx = 0;
  for (const k of keys) {
    if (k.isBlack) {
      blackKeysWithOffset.push({ key: k, left: computeBlackOffset(whiteIdx) });
      blackIndex++;
    } else {
      whiteIdx++;
    }
  }

  return (
    <div className="piano-wrapper">
      <div className="piano-container" style={{ width: totalWhiteWidth, height: WHITE_KEY_HEIGHT }}>
        <div className="piano-white-row">
          {whiteKeys.map((k) => {
            const isActive = activeNotes.has(k.note);
            return (
              <div
                key={k.note}
                className={`piano-key piano-white ${isActive ? 'piano-active' : ''}`}
                onMouseDown={() => handlePress(k.note)}
                onMouseUp={() => releaseNote(k.note)}
                onMouseLeave={() => releaseNote(k.note)}
                onTouchStart={(e) => { e.preventDefault(); handlePress(k.note); }}
                onTouchEnd={(e) => { e.preventDefault(); releaseNote(k.note); }}
              >
                {k.keyLabel && <span className="piano-label">{k.keyLabel.toUpperCase()}</span>}
                <span className="piano-note-label">{k.note}</span>
              </div>
            );
          })}
        </div>
        <div className="piano-black-row">
          {blackKeysWithOffset.map(({ key: k, left }) => {
            const isActive = activeNotes.has(k.note);
            return (
              <div
                key={k.note}
                className={`piano-key piano-black ${isActive ? 'piano-active' : ''}`}
                style={{ left: `${left}px`, width: `${BLACK_KEY_WIDTH}px`, height: `${BLACK_KEY_HEIGHT}px` }}
                onMouseDown={() => handlePress(k.note)}
                onMouseUp={() => releaseNote(k.note)}
                onMouseLeave={() => releaseNote(k.note)}
                onTouchStart={(e) => { e.preventDefault(); handlePress(k.note); }}
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
