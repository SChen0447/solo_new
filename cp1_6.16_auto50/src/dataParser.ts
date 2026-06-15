import { eventBus } from './eventBus';
import type { Atom, Bond, MoleculeData } from './sdfWorker';

export type { Atom, Bond, MoleculeData };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
let currentJobId = 0;

export function initFileUpload(): void {
  const dropZone = document.getElementById('drop-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const uploadBtn = document.getElementById('upload-btn')!;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    fileInput.value = '';
  });
}

function handleFile(file: File): void {
  if (!file.name.toLowerCase().endsWith('.sdf')) {
    eventBus.emit('parse-error', { message: 'Please upload an SDF format file' });
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    eventBus.emit('parse-error', { message: 'File size exceeds 5MB limit' });
    return;
  }

  eventBus.emit('parse-progress', { percent: 0 });

  const reader = new FileReader();
  reader.onload = () => {
    const content = reader.result as string;
    parseWithWorker(content);
  };
  reader.onerror = () => {
    eventBus.emit('parse-error', { message: 'Failed to read file' });
  };
  reader.readAsText(file);
}

function parseWithWorker(content: string): void {
  const jobId = ++currentJobId;

  const worker = new Worker(new URL('./sdfWorker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e: MessageEvent) => {
    const { type, percent, data, message, jobId: msgJobId } = e.data;
    if (msgJobId !== undefined && msgJobId !== jobId) return;

    switch (type) {
      case 'progress':
        eventBus.emit('parse-progress', { percent });
        break;
      case 'done':
        worker.terminate();
        eventBus.emit('parse-progress', { percent: 100 });
        eventBus.emit('molecule-parsed', data as MoleculeData);
        break;
      case 'error':
        worker.terminate();
        eventBus.emit('parse-error', { message });
        break;
    }
  };

  worker.onerror = () => {
    worker.terminate();
    eventBus.emit('parse-error', { message: 'Worker parsing failed' });
  };

  worker.postMessage({ content, jobId });
}
