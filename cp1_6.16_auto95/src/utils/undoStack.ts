import { eventBus } from './eventBus';

export interface UndoRecord {
  type: 'slice' | 'isosurface' | 'fieldline';
  timestamp: number;
  previousState: any;
  currentState: any;
  description: string;
}

export class UndoStack {
  private stack: UndoRecord[] = [];
  private maxSize: number = 5;
  private undoInProgress: boolean = false;

  constructor() {
    eventBus.on('UndoRequest', () => this.undo());
  }

  push(record: Omit<UndoRecord, 'timestamp'>): void {
    if (this.undoInProgress) return;
    
    const fullRecord: UndoRecord = {
      ...record,
      timestamp: Date.now()
    };
    
    this.stack.push(fullRecord);
    
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    
    console.debug('[UndoStack] Pushed record:', fullRecord.type, fullRecord.description);
  }

  undo(): void {
    if (this.stack.length === 0) {
      console.debug('[UndoStack] No records to undo');
      return;
    }

    this.undoInProgress = true;
    const record = this.stack.pop()!;
    
    console.debug('[UndoStack] Undoing:', record.type, record.description);
    
    try {
      this.restoreState(record);
      eventBus.emit('UndoPerformed', { record });
    } catch (error) {
      console.error('[UndoStack] Error during undo:', error);
    } finally {
      setTimeout(() => {
        this.undoInProgress = false;
      }, 200);
    }
  }

  private restoreState(record: UndoRecord): void {
    switch (record.type) {
      case 'slice':
        eventBus.emit('SliceChanged', {
          axis: record.previousState.axis,
          position: record.previousState.position
        });
        break;
      case 'isosurface':
        if (record.previousState.existed) {
          eventBus.emit('IsosurfaceRequest', {
            threshold: record.previousState.threshold
          });
        }
        break;
      case 'fieldline':
        if (record.previousState.existed) {
          eventBus.emit('FieldLineRequest', {
            startPoint: record.previousState.startPoint
          });
        } else if (record.currentState.existed) {
          eventBus.emit('FieldLineRemoved', {
            id: record.currentState.id
          });
        }
        break;
    }
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  size(): number {
    return this.stack.length;
  }

  clear(): void {
    this.stack = [];
    this.undoInProgress = false;
  }

  getStack(): UndoRecord[] {
    return [...this.stack];
  }
}

export const undoStack = new UndoStack();
export default undoStack;
