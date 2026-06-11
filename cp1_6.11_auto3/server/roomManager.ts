import { v4 as uuidv4 } from 'uuid'

export type PermissionMode = 'public' | 'invited' | 'private'

export interface User {
  id: string
  name: string
  color: string
  socketId: string
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
  label?: string
}

export interface Room {
  id: string
  name: string
  ownerId: string
  permissionMode: PermissionMode
  users: Map<string, User>
  invitations: Map<string, Invitation>
  versions: VersionSnapshot[]
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

  addUser(roomId: string, user: User): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const colorIndex = room.users.size % USER_COLORS.length
    user.color = USER_COLORS[colorIndex]
    room.users.set(user.id, user)
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

  canJoin(roomId: string, userId: string, invitationId?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    if (room.permissionMode === 'public') return true
    if (room.ownerId === userId) return true

    if (invitationId && room.invitations.has(invitationId)) {
      const invite = room.invitations.get(invitationId)!
      if (invite.expiresAt > Date.now()) {
        return true
      }
    }

    return false
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

  saveVersion(roomId: string, content: string, label?: string): VersionSnapshot | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const snapshot: VersionSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      content,
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

  setPermissionMode(roomId: string, mode: PermissionMode): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.permissionMode = mode
    return true
  }
}

export const roomManager = new RoomManager()
