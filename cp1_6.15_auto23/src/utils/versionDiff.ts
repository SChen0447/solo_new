import type { AnnotationVersion, VersionDiff } from '../../../shared/types';

export function calculateVersionDiff(
  baseVersion: AnnotationVersion,
  compareVersion: AnnotationVersion
): VersionDiff {
  const baseAnnotations = new Map(baseVersion.annotations.map(a => [a.id, a]));
  const compareAnnotations = new Map(compareVersion.annotations.map(a => [a.id, a]));

  const added = [];
  const removed = [];
  const modified = [];

  for (const annotation of compareVersion.annotations) {
    if (!baseAnnotations.has(annotation.id)) {
      added.push(annotation);
    } else {
      const baseAnnotation = baseAnnotations.get(annotation.id)!;
      if (
        baseAnnotation.startTime !== annotation.startTime ||
        baseAnnotation.endTime !== annotation.endTime ||
        baseAnnotation.content !== annotation.content ||
        baseAnnotation.color !== annotation.color ||
        baseAnnotation.labelType !== annotation.labelType
      ) {
        modified.push(annotation);
      }
    }
  }

  for (const annotation of baseVersion.annotations) {
    if (!compareAnnotations.has(annotation.id)) {
      removed.push(annotation);
    }
  }

  return { added, removed, modified };
}

export function isAnnotationAdded(annotationId: string, diff: VersionDiff | null): boolean {
  if (!diff) return false;
  return diff.added.some(a => a.id === annotationId);
}

export function isAnnotationRemoved(annotationId: string, diff: VersionDiff | null): boolean {
  if (!diff) return false;
  return diff.removed.some(a => a.id === annotationId);
}

export function isAnnotationModified(annotationId: string, diff: VersionDiff | null): boolean {
  if (!diff) return false;
  return diff.modified.some(a => a.id === annotationId);
}
