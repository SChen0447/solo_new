import { v4 as uuidv4 } from 'uuid';
import type { Annotation, AudioFile } from '../shared/types.js';
import { readJsonFile, writeJsonFile, getAnnotationsPath, AUDIO_FILES_PATH } from './storage.js';

export async function createAnnotation(audioId: string, data: Omit<Annotation, 'id' | 'audioId' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
  const now = new Date().toISOString();
  const annotation: Annotation = {
    id: uuidv4(),
    audioId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const annotations = await getAnnotationsByAudioId(audioId);
  annotations.push(annotation);
  await writeJsonFile(getAnnotationsPath(audioId), annotations);

  return annotation;
}

export async function getAnnotationsByAudioId(audioId: string): Promise<Annotation[]> {
  return readJsonFile<Annotation[]>(getAnnotationsPath(audioId));
}

export async function getAnnotationById(id: string, audioId: string): Promise<Annotation | undefined> {
  const annotations = await getAnnotationsByAudioId(audioId);
  return annotations.find(a => a.id === id);
}

export async function updateAnnotation(id: string, audioId: string, data: Partial<Annotation>): Promise<Annotation | undefined> {
  const annotations = await getAnnotationsByAudioId(audioId);
  const index = annotations.findIndex(a => a.id === id);
  
  if (index === -1) return undefined;

  annotations[index] = {
    ...annotations[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getAnnotationsPath(audioId), annotations);
  return annotations[index];
}

export async function deleteAnnotation(id: string, audioId: string): Promise<boolean> {
  const annotations = await getAnnotationsByAudioId(audioId);
  const filtered = annotations.filter(a => a.id !== id);
  
  if (filtered.length === annotations.length) return false;
  
  await writeJsonFile(getAnnotationsPath(audioId), filtered);
  return true;
}

export async function saveAllAnnotations(audioId: string, annotations: Omit<Annotation, 'id' | 'audioId' | 'createdAt' | 'updatedAt'>[]): Promise<Annotation[]> {
  const now = new Date().toISOString();
  const newAnnotations: Annotation[] = annotations.map(a => ({
    id: uuidv4(),
    audioId,
    ...a,
    createdAt: now,
    updatedAt: now,
  }));
  
  await writeJsonFile(getAnnotationsPath(audioId), newAnnotations);
  return newAnnotations;
}

export async function getAudioFileById(audioId: string): Promise<AudioFile | undefined> {
  const audioFiles = await readJsonFile<AudioFile[]>(AUDIO_FILES_PATH);
  return audioFiles.find(a => a.id === audioId);
}

export async function saveAudioFile(audioFile: AudioFile): Promise<void> {
  const audioFiles = await readJsonFile<AudioFile[]>(AUDIO_FILES_PATH);
  audioFiles.push(audioFile);
  await writeJsonFile(AUDIO_FILES_PATH, audioFiles);
}
