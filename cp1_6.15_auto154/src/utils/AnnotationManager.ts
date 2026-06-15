import { v4 as uuidv4 } from 'uuid';
import type { Annotation, AnnotationType } from '../../../shared/types';

type RedrawCallback = () => void;
type AnnotationAddedCallback = (annotation: Annotation) => void;

export class AnnotationManager {
  private annotations: Map<string, Annotation> = new Map();
  private redrawCallbacks: Set<RedrawCallback> = new Set();
  private annotationAddedCallbacks: Set<AnnotationAddedCallback> = new Set();

  public addAnnotation(
    trackId: string,
    memberName: string,
    coordinateIndex: number,
    type: AnnotationType,
    content: string,
    voiceData?: string
  ): Annotation {
    const annotation: Annotation = {
      id: uuidv4(),
      trackId,
      memberName,
      coordinateIndex,
      type,
      content,
      voiceData,
      createdAt: new Date().toISOString(),
    };

    this.annotations.set(annotation.id, annotation);
    this.notifyRedraw();
    this.notifyAnnotationAdded(annotation);

    return annotation;
  }

  public addAnnotationFromBroadcast(annotation: Annotation): void {
    if (!this.annotations.has(annotation.id)) {
      this.annotations.set(annotation.id, annotation);
      this.notifyRedraw();
    }
  }

  public removeAnnotation(annotationId: string): boolean {
    const deleted = this.annotations.delete(annotationId);
    if (deleted) {
      this.notifyRedraw();
    }
    return deleted;
  }

  public updateAnnotationContent(
    annotationId: string,
    content: string
  ): Annotation | null {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      return null;
    }

    annotation.content = content;
    this.notifyRedraw();
    return annotation;
  }

  public getAnnotation(annotationId: string): Annotation | undefined {
    return this.annotations.get(annotationId);
  }

  public getAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  public getAnnotationsByTrackId(trackId: string): Annotation[] {
    return Array.from(this.annotations.values()).filter(
      (a) => a.trackId === trackId
    );
  }

  public getAnnotationsByMember(memberName: string): Annotation[] {
    return Array.from(this.annotations.values()).filter(
      (a) => a.memberName === memberName
    );
  }

  public clearAnnotations(): void {
    this.annotations.clear();
    this.notifyRedraw();
  }

  public setAnnotations(annotations: Annotation[]): void {
    this.annotations.clear();
    annotations.forEach((a) => this.annotations.set(a.id, a));
    this.notifyRedraw();
  }

  public onRedraw(callback: RedrawCallback): () => void {
    this.redrawCallbacks.add(callback);
    return () => {
      this.redrawCallbacks.delete(callback);
    };
  }

  public onAnnotationAdded(callback: AnnotationAddedCallback): () => void {
    this.annotationAddedCallbacks.add(callback);
    return () => {
      this.annotationAddedCallbacks.delete(callback);
    };
  }

  private notifyRedraw(): void {
    this.redrawCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (e) {
        console.error('Error in redraw callback:', e);
      }
    });
  }

  private notifyAnnotationAdded(annotation: Annotation): void {
    this.annotationAddedCallbacks.forEach((callback) => {
      try {
        callback(annotation);
      } catch (e) {
        console.error('Error in annotation added callback:', e);
      }
    });
  }

  public findAnnotationNearPoint(
    x: number,
    y: number,
    threshold: number,
    getAnnotationScreenPos: (annotation: Annotation) => { x: number; y: number } | null
  ): Annotation | null {
    let closestAnnotation: Annotation | null = null;
    let closestDistance = Infinity;

    for (const annotation of this.annotations.values()) {
      const pos = getAnnotationScreenPos(annotation);
      if (!pos) continue;

      const distance = Math.sqrt(
        Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
      );

      if (distance <= threshold && distance < closestDistance) {
        closestDistance = distance;
        closestAnnotation = annotation;
      }
    }

    return closestAnnotation;
  }

  public getCount(): number {
    return this.annotations.size;
  }
}

export default AnnotationManager;
