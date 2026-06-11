import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { roomManager } from './roomManager.js'
import { diffWords } from 'diff'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const DEFAULT_ROOM_ID = 'default-doc'
const SAVE_INTERVAL_MS = 30000

if (!roomManager.hasRoom(DEFAULT_ROOM_ID)) {
  roomManager.createRoom(DEFAULT_ROOM_ID, 'system', '公开协作文档', 'public')
}

io.on('connection', (socket) => {
  let currentRoomId: string | null = null
  let currentUserId: string | null = null

  socket.on('join-room', ({ roomId, userId, userName, invitationId }) => {
    const room = roomManager.getRoom(roomId || DEFAULT_ROOM_ID)
    if (!room) {
      socket.emit('error', { message: '房间不存在' })
      return
    }

    const finalRoomId = roomId || DEFAULT_ROOM_ID

    if (!roomManager.canJoin(finalRoomId, userId, invitationId)) {
      socket.emit('error', { message: '无权限访问此文档' })
      return
    }

    currentRoomId = finalRoomId
    currentUserId = userId

    const user = {
      id: userId,
      name: userName || '匿名用户',
      color: '',
      socketId: socket.id,
    }

    roomManager.addUser(finalRoomId, user)
    socket.join(finalRoomId)

    socket.emit('room-joined', {
      roomId: finalRoomId,
      roomName: room.name,
      permissionMode: room.permissionMode,
      users: roomManager.getUsers(finalRoomId),
      userId,
    })

    socket.to(finalRoomId).emit('user-joined', user)

    const versions = roomManager.getVersions(finalRoomId)
    socket.emit('versions-updated', versions)
  })

  socket.on('yjs-update', (update: Uint8Array) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('yjs-update', update)
  })

  socket.on('cursor-update', (data) => {
    if (!currentRoomId || !currentUserId) return
    socket.to(currentRoomId).emit('cursor-update', {
      userId: currentUserId,
      ...data,
    })
  })

  socket.on('save-version', ({ content, label }) => {
    if (!currentRoomId) return
    const snapshot = roomManager.saveVersion(currentRoomId, content, label)
    if (snapshot) {
      const versions = roomManager.getVersions(currentRoomId)
      io.to(currentRoomId).emit('versions-updated', versions)
      socket.emit('version-saved', snapshot)
    }
  })

  socket.on('get-versions', () => {
    if (!currentRoomId) return
    const versions = roomManager.getVersions(currentRoomId)
    socket.emit('versions-updated', versions)
  })

  socket.on('compare-versions', ({ versionId1, versionId2 }) => {
    if (!currentRoomId) return
    const room = roomManager.getRoom(currentRoomId)
    if (!room) return

    const v1 = room.versions.find(v => v.id === versionId1)
    const v2 = room.versions.find(v => v.id === versionId2)

    if (!v1 || !v2) {
      socket.emit('error', { message: '版本不存在' })
      return
    }

    const differences = diffWords(v1.content, v2.content)
    socket.emit('diff-result', {
      version1: v1,
      version2: v2,
      diff: differences,
    })
  })

  socket.on('set-permission', ({ mode }) => {
    if (!currentRoomId) return
    roomManager.setPermissionMode(currentRoomId, mode)
    io.to(currentRoomId).emit('permission-updated', { mode })
  })

  socket.on('create-invitation', ({ email, expiresInMs, canEdit }) => {
    if (!currentRoomId) return
    const invitation = roomManager.createInvitation(currentRoomId, email, expiresInMs, canEdit)
    if (invitation) {
      socket.emit('invitation-created', invitation)
    }
  })

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      roomManager.removeUser(currentRoomId, currentUserId)
      socket.to(currentRoomId).emit('user-left', { userId: currentUserId })
    }
  })
})

setInterval(() => {
  // Heartbeat or cleanup logic can go here
}, SAVE_INTERVAL_MS)

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Default room: ${DEFAULT_ROOM_ID}`)
})
