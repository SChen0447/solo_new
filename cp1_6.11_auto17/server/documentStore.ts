import { v4 as uuidv4 } from 'uuid'
import * as Diff from 'diff'

export interface Document {
  id: string
  title: string
  content: string
  creator: string
  createdAt: number
  updatedAt: number
  version: number
}

export interface Version {
  id: string
  documentId: string
  content: string
  version: number
  savedBy: string
  savedAt: number
}

export interface Operation {
  type: 'insert' | 'delete' | 'format'
  position?: number
  text?: string
  length?: number
  format?: string
  value?: boolean
  userId: string
  timestamp: number
}

export interface User {
  id: string
  name: string
  color: string
  documentId: string
  cursorPosition?: number
}

interface DocumentData {
  document: Document
  versions: Version[]
  operations: Operation[]
  users: Map<string, User>
}

const USER_COLORS = [
  '#FF5722',
  '#4CAF50',
  '#2196F3',
  '#9C27B0',
  '#FF9800',
  '#00BCD4',
  '#E91E63',
  '#8BC34A',
  '#3F51B5',
  '#FFC107',
]

class DocumentStore {
  private documents: Map<string, DocumentData> = new Map()
  private userColors: Map<string, string> = new Map()

  createDocument(title: string, creator: string): Document {
    const id = uuidv4()
    const now = Date.now()
    const doc: Document = {
      id,
      title,
      content: '<p>开始编辑你的文档...</p>',
      creator,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }
    this.documents.set(id, {
      document: doc,
      versions: [],
      operations: [],
      users: new Map(),
    })
    return doc
  }

  getDocument(id: string): Document | null {
    const data = this.documents.get(id)
    return data ? data.document : null
  }

  getAllDocuments(): Document[] {
    return Array.from(this.documents.values()).map((d) => d.document)
  }

  updateDocument(id: string, updates: Partial<Document>): Document | null {
    const data = this.documents.get(id)
    if (!data) return null
    data.document = { ...data.document, ...updates, updatedAt: Date.now() }
    return data.document
  }

  deleteDocument(id: string): boolean {
    return this.documents.delete(id)
  }

  getVersions(documentId: string): Version[] {
    const data = this.documents.get(documentId)
    return data ? data.versions : []
  }

  getVersion(documentId: string, versionId: string): Version | null {
    const data = this.documents.get(documentId)
    if (!data) return null
    return data.versions.find((v) => v.id === versionId) || null
  }

  saveVersion(documentId: string, savedBy: string): Version | null {
    const data = this.documents.get(documentId)
    if (!data) return null

    const version: Version = {
      id: uuidv4(),
      documentId,
      content: data.document.content,
      version: data.document.version,
      savedBy,
      savedAt: Date.now(),
    }
    data.versions.unshift(version)
    data.document.version++
    return version
  }

  applyOperation(documentId: string, operation: Operation): Document | null {
    const data = this.documents.get(documentId)
    if (!data) return null

    const { content } = data.document
    let newContent = content

    if (operation.type === 'insert' && operation.position !== undefined && operation.text) {
      const plainContent = this.stripHtml(content)
      const plainNew = plainContent.slice(0, operation.position) + operation.text + plainContent.slice(operation.position)
      newContent = `<p>${plainNew}</p>`
    } else if (operation.type === 'delete' && operation.position !== undefined && operation.length) {
      const plainContent = this.stripHtml(content)
      const plainNew = plainContent.slice(0, operation.position) + plainContent.slice(operation.position + operation.length)
      newContent = `<p>${plainNew}</p>`
    }

    data.document.content = newContent
    data.document.updatedAt = Date.now()
    data.operations.push(operation)

    return data.document
  }

  updateContent(documentId: string, content: string, userId: string): Document | null {
    const data = this.documents.get(documentId)
    if (!data) return null

    data.document.content = content
    data.document.updatedAt = Date.now()
    return data.document
  }

  mergeChanges(documentId: string, newContent: string, userId: string): { content: string; merged: boolean } {
    const data = this.documents.get(documentId)
    if (!data) return { content: newContent, merged: false }

    const oldContent = data.document.content
    if (oldContent === newContent) {
      return { content: oldContent, merged: true }
    }

    data.document.content = newContent
    data.document.updatedAt = Date.now()

    return { content: newContent, merged: true }
  }

  detectConflict(op1: Operation, op2: Operation): boolean {
    if (op1.type !== op2.type) return false
    if (op1.position === undefined || op2.position === undefined) return false

    if (op1.type === 'insert' && op2.type === 'insert') {
      return op1.position === op2.position
    }
    if (op1.type === 'delete' && op2.type === 'delete') {
      const end1 = op1.position + (op1.length || 0)
      const end2 = op2.position + (op2.length || 0)
      return op1.position < end2 && op2.position < end1
    }
    return false
  }

  addUser(documentId: string, userId: string, userName: string): User | null {
    const data = this.documents.get(documentId)
    if (!data) return null

    let color = this.userColors.get(userId)
    if (!color) {
      const usedColors = Array.from(data.users.values()).map((u) => u.color)
      const availableColors = USER_COLORS.filter((c) => !usedColors.includes(c))
      color = availableColors.length > 0 ? availableColors[0] : USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
      this.userColors.set(userId, color)
    }

    const user: User = {
      id: userId,
      name: userName,
      color,
      documentId,
    }
    data.users.set(userId, user)
    return user
  }

  removeUser(documentId: string, userId: string): boolean {
    const data = this.documents.get(documentId)
    if (!data) return false
    return data.users.delete(userId)
  }

  getUsers(documentId: string): User[] {
    const data = this.documents.get(documentId)
    return data ? Array.from(data.users.values()) : []
  }

  updateCursor(documentId: string, userId: string, position: number): User | null {
    const data = this.documents.get(documentId)
    if (!data) return null
    const user = data.users.get(userId)
    if (!user) return null
    user.cursorPosition = position
    return user
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '')
  }
}

export const documentStore = new DocumentStore()
