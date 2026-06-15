import type { ParagraphDiff, ConflictResolution } from '../types';

export function autoMerge(diffs: ParagraphDiff[]): Record<string, ConflictResolution> {
  const resolutions: Record<string, ConflictResolution> = {};

  for (const diff of diffs) {
    if (diff.type === 'equal') {
      resolutions[diff.id] = {
        conflictId: diff.id,
        resolvedContent: diff.contentA,
        source: 'A',
      };
    } else if (diff.type === 'added') {
      resolutions[diff.id] = {
        conflictId: diff.id,
        resolvedContent: diff.contentB,
        source: 'B',
      };
    } else if (diff.type === 'removed') {
      resolutions[diff.id] = {
        conflictId: diff.id,
        resolvedContent: '',
        source: 'A',
      };
    } else if (diff.type === 'modified') {
      resolutions[diff.id] = {
        conflictId: diff.id,
        resolvedContent: '',
        source: 'manual',
      };
    }
  }

  return resolutions;
}

export function resolveConflict(
  diff: ParagraphDiff,
  choice: 'A' | 'B' | 'manual',
  manualContent?: string
): ConflictResolution {
  let resolvedContent = '';

  switch (choice) {
    case 'A':
      resolvedContent = diff.contentA;
      break;
    case 'B':
      resolvedContent = diff.contentB;
      break;
    case 'manual':
      resolvedContent = manualContent ?? '';
      break;
  }

  return {
    conflictId: diff.id,
    resolvedContent,
    source: choice,
  };
}

export function buildMergedDocument(
  diffs: ParagraphDiff[],
  resolutions: Record<string, ConflictResolution>
): string {
  const paragraphs: string[] = [];

  for (const diff of diffs) {
    const resolution = resolutions[diff.id];
    if (resolution && resolution.resolvedContent) {
      paragraphs.push(resolution.resolvedContent);
    }
  }

  return paragraphs.join('\n\n');
}

export function isResolved(diff: ParagraphDiff, resolution?: ConflictResolution): boolean {
  if (diff.type === 'equal') return true;
  if (!resolution) return false;
  return resolution.resolvedContent.length > 0;
}

export function getUnresolvedConflicts(
  diffs: ParagraphDiff[],
  resolutions: Record<string, ConflictResolution>
): ParagraphDiff[] {
  return diffs.filter((diff) => {
    if (diff.type === 'equal') return false;
    const resolution = resolutions[diff.id];
    return !resolution || !resolution.resolvedContent;
  });
}
