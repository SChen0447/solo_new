import type { PetState, WSMessage } from '../../../shared/types.js';

export function createWSConnection(
  petId: string,
  onMessage: (msg: WSMessage) => void
): WebSocket {
  const ws = new WebSocket(`ws://localhost:4000/ws?petId=${petId}`);

  ws.addEventListener('open', () => {
    console.log('WS connected for pet:', petId);
  });

  ws.addEventListener('message', (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      console.error('Failed to parse WS message');
    }
  });

  ws.addEventListener('close', () => {
    console.log('WS disconnected for pet:', petId);
  });

  return ws;
}

export function startSimulation(petId: string, store: any): () => void {
  const ws = createWSConnection(petId, (msg) => {
    switch (msg.type) {
      case 'state_update':
        store.setPetState(msg.payload);
        break;
      case 'task_new':
        store.addTask(msg.payload);
        break;
      case 'task_complete':
        store.completeTask(msg.payload.id);
        break;
    }
  });

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}

export function getAnimationClass(petState: PetState, prevState: PetState | null): string {
  if (!prevState) return '';

  const classes: string[] = [];
  const delta = 10;

  if (Math.abs(petState.hunger - prevState.hunger) >= delta) {
    classes.push('pulse-hunger');
  }
  if (Math.abs(petState.energy - prevState.energy) >= delta) {
    classes.push('pulse-energy');
  }
  if (Math.abs(petState.social - prevState.social) >= delta) {
    classes.push('pulse-social');
  }
  if (Math.abs(petState.hygiene - prevState.hygiene) >= delta) {
    classes.push('pulse-hygiene');
  }

  return classes.join(' ');
}
