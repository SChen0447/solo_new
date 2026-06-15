import { v4 as uuidv4 } from 'uuid';
import type { AnnotationVersion, VersionDiff, Annotation } from '../shared/types.js';
import { readJsonFile, writeJsonFile, getVersionsPath } from './storage.js';

export async function createVersion(audioId: string, annotations: Annotation[], description?: string): Promise<AnnotationVersion> {
  const versions = await getVersionsByAudioId(audioId);
  const versionNumber = versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1;

  const version: AnnotationVersion = {
    id: uuidv4(),
    audioId,
    versionNumber,
    annotations: JSON.parse(JSON.stringify(annotations)),
    createdAt: new Date().toISOString(),
    description,
  };

  versions.push(version);
  await writeJsonFile(getVersionsPath(audioId), versions);

  return version;
}

export async function getVersionsByAudioId(audioId: string): Promise<AnnotationVersion[]> {
  const versions = await readJsonFile<AnnotationVersion[]>(getVersionsPath(audioId));
  return versions.sort((a, b) => b.versionNumber - a.versionNumber);
}

export async function getVersionById(versionId: string, audioId: string): Promise<AnnotationVersion | undefined> {
  const versions = await getVersionsByAudioId(audioId);
  return versions.find(v => v.id === versionId);
}

export function compareVersions(baseVersion: AnnotationVersion, compareVersion: AnnotationVersion): VersionDiff {
  const baseAnnotations = new Map(baseVersion.annotations.map(a => [a.id, a]));
  const compareAnnotations = new Map(compareVersion.annotations.map(a => [a.id, a]));

  const added: Annotation[] = [];
  const removed: Annotation[] = [];
  const modified: Annotation[] = [];

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

export async function deleteVersion(versionId: string, audioId: string): Promise<boolean> {
  const versions = await getVersionsByAudioId(audioId);
  const filtered = versions.filter(v => v.id !== versionId);
  
  if (filtered.length === versions.length) return false;
  
  await writeJsonFile(getVersionsPath(audioId), filtered);
  return true;
}
