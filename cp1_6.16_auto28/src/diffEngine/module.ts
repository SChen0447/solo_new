import { diffLines } from 'diff';
import type { ParagraphDiff, DiffType } from '../types';

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

function generateId(indexA: number, indexB: number): string {
  return `diff_${indexA}_${indexB}`;
}

export function computeDiff(textA: string, textB: string): ParagraphDiff[] {
  const paragraphsA = splitIntoParagraphs(textA);
  const paragraphsB = splitIntoParagraphs(textB);

  const result: ParagraphDiff[] = [];

  const lineDiff = diffLines(paragraphsA.join('\n'), paragraphsB.join('\n'));

  let idxA = 0;
  let idxB = 0;
  let pendingRemoved: string | null = null;
  let pendingIdxA = -1;

  for (const part of lineDiff) {
    const lines = part.value.split('\n').filter((l) => l.length > 0);

    if (part.added) {
      for (const line of lines) {
        if (pendingRemoved !== null) {
          result.push({
            id: generateId(pendingIdxA, idxB),
            type: 'modified',
            contentA: pendingRemoved,
            contentB: line,
            indexA: pendingIdxA,
            indexB: idxB,
          });
          pendingRemoved = null;
          pendingIdxA = -1;
        } else {
          result.push({
            id: generateId(-1, idxB),
            type: 'added',
            contentA: '',
            contentB: line,
            indexA: -1,
            indexB: idxB,
          });
        }
        idxB++;
      }
    } else if (part.removed) {
      for (const line of lines) {
        pendingRemoved = line;
        pendingIdxA = idxA;
        idxA++;
      }
    } else {
      if (pendingRemoved !== null) {
        result.push({
          id: generateId(pendingIdxA, -1),
          type: 'removed',
          contentA: pendingRemoved,
          contentB: '',
          indexA: pendingIdxA,
          indexB: -1,
        });
        pendingRemoved = null;
        pendingIdxA = -1;
      }
      for (const line of lines) {
        result.push({
          id: generateId(idxA, idxB),
          type: 'equal',
          contentA: line,
          contentB: line,
          indexA: idxA,
          indexB: idxB,
        });
        idxA++;
        idxB++;
      }
    }
  }

  if (pendingRemoved !== null) {
    result.push({
      id: generateId(pendingIdxA, -1),
      type: 'removed',
      contentA: pendingRemoved,
      contentB: '',
      indexA: pendingIdxA,
      indexB: -1,
    });
  }

  return result;
}

export function getConflictCount(diffs: ParagraphDiff[]): number {
  return diffs.filter((d) => d.type !== 'equal').length;
}
