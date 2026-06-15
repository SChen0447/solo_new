import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import { encodeMIDI } from './midiEncoder.js';
// @ts-ignore - midi-writer-js esm compat hack
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
app.use(express.json());
const rooms = new Map();
const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];
function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            id: roomId,
            users: new Map(),
            tracks: [
                { id: uuidv4(), name: '旋律 1', type: 'melody', volume: 80, muted: false, solo: false },
                { id: uuidv4(), name: '和弦 1', type: 'chord', volume: 70, muted: false, solo: false },
                { id: uuidv4(), name: '打击乐 1', type: 'percussion', volume: 75, muted: false, solo: false },
            ],
            notes: new Map(),
        });
    }
    return rooms.get(roomId);
}
function broadcastRoom(room, senderWs) {
    const userList = Array.from(room.users.values());
    const notesList = Array.from(room.notes.values());
    const payload = JSON.stringify({
        type: 'state',
        data: {
            tracks: room.tracks,
            notes: notesList,
            users: userList,
        },
    });
    room.users.forEach((_, ws) => {
        if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    });
}
function sendUserState(ws, room) {
    const userList = Array.from(room.users.values());
    const notesList = Array.from(room.notes.values());
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            roomId: room.id,
            tracks: room.tracks,
            notes: notesList,
            users: userList,
            selfUserId: room.users.get(ws)?.id,
        },
    }));
}
wss.on('connection', (ws) => {
    let currentRoom = null;
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'join': {
                    const { roomId, userName } = message.data;
                    const room = getRoom(roomId || uuidv4().slice(0, 6).toUpperCase());
                    const color = USER_COLORS[room.users.size % USER_COLORS.length];
                    const user = {
                        id: uuidv4(),
                        name: userName || `用户${room.users.size + 1}`,
                        color,
                        cursor: 0,
                    };
                    room.users.set(ws, user);
                    currentRoom = room;
                    sendUserState(ws, room);
                    broadcastRoom(room, ws);
                    break;
                }
                case 'cursor': {
                    if (!currentRoom)
                        break;
                    const user = currentRoom.users.get(ws);
                    if (user) {
                        user.cursor = message.data.cursor;
                        broadcastRoom(currentRoom, ws);
                    }
                    break;
                }
                case 'addTrack': {
                    if (!currentRoom)
                        break;
                    const track = message.data.track;
                    if (currentRoom.tracks.length < 8) {
                        currentRoom.tracks.push(track);
                        broadcastRoom(currentRoom);
                    }
                    break;
                }
                case 'removeTrack': {
                    if (!currentRoom)
                        break;
                    const trackId = message.data.trackId;
                    currentRoom.tracks = currentRoom.tracks.filter((t) => t.id !== trackId);
                    for (const [noteId, note] of currentRoom.notes) {
                        if (note.trackId === trackId) {
                            currentRoom.notes.delete(noteId);
                        }
                    }
                    broadcastRoom(currentRoom);
                    break;
                }
                case 'updateTrack': {
                    if (!currentRoom)
                        break;
                    const track = message.data.track;
                    const idx = currentRoom.tracks.findIndex((t) => t.id === track.id);
                    if (idx !== -1) {
                        currentRoom.tracks[idx] = track;
                        broadcastRoom(currentRoom);
                    }
                    break;
                }
                case 'addNote': {
                    if (!currentRoom)
                        break;
                    const note = message.data.note;
                    currentRoom.notes.set(note.id, note);
                    broadcastRoom(currentRoom, ws);
                    break;
                }
                case 'moveNote': {
                    if (!currentRoom)
                        break;
                    const note = message.data.note;
                    if (currentRoom.notes.has(note.id)) {
                        currentRoom.notes.set(note.id, note);
                        broadcastRoom(currentRoom, ws);
                    }
                    break;
                }
                case 'removeNote': {
                    if (!currentRoom)
                        break;
                    const noteId = message.data.noteId;
                    currentRoom.notes.delete(noteId);
                    broadcastRoom(currentRoom, ws);
                    break;
                }
                case 'exportMIDI': {
                    if (!currentRoom)
                        break;
                    const midiBuffer = encodeMIDI(currentRoom.tracks, Array.from(currentRoom.notes.values()));
                    ws.send(JSON.stringify({
                        type: 'midiData',
                        data: {
                            buffer: Array.from(midiBuffer),
                        },
                    }));
                    break;
                }
            }
        }
        catch (err) {
            console.error('Error processing message:', err);
        }
    });
    ws.on('close', () => {
        if (currentRoom) {
            currentRoom.users.delete(ws);
            if (currentRoom.users.size === 0) {
                rooms.delete(currentRoom.id);
            }
            else {
                broadcastRoom(currentRoom);
            }
        }
    });
});
app.get('/api/room/new', (req, res) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    res.json({ roomId });
});
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Music Collab Server running on port ${PORT}`);
});
