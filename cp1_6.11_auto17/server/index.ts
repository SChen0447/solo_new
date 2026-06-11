import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { documentStore, Operation } from './documentStore'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.use(express.json())

app.get('/api/documents', (req, res) => {
  const docs = documentStore.getAllDocuments()
  res.json(docs)
})

app.get('/api/documents/:id', (req, res) => {
  const doc = documentStore.getDocument(req.params.id)
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json(doc)
})

app.post('/api/documents', (req, res) => {
  const { title, creator } = req.body
  if (!title) {
    res.status(400).json({ error: 'Title is required' })
    return
  }
  const doc = documentStore.createDocument(title, creator || '匿名用户')
  res.status(201).json(doc)
})

app.put('/api/documents/:id', (req, res) => {
  const doc = documentStore.updateDocument(req.params.id, req.body)
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json(doc)
})

app.delete('/api/documents/:id', (req, res) => {
  const deleted = documentStore.deleteDocument(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json({ success: true })
})

app.get('/api/documents/:id/versions', (req, res) => {
  const versions = documentStore.getVersions(req.params.id)
  res.json(versions)
})

app.get('/api/documents/:id/versions/:versionId', (req, res) => {
  const version = documentStore.getVersion(req.params.id, req.params.versionId)
  if (!version) {
    res.status(404).json({ error: 'Version not found' })
    return
  }
  res.json(version)
})

app.post('/api/documents/:id/versions', (req, res) => {
  const { savedBy } = req.body
  const version = documentStore.saveVersion(req.params.id, savedBy || '匿名用户')
  if (!version) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.status(201).json(version)
})

app.get('/api/documents/:id/users', (req, res) => {
  const users = documentStore.getUsers(req.params.id)
  res.json(users)
})

const documentSockets = new Map<string, Set<string>>()

io.on('connection', (socket) => {
  let currentDocumentId: string | null = null
  let userId: string | null = null
  let userName: string | null = null

  socket.on('join-document', ({ documentId, userId: uid, userName: uname }: { documentId: string; userId?: string; userName?: string }) => {
    if (currentDocumentId && userId) {
      documentStore.removeUser(currentDocumentId, userId)
      const prevUsers = documentStore.getUsers(currentDocumentId)
      io.to(currentDocumentId).emit('users-updated', prevUsers)
      socket.leave(currentDocumentId)
      
      const docSockets = documentSockets.get(currentDocumentId)
      if (docSockets) {
        docSockets.delete(socket.id)
      }
    }

    currentDocumentId = documentId
    userId = uid || uuidv4()
    userName = uname || '用户' + Math.floor(Math.random() * 1000)

    const doc = documentStore.getDocument(documentId)
    if (!doc) {
      socket.emit('error', { message: 'Document not found' })
      return
    }

    const user = documentStore.addUser(documentId, userId, userName)
    socket.join(documentId)

    if (!documentSockets.has(documentId)) {
      documentSockets.set(documentId, new Set())
    }
    documentSockets.get(documentId)!.add(socket.id)

    socket.emit('document-loaded', { document: doc, userId })

    const users = documentStore.getUsers(documentId)
    io.to(documentId).emit('users-updated', users)
  })

  socket.on('content-change', ({ documentId, content, userId: uid }: { documentId: string; content: string; userId: string }) => {
    if (!documentId) return

    const result = documentStore.updateContent(documentId, content, uid)
    if (result) {
      socket.to(documentId).emit('content-updated', {
        content,
        userId: uid,
        timestamp: Date.now(),
      })
    }
  })

  socket.on('operation', ({ documentId, operation }: { documentId: string; operation: Operation }) => {
    if (!documentId) return

    const result = documentStore.applyOperation(documentId, operation)
    if (result) {
      socket.to(documentId).emit('operation-received', {
        operation,
        document: result,
      })
    }
  })

  socket.on('cursor-move', ({ documentId, userId: uid, position }: { documentId: string; userId: string; position: number }) => {
    if (!documentId) return

    const user = documentStore.updateCursor(documentId, uid, position)
    if (user) {
      socket.to(documentId).emit('cursor-updated', { userId: uid, position, user })
    }
  })

  socket.on('save-version', ({ documentId, savedBy }: { documentId: string; savedBy: string }) => {
    const version = documentStore.saveVersion(documentId, savedBy)
    if (version) {
      io.to(documentId).emit('version-saved', version)
    }
  })

  socket.on('disconnect', () => {
    if (currentDocumentId && userId) {
      documentStore.removeUser(currentDocumentId, userId)
      const users = documentStore.getUsers(currentDocumentId)
      io.to(currentDocumentId).emit('users-updated', users)

      const docSockets = documentSockets.get(currentDocumentId)
      if (docSockets) {
        docSockets.delete(socket.id)
        if (docSockets.size === 0) {
          documentSockets.delete(currentDocumentId)
        }
      }
    }
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
