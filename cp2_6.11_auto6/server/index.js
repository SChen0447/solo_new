const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("./src/dataStore");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

const userColors = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
];

function getRandomColor() {
  return userColors[Math.floor(Math.random() * userColors.length)];
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on("create-room", () => {
    const roomId = uuidv4().slice(0, 8);
    dataStore.ensureRoom(roomId);
    socket.emit("room-created", { roomId });
  });

  socket.on("join-room", ({ roomId, userName }) => {
    const room = dataStore.getRoom(roomId);
    if (!room) {
      socket.emit("room-joined", {
        roomId,
        users: [],
        history: [],
        stickyNotes: [],
        error: "Room not found",
      });
      return;
    }

    currentRoom = roomId;
    const userId = socket.id;
    const color = getRandomColor();
    const user = { id: userId, name: userName, color, cursorX: 0, cursorY: 0 };
    currentUser = user;

    dataStore.addUser(roomId, user);
    socket.join(roomId);

    const users = dataStore.getUsers(roomId);
    const history = dataStore.getSnapshot(roomId);
    socket.emit("room-joined", {
      roomId,
      users,
      history: history.drawActions,
      stickyNotes: history.stickyNotes,
    });

    socket.to(roomId).emit("user-joined", user);
  });

  socket.on("draw-action", (action) => {
    if (!currentRoom) return;
    dataStore.addDrawAction(currentRoom, action);
    socket.to(currentRoom).emit("draw-action", action);
  });

  socket.on("sticky-note-add", (note) => {
    if (!currentRoom) return;
    dataStore.addStickyNote(currentRoom, note);
    socket.to(currentRoom).emit("sticky-note-add", note);
  });

  socket.on("sticky-note-update", (note) => {
    if (!currentRoom) return;
    dataStore.updateStickyNote(currentRoom, note);
    socket.to(currentRoom).emit("sticky-note-update", note);
  });

  socket.on("sticky-note-delete", ({ noteId }) => {
    if (!currentRoom) return;
    dataStore.deleteStickyNote(currentRoom, noteId);
    socket.to(currentRoom).emit("sticky-note-delete", { noteId });
  });

  socket.on("cursor-move", ({ x, y }) => {
    if (!currentRoom || !currentUser) return;
    dataStore.updateUserCursor(currentRoom, currentUser.id, x, y);
    socket.to(currentRoom).emit("cursor-move", {
      userId: currentUser.id,
      x,
      y,
      color: currentUser.color,
      name: currentUser.name,
    });
  });

  socket.on("request-snapshot", ({ timestamp }) => {
    if (!currentRoom) return;
    const snapshot = dataStore.getSnapshot(currentRoom, timestamp);
    socket.emit("snapshot-data", snapshot);
  });

  socket.on("request-timeline", () => {
    if (!currentRoom) return;
    const timeline = dataStore.getTimeline(currentRoom);
    socket.emit("timeline-data", { timeline });
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      dataStore.removeUser(currentRoom, currentUser.id);
      socket.to(currentRoom).emit("user-left", { userId: currentUser.id });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
