import { v4 as uuidv4 } from 'uuid'

export type PermissionMode = 'public' | 'invited' | 'private'

export interface User {
  id: string
  name: string
  color: string
  socketId: string
  canEdit: boolean
}

export interface Invitation {
  id: string
  email?: string
  expiresAt: number
  canEdit: boolean
}

export interface VersionSnapshot {
  id: string
  timestamp: number
  content: string
  delta?: any
  label?: string
}

export interface Reply {
  id: string
  author: string
  authorId: string
  content: string
  timestamp: number
}

export interface Comment {
  id: string
  author: string
  authorId: string
  authorColor: string
  content: string
  selectedText: string
  timestamp: number
  replies: Reply[]
  resolved: boolean
  resolvedAt?: number
  resolvedBy?: string
}

export interface Room {
  id: string
  name: string
  ownerId: string
  permissionMode: PermissionMode
  users: Map<string, User>
  invitations: Map<string, Invitation>
  versions: VersionSnapshot[]
  comments: Comment[]
  createdAt: number
}

const USER_COLORS = [
  '#FF6F00',
  '#1E88E5',
  '#43A047',
  '#8E24AA',
  '#E53935',
  '#00ACC1',
]

class RoomManager {
  private rooms: Map<string, Room> = new Map()

  createRoom(roomId: string, ownerId: string, roomName: string, permissionMode: PermissionMode = 'public'): Room {
    const room: Room = {
      id: roomId,
      name: roomName,
      ownerId,
      permissionMode,
      users: new Map(),
      invitations: new Map(),
      versions: [],
      comments: [],
      createdAt: Date.now(),
    }
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  addUser(roomId: string, user: Omit<User, 'color' | 'canEdit'>, canEdit: boolean = true): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const existingUser = room.users.get(user.id)
    if (existingUser) {
      existingUser.socketId = user.socketId
      existingUser.name = user.name
      return true
    }

    const colorIndex = room.users.size % USER_COLORS.length
    const fullUser: User = {
      ...user,
      color: USER_COLORS[colorIndex],
      canEdit,
    }
    room.users.set(user.id, fullUser)
    return true
  }

  removeUser(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    return room.users.delete(userId)
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return Array.from(room.users.values())
  }

  getUser(roomId: string, userId: string): User | undefined {
    const room = this.rooms.get(roomId)
    if (!room) return undefined
    return room.users.get(userId)
  }

  canJoin(roomId: string, userId: string, invitationId?: string): { canJoin: boolean; canEdit: boolean } {
    const room = this.rooms.get(roomId)
    if (!room) return { canJoin: false, canEdit: false }

    if (room.ownerId === userId) return { canJoin: true, canEdit: true }

    if (room.permissionMode === 'public') {
      return { canJoin: true, canEdit: true }
    }

    if (invitationId && room.invitations.has(invitationId)) {
      const invite = room.invitations.get(invitationId)!
      if (invite.expiresAt > Date.now()) {
        return { canJoin: true, canEdit: invite.canEdit }
      }
    }

    return { canJoin: false, canEdit: false }
  }

  canEdit(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.ownerId === userId) return true

    const user = room.users.get(userId)
    if (user && user.canEdit) return true

    return false
  }

  isOwner(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    return room.ownerId === userId
  }

  createInvitation(roomId: string, email?: string, expiresInMs: number = 86400000, canEdit: boolean = true): Invitation | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const invitation: Invitation = {
      id: uuidv4(),
      email,
      expiresAt: Date.now() + expiresInMs,
      canEdit,
    }
    room.invitations.set(invitation.id, invitation)
    return invitation
  }

  saveVersion(roomId: string, content: string, delta?: any, label?: string): VersionSnapshot | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const lastVersion = room.versions[room.versions.length - 1]
    if (lastVersion && lastVersion.content === content && !label?.includes('手动')) {
      return null
    }

    const snapshot: VersionSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      content,
      delta,
      label,
    }
    room.versions.push(snapshot)

    if (room.versions.length > 100) {
      room.versions = room.versions.slice(-100)
    }

    return snapshot
  }

  getVersions(roomId: string): VersionSnapshot[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return [...room.versions].reverse()
  }

  getVersion(roomId: string, versionId: string): VersionSnapshot | undefined {
    const room = this.rooms.get(roomId)
    if (!room) return undefined
    return room.versions.find(v => v.id === versionId)
  }

  setPermissionMode(roomId: string, userId: string, mode: PermissionMode): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.ownerId !== userId) return false
    room.permissionMode = mode
    return true
  }

  addComment(roomId: string, comment: Comment): Comment | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    room.comments.push(comment)
    return comment
  }

  getComments(roomId: string): Comment[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return room.comments
  }

  resolveComment(roomId: string, commentId: string, userId: string, resolved: boolean): Comment | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    const comment = room.comments.find(c => c.id === commentId)
    if (!comment) return null

    comment.resolved = resolved
    if (resolved) {
      comment.resolvedAt = Date.now()
      comment.resolvedBy = userId
    } else {
      comment.resolvedAt = undefined
      comment.resolvedBy = undefined
    }
    return comment
  }

  addReply(roomId: string, commentId: string, reply: Reply): Comment | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    const comment = room.comments.find(c => c.id === commentId)
    if (!comment) return null
    comment.replies.push(reply)
    return comment
  }
}

export const roomManager = new RoomManager()
