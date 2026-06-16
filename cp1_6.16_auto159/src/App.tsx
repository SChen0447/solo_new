import React, { useState, useRef, useCallback, useEffect } from 'react';
import NoteEditor from './NoteEditor';
import Controls from './Controls';
import { MusicEngine, PlaybackState } from './MusicEngine';
import {
  Note,
  NoteDuration,
  createNote,
  DURATION_TO_EIGHTHS,
  MAX_COLUMNS,
} from './ScoreData';

const MAX_HISTORY = 20;

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<NoteDuration>('eighth');
  const [bpm, setBpm] = useState<number>(120);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentColumn, setCurrentColumn] = useState<number>(-1);
  const [history, setHistory] = useState<Note[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const musicEngineRef = useRef<MusicEngine | null>(null);

  useEffect(() => {
    musicEngineRef.current = new MusicEngine({