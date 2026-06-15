import express from 'express';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8080;

app.use(express.json());

const notes = new Map();
const votes = new Map();
const clients = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', notesCount: notes.size, clientsCount: clients.size });
});

app.get('/api/notes', (req, res) => {
  const notesList = Array.from(notes.entries()).map(([id, note]) => ({
    id,
    ...note,
    upvotes: votes.get(id)?.up?.size || 0,
    downvotes: votes.get(id)?.down?.size || 0,
  }));
  res.json(notesList);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, id: clientId });

  console.log(`Client connected: ${clientId}`);

  const notesList = Array.from(notes.entries()).map(([id, note]) => ({
    id,
    ...note,
    upvotes: votes.get(id)?.up?.size || 0,
    downvotes: votes.get(id)?.down?.size || 0,
    userVote: null,
  }));

  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      clientId,
      notes: notesList,
    },
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(clientId, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
});

function handleMessage(clientId, data) {
  const { type, payload } = data;

  switch (type) {
    case 'add-note':
      handleAddNote(clientId, payload);
      break;
    case 'move-note':
      handleMoveNote(clientId, payload);
      break;
    case 'update-note':
      handleUpdateNote(clientId, payload);
      break;
    case 'delete-note':
      handleDeleteNote(clientId, payload);
      break;
    case 'vote':
      handleVote(clientId, payload);
      break;
    case 'merge-notes':
      handleMergeNotes(clientId, payload);
      break;
    case 'clear-all':
      handleClearAll(clientId);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

function handleAddNote(clientId, payload) {
  const { id, x, y, text, color } = payload;
  const noteId = id || uuidv4();

  notes.set(noteId, {
    x,
    y,
    text: text || '',
    color: color || '#ffffff',
    createdAt: Date.now(),
    createdBy: clientId,
  });

  votes.set(noteId, { up: new Set(), down: new Set() });

  broadcast({
    type: 'note-added',
    payload: {
      id: noteId,
      ...notes.get(noteId),
      upvotes: 0,
      downvotes: 0,
    },
  }, clientId);
}

function handleMoveNote(clientId, payload) {
  const { id, x, y } = payload;
  const note = notes.get(id);

  if (note) {
    note.x = x;
    note.y = y;

    broadcast({
      type: 'note-moved',
      payload: { id, x, y },
    }, clientId);
  }
}

function handleUpdateNote(clientId, payload) {
  const { id, text, color } = payload;
  const note = notes.get(id);

  if (note) {
    if (text !== undefined) note.text = text;
    if (color !== undefined) note.color = color;

    broadcast({
      type: 'note-updated',
      payload: { id, text, color },
    }, clientId);
  }
}

function handleDeleteNote(clientId, payload) {
  const { id } = payload;

  if (notes.has(id)) {
    notes.delete(id);
    votes.delete(id);

    broadcast({
      type: 'note-deleted',
      payload: { id },
    }, clientId);
  }
}

function handleVote(clientId, payload) {
  const { noteId, voteType } = payload;
  const noteVotes = votes.get(noteId);

  if (!noteVotes) return;

  noteVotes.up.delete(clientId);
  noteVotes.down.delete(clientId);

  if (voteType === 'up') {
    noteVotes.up.add(clientId);
  } else if (voteType === 'down') {
    noteVotes.down.add(clientId);
  }

  broadcast({
    type: 'vote-updated',
    payload: {
      noteId,
      upvotes: noteVotes.up.size,
      downvotes: noteVotes.down.size,
      voterId: clientId,
      voteType,
    },
  });
}

function handleMergeNotes(clientId, payload) {
  const { sourceId, targetId, mergedText } = payload;
  const targetNote = notes.get(targetId);
  const sourceNote = notes.get(sourceId);

  if (targetNote && sourceNote) {
    targetNote.text = mergedText;

    const sourceVotes = votes.get(sourceId);
    const targetVotes = votes.get(targetId);
    if (sourceVotes && targetVotes) {
      sourceVotes.up.forEach(voter => targetVotes.up.add(voter));
      sourceVotes.down.forEach(voter => targetVotes.down.add(voter));
    }

    notes.delete(sourceId);
    votes.delete(sourceId);

    broadcast({
      type: 'notes-merged',
      payload: {
        sourceId,
        targetId,
        mergedText,
        upvotes: targetVotes?.up.size || 0,
        downvotes: targetVotes?.down.size || 0,
      },
    }, clientId);
  }
}

function handleClearAll(clientId) {
  notes.clear();
  votes.clear();

  broadcast({
    type: 'all-cleared',
    payload: {},
  }, clientId);
}

function broadcast(data, excludeId = null) {
  const message = JSON.stringify(data);
  clients.forEach((client, id) => {
    if (id !== excludeId && client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

console.log('BrainStorm Board Server starting...');
