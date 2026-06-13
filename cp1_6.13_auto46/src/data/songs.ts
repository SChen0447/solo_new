export interface SongNote {
  note: string;
  duration: number;
}

export interface Song {
  name: string;
  notes: SongNote[];
}

export const SONGS: Song[] = [
  {
    name: '小星星',
    notes: [
      { note: 'C4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 },
      { note: 'G4', duration: 2 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 2 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 2 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 2 },
      { note: 'C4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 },
      { note: 'G4', duration: 2 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 2 },
    ],
  },
  {
    name: '欢乐颂',
    notes: [
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'G4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'D4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'E4', duration: 1.5 }, { note: 'D4', duration: 0.5 },
      { note: 'D4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'G4', duration: 1 },
      { note: 'G4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'D4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 1.5 }, { note: 'C4', duration: 0.5 },
      { note: 'C4', duration: 2 },
    ],
  },
  {
    name: '两只老虎',
    notes: [
      { note: 'C4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'G4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'F4', duration: 1 },
      { note: 'G4', duration: 2 },
      { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 0.5 },
      { note: 'G4', duration: 0.5 }, { note: 'F4', duration: 0.5 },
      { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 0.5 },
      { note: 'G4', duration: 0.5 }, { note: 'F4', duration: 0.5 },
      { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'G3', duration: 1 },
      { note: 'C4', duration: 2 },
      { note: 'C4', duration: 1 }, { note: 'G3', duration: 1 },
      { note: 'C4', duration: 2 },
    ],
  },
];
