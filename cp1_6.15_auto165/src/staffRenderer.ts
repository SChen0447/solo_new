import { Note, NoteType, BEAT_WIDTH, PITCH_SEMITONES } from './types';

const LINE_SPACING = 8;
const STAFF_TOP = 130;
const STAFF_LEFT = 60;
const NOTE_HEAD_WIDTH = 14;
const NOTE_HEAD_HEIGHT = 10;

const MIDDLE_C_SEMITONE = 60;
const MIDDLE_C_STAFF_POSITION = 7;

export function getPitchY(pitch: string): number {
  const semitone = PITCH_SEMITONES[pitch];
  if (semitone === undefined) return STAFF_TOP + LINE_SPACING * 4;
  const semitoneDiff = semitone - MIDDLE_C_SEMITONE;
  const staffSteps = semitoneDiff / 2;
  const position = MIDDLE_C_STAFF_POSITION - staffSteps;
  return STAFF_TOP + position * (LINE_SPACING / 2);
}

export function getBeatX(beatIndex: number): number {
  return STAFF_LEFT + 80 + beatIndex * BEAT_WIDTH;
}

export function yToPitch(y: number): string {
  const position = (y - STAFF_TOP) / (LINE_SPACING / 2);
  const staffSteps = MIDDLE_C_STAFF_POSITION - position;
  const semitone = Math.round(staffSteps * 2) + MIDDLE_C_SEMITONE;
  
  const pitches = Object.entries(PITCH_SEMITONES)
    .filter(([, s]) => s >= 60 && s <= 84)
    .sort(([, a], [, b]) => a - b);
  
  let closest = pitches[0][0];
  let minDiff = Math.abs(pitches[0][1] - semitone);
  
  for (const [pitch, s] of pitches) {
    const diff = Math.abs(s - semitone);
    if (diff < minDiff) {
      minDiff = diff;
      closest = pitch;
    }
  }
  
  return closest;
}

export function xToBeatIndex(x: number): number {
  const relativeX = x - STAFF_LEFT - 80;
  return Math.round(relativeX / BEAT_WIDTH);
}

export class StaffRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animationTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear() {
    this.ctx.fillStyle = '#fafafa';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStaff() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = STAFF_TOP + i * LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(STAFF_LEFT, y);
      ctx.lineTo(this.width - 20, y);
      ctx.stroke();
    }

    this.drawTrebleClef();
    this.drawBarLines();
  }

  drawTrebleClef() {
    const ctx = this.ctx;
    const x = STAFF_LEFT + 20;
    const y = STAFF_TOP;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.quadraticCurveTo(x + 15, y - 5, x + 12, y + 10);
    ctx.quadraticCurveTo(x + 8, y + 20, x + 5, y + 32);
    ctx.quadraticCurveTo(x + 2, y + 40, x + 10, y + 42);
    ctx.quadraticCurveTo(x + 18, y + 44, x + 15, y + 36);
    ctx.quadraticCurveTo(x + 10, y + 28, x + 8, y + 20);
    ctx.stroke();
  }

  drawBarLines() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    const totalBeats = Math.floor((this.width - STAFF_LEFT - 100) / BEAT_WIDTH);
    for (let i = 0; i <= totalBeats; i += 4) {
      const x = getBeatX(i) - NOTE_HEAD_WIDTH / 2;
      ctx.beginPath();
      ctx.moveTo(x, STAFF_TOP);
      ctx.lineTo(x, STAFF_TOP + 4 * LINE_SPACING);
      ctx.stroke();
    }
  }

  drawNote(
    note: Note,
    isSelected: boolean,
    isHighlighted: boolean,
    highlightProgress: number = 0
  ) {
    const ctx = this.ctx;
    const x = getBeatX(note.beatIndex);
    const y = getPitchY(note.pitch);

    const scale = isHighlighted ? 1 + 0.05 * Math.sin(highlightProgress * Math.PI) : 1;
    const noteColor = isHighlighted ? '#ff5252' : '#222';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (isSelected) {
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        -NOTE_HEAD_WIDTH / 2 - 6,
        -NOTE_HEAD_HEIGHT / 2 - 20,
        NOTE_HEAD_WIDTH + 12,
        NOTE_HEAD_HEIGHT + 25
      );
      ctx.setLineDash([]);
    }

    this.drawNoteHead(note.type, noteColor);
    this.drawNoteStem(note.type, noteColor);

    if (note.type === 'eighth') {
      this.drawEighthFlag(noteColor);
    }

    if (note.dotted) {
      this.drawDot(noteColor);
    }

    ctx.restore();

    this.drawLedgerLines(y, note.pitch);
  }

  drawNoteHead(type: NoteType, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = type === 'whole' ? '#fafafa' : color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, NOTE_HEAD_WIDTH / 2, NOTE_HEAD_HEIGHT / 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawNoteStem(type: NoteType, color: string) {
    if (type === 'whole') return;

    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const stemHeight = 28;
    const stemX = NOTE_HEAD_WIDTH / 2 - 1;

    ctx.beginPath();
    ctx.moveTo(stemX, -NOTE_HEAD_HEIGHT / 2 + 2);
    ctx.lineTo(stemX, -stemHeight);
    ctx.stroke();
  }

  drawEighthFlag(color: string) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    const flagX = NOTE_HEAD_WIDTH / 2 - 1;

    ctx.beginPath();
    ctx.moveTo(flagX, -28);
    ctx.quadraticCurveTo(flagX + 8, -24, flagX + 6, -18);
    ctx.quadraticCurveTo(flagX + 4, -22, flagX, -20);
    ctx.fill();
  }

  drawDot(color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(NOTE_HEAD_WIDTH / 2 + 4, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLedgerLines(y: number, pitch: string) {
    const ctx = this.ctx;
    const semitone = PITCH_SEMITONES[pitch];
    if (semitone === undefined) return;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    const topLineY = STAFF_TOP;
    const bottomLineY = STAFF_TOP + 4 * LINE_SPACING;
    const ledgerWidth = NOTE_HEAD_WIDTH + 8;

    if (y < topLineY - LINE_SPACING / 4) {
      const linesAbove = Math.ceil((topLineY - y) / LINE_SPACING - 0.5);
      for (let i = 1; i <= linesAbove; i++) {
        const lineY = topLineY - i * LINE_SPACING;
        if (y <= lineY + LINE_SPACING / 4) {
          ctx.beginPath();
          ctx.moveTo(-ledgerWidth / 2, lineY);
          ctx.lineTo(ledgerWidth / 2, lineY);
          ctx.stroke();
        }
      }
    }

    if (y > bottomLineY + LINE_SPACING / 4) {
      const linesBelow = Math.ceil((y - bottomLineY) / LINE_SPACING - 0.5);
      for (let i = 1; i <= linesBelow; i++) {
        const lineY = bottomLineY + i * LINE_SPACING;
        if (y >= lineY - LINE_SPACING / 4) {
          ctx.beginPath();
          ctx.moveTo(-ledgerWidth / 2, lineY);
          ctx.lineTo(ledgerWidth / 2, lineY);
          ctx.stroke();
        }
      }
    }
  }

  render(
    notes: Note[],
    selectedNoteId: string | null,
    currentPlayIndex: number,
    animationTime: number = 0
  ) {
    this.animationTime = animationTime;
    this.clear();
    this.drawStaff();

    const sortedNotes = [...notes].sort((a, b) => a.beatIndex - b.beatIndex);
    sortedNotes.forEach((note, index) => {
      const isSelected = note.id === selectedNoteId;
      const isHighlighted = index === currentPlayIndex;
      const highlightProgress = isHighlighted
        ? Math.min(1, (Date.now() % 100) / 100)
        : 0;
      this.drawNote(note, isSelected, isHighlighted, highlightProgress);
    });
  }

  getNoteAtPosition(x: number, y: number, notes: Note[]): Note | null {
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      const noteX = getBeatX(note.beatIndex);
      const noteY = getPitchY(note.pitch);

      const hitX = Math.abs(x - noteX) < NOTE_HEAD_WIDTH / 2 + 5;
      const hitY = Math.abs(y - noteY) < NOTE_HEAD_HEIGHT / 2 + 5;

      if (hitX && hitY) {
        return note;
      }
    }
    return null;
  }

  drawDragPreview(x: number, y: number, type: NoteType) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(x, y);

    ctx.fillStyle = type === 'whole' ? '#fafafa' : '#222';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, NOTE_HEAD_WIDTH / 2, NOTE_HEAD_HEIGHT / 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (type !== 'whole') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(NOTE_HEAD_WIDTH / 2 - 1, -NOTE_HEAD_HEIGHT / 2 + 2);
      ctx.lineTo(NOTE_HEAD_WIDTH / 2 - 1, -28);
      ctx.stroke();
    }

    ctx.restore();
  }
}
