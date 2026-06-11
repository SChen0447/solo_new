import { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioFile, LyricsTrack, LyricLine, ViewMode } from './types';
import {
  createTrack,
  getTrackByAudioId,
  addLine,
  updateLine,
  deleteLine
} from './utils/db';
import Waveform from './components/Waveform';
import LyricsDisplay from './components/LyricsDisplay';
import LyricsEditor from './components/LyricsEditor';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    return saved || 'player';
  });
  
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudio, setCurrentAudio] = useState<AudioFile | null>(() => {
    const saved = localStorage.getItem('currentAudioId');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentTrack, setCurrentTrack] = useState<LyricsTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState