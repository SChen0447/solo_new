import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { roomManager, Comment, Reply } from './roomManager.js'
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
  maxHttpBufferSize: 1e8,
})

const DEFAULT_ROOM_ID = 'default-doc'
const SAVE_INTERVAL_MS = 30000

if (!roomManager.hasRoom(DEFAULT_ROOM_ID)) {
  roomManager.createRoom(DEFAULT_ROOM_ID, 'system', '公开协作文档', 'public')
}

app.get('/api/invite/:invitationId', (req, res) => {
  const { invitationId } = req.params
  res.json({ invitationId, message: '请在客户端使用此邀请ID加入文档' })
})

io.on('connection', (socket) => {
  let currentRoomId: string | null = null
  let currentUserId: string | null = null
  let currentUserName: string = ''

  socket.on('join-room', ({ roomId, userId, userName, invitationId }) => {
    const targetRoomId = roomId || DEFAULT_ROOM_ID
    const room = roomManager.getRoom(targetRoomId)

    if (!room) {
      socket.emit('error', { message: '房间不存在' })
      return
    }

    const { canJoin, canEdit } = roomManager.canJoin(targetRoomId, userId, invitationId)

    if (!canJoin) {
      socket.emit('error', { message: '无权限访问此文档，请联系所有者获取邀请链接' })
      return
    }

    currentRoomId = targetRoomId
    currentUserId = userId
    currentUserName = userName || '匿名用户'

    const user = {
      id: userId,
      name: userName || '匿名用户',
      socketId: socket.id,
    }

    roomManager.addUser(targetRoomId, user, canEdit)
    socket.join(targetRoomId)

    const roomUser = roomManager.getUser(targetRoomId, userId)

    socket.emit('room-joined', {
      roomId: targetRoomId,
      roomName: room.name,
      permissionMode: room.permissionMode,
      isOwner: room.ownerId === userId,
      canEdit: roomUser?.canEdit ?? canEdit,
      users: roomManager.getUsers(targetRoomId),
      comments: roomManager.getComments(targetRoomId),
      userId,
    })

    socket.to(targetRoomId).emit('user-joined', roomManager.getUser(targetRoomId, userId))

    const versions = roomManager.getVersions(targetRoomId)
    socket.emit('versions-updated', versions)
  })

  socket.on('yjs-update', (update: Uint8Array) => {
    if (!currentRoomId || !currentUserId) return

    if (!roomManager.canEdit(currentRoomId, currentUserId)) {
      socket.emit('error', { message: '您没有编辑权限' })
      return
    }

    socket.to(currentRoomId).emit('yjs-update', update)
  })

  socket.on('cursor-update', (data) => {
    if (!currentRoomId || !currentUserId) return
    socket.to(currentRoomId).emit('cursor-update', {
      userId: currentUserId,
      ...data,
    })
  })

  socket.on('save-version', ({ content, delta, label }) => {
    if (!currentRoomId || !currentUserId) return
    if (!roomManager.canEdit(currentRoomId, currentUserId)) {
      socket.emit('error', { message: '您没有编辑权限' })
      return
    }

    const snapshot = roomManager.saveVersion(currentRoomId, content, delta, label)
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

  socket.on('rollback-version', ({ versionId }) => {
    if (!currentRoomId || !currentUserId) return
    if (!roomManager.canEdit(currentRoomId, currentUserId)) {
      socket.emit('error', { message: '您没有编辑权限' })
      return
    }

    const version = roomManager.getVersion(currentRoomId, versionId)
    if (!version) {
      socket.emit('error', { message: '版本不存在' })
      return
    }

    io.to(currentRoomId).emit('rollback-content', {
      versionId,
      content: version.content,
      delta: version.delta,
    })

    socket.emit('version-saved', {
      id: versionId,
      message: '文档已回滚',
    })

    showToastRoom(currentRoomId, `文档已回滚到 ${version.label || new Date(version.timestamp).toLocaleString()}`, 'success')
  })

  socket.on('add-comment', (comment: Comment) => {
    if (!currentRoomId || !currentUserId) return

    const enrichedComment: Comment = {
      ...comment,
      authorId: currentUserId,
    }

    const savedComment = roomManager.addComment(currentRoomId, enrichedComment)
    if (savedComment) {
      io.to(currentRoomId).emit('new-comment', savedComment)
    }
  })

  socket.on('resolve-comment', ({ commentId, resolved }) => {
    if (!currentRoomId || !currentUserId) return

    const updatedComment = roomManager.resolveComment(currentRoomId, commentId, currentUserId, resolved)
    if (updatedComment) {
      io.to(currentRoomId).emit('comment-resolved', {
        commentId,
        resolved,
        comment: updatedComment,
      })
    }
  })

  socket.on('add-reply', ({ commentId, reply }: { commentId: string; reply: Reply }) => {
    if (!currentRoomId || !currentUserId) return

    const enrichedReply: Reply = {
      ...reply,
      authorId: currentUserId,
    }

    const updatedComment = roomManager.addReply(currentRoomId, commentId, enrichedReply)
    if (updatedComment) {
      io.to(currentRoomId).emit('new-reply', {
        commentId,
        reply: enrichedReply,
      })
    }
  })

  socket.on('set-permission', ({ mode }) => {
    if (!currentRoomId || !currentUserId) return
    if (!roomManager.isOwner(currentRoomId, currentUserId)) {
      socket.emit('error', { message: '只有所有者可以修改权限设置' })
      return
    }

    const success = roomManager.setPermissionMode(currentRoomId, currentUserId, mode)
    if (success) {
      io.to(currentRoomId).emit('permission-updated', { mode })
      showToastRoom(currentRoomId, '文档权限已更新', 'info')
    }
  })

  socket.on('create-invitation', ({ email, expiresInMs, canEdit }) => {
    if (!currentRoomId || !currentUserId) return
    if (!roomManager.isOwner(currentRoomId, currentUserId)) {
      socket.emit('error', { message: '只有所有者可以创建邀请链接' })
      return
    }

    const invitation = roomManager.createInvitation(currentRoomId, email, expiresInMs, canEdit)
    if (invitation) {
      socket.emit('invitation-created', {
        ...invitation,
        inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}?invite=${invitation.id}`,
      })
    }
  })

  socket.on('get-permission-info', () => {
    if (!currentRoomId || !currentUserId) return
    const room = roomManager.getRoom(currentRoomId)
    if (!room) return

    socket.emit('permission-info', {
      mode: room.permissionMode,
      isOwner: room.ownerId === currentUserId,
      canEdit: roomManager.canEdit(currentRoomId, currentUserId),
      invitations: Array.from(room.invitations.values()),
    })
  })

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      roomManager.removeUser(currentRoomId, currentUserId)
      socket.to(currentRoomId).emit('user-left', { userId: currentUserId })
    }
  })
})

function showToastRoom(roomId: string, message: string, type: string) {
  io.to(roomId).emit('toast', { message, type })
}

setInterval(() => {
  const rooms = roomManager['rooms'] as Map<string, any>
  rooms.forEach((room, roomId) => {
    const expiredInvitations: string[] = []
    room.invitations.forEach((invite: any, id: string) => {
      if (invite.expiresAt < Date.now()) {
        expiredInvitations.push(id)
      }
    })
    expiredInvitations.forEach(id => room.invitations.delete(id))
  })
}, 60000)

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Default room: ${DEFAULT_ROOM_ID}`)
  console.log(`API Base: http://localhost:${PORT}`)
})
