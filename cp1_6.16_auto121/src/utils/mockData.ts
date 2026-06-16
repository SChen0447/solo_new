import { v4 as uuidv4 } from 'uuid';
import { Track, AudioClip, Collaborator } from '@/types';

export function createMockCollaborators(): Collaborator[] {
  return [
    { id: 'user-1', name: '我', avatar: '🦊', online: true, color: '#42A5F5' },
    { id: 'user-2', name: '小明', avatar: '🐼', online: true, color: '#66BB6A' },
    { id: 'user-3', name: '小红', avatar: '🐨', online: true, color: '#EF5350' },
    { id: 'user-4', name: '阿强', avatar: '🐸', online: false, color: '#FFA726' },
    { id: 'user-5', name: '莉莉', avatar: '🦄', online: true, color: '#AB47BC' }
  ];
}

export function createInitialTracks(): Track[] {
  const tracks: Track[] = [
    {
      id: uuidv4(),
      name: '架子鼓',
      color: '#42A5F5',
      volume: 85,
      muted: false,
      solo: false,
      filterEnabled: false,
      filterFrequency: 20000,
      clips: [
        {
          id: uuidv4(),
          trackId: '',
          name: '鼓组Loop',
          startTime: 0,
          duration: 16,
          trimStart: 0,
          trimEnd: 16,
          buffer: null
        }
      ]
    },
    {
      id: uuidv4(),
      name: '贝斯',
      color: '#66BB6A',
      volume: 75,
      muted: false,
      solo: false,
      filterEnabled: true,
      filterFrequency: 8000,
      clips: [
        {
          id: uuidv4(),
          trackId: '',
          name: 'Bass Line',
          startTime: 2,
          duration: 24,
          trimStart: 1,
          trimEnd: 23,
          buffer: null
        }
      ]
    },
    {
      id: uuidv4(),
      name: '吉他',
      color: '#EF5350',
      volume: