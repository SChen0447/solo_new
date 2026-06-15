import { create } from 'zustand'

export interface Snippet {
  id: string
  title: string
  code: string
  createdAt: number
  updatedAt: number
}

export interface OutputRecord {
  id: string
  type: 'stdout' | 'stderr'
  content: string
  timestamp: number
}

interface AppState {
  code: string
  currentSnippetId: string | null
  snippets: Snippet[]
  outputs: OutputRecord[]
  sidebarCollapsed: boolean
  sidebarWidth: number
  outputWidth: number

  setCode: (code: string) => void
  addOutput: (record: Omit<OutputRecord, 'id' | 'timestamp'>) => void
  clearOutputs: () => void
  createSnippet: () => void
  deleteSnippet: (id: string) => void
  renameSnippet: (id: string, title: string) => void
  loadSnippet: (id: string) => void
  exportSnippet: (id: string) => void
  importSnippet: (file: File) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setOutputWidth: (width: number) => void
  updateCurrentSnippetCode: () => void
}

const STORAGE_KEY = 'python-sandbox-snippets'
const MAX_OUTPUTS = 50

const loadSnippetsFromStorage = (): Snippet[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return []
}

const saveSnippetsToStorage = (snippets: Snippet[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  } catch {
    // ignore
  }
}

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const defaultCode = `# 欢迎使用 Python 代码沙盒
# 在这里编写你的 Python 代码，点击运行或按 Ctrl+S 执行

def greet(name):
    return f"Hello, {name}!"

print(greet("World"))

for i in range(5):
    print(f"Count: {i}")
`

export const useAppStore = create<AppState>((set, get) => ({
  code: defaultCode,
  currentSnippetId: null,
  snippets: loadSnippetsFromStorage(),
  outputs: [],
  sidebarCollapsed: false,
  sidebarWidth: 240,
  outputWidth: 400,

  setCode: (code) => set({ code }),

  addOutput: (record) => {
    const newRecord: OutputRecord = {
      ...record,
      id: generateId(),
      timestamp: Date.now()
    }
    const outputs = [...get().outputs, newRecord]
    if (outputs.length > MAX_OUTPUTS) {
      outputs.splice(0, outputs.length - MAX_OUTPUTS)
    }
    set({ outputs })
  },

  clearOutputs: () => set({ outputs: [] }),

  createSnippet: () => {
    const { code, snippets } = get()
    const now = Date.now()
    const newSnippet: Snippet = {
      id: generateId(),
      title: '未命名片段',
      code: code,
      createdAt: now,
      updatedAt: now
    }
    const newSnippets = [newSnippet, ...snippets]
    saveSnippetsToStorage(newSnippets)
    set({ snippets: newSnippets, currentSnippetId: newSnippet.id })
  },

  deleteSnippet: (id) => {
    const { snippets, currentSnippetId } = get()
    const newSnippets = snippets.filter((s) => s.id !== id)
    saveSnippetsToStorage(newSnippets)
    set({
      snippets: newSnippets,
      currentSnippetId: currentSnippetId === id ? null : currentSnippetId
    })
  },

  renameSnippet: (id, title) => {
    const snippets = get().snippets.map((s) =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s
    )
    saveSnippetsToStorage(snippets)
    set({ snippets })
  },

  loadSnippet: (id) => {
    const snippet = get().snippets.find((s) => s.id === id)
    if (snippet) {
      set({ code: snippet.code, currentSnippetId: id })
    }
  },

  exportSnippet: (id) => {
    const snippet = get().snippets.find((s) => s.id === id)
    if (!snippet) return
    const blob = new Blob([snippet.code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${snippet.title || 'snippet'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },

  importSnippet: (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = String(e.target?.result || '')
      const now = Date.now()
      const newSnippet: Snippet = {
        id: generateId(),
        title: file.name.replace(/\.txt$/i, ''),
        code: content,
        createdAt: now,
        updatedAt: now
      }
      const snippets = [newSnippet, ...get().snippets]
      saveSnippetsToStorage(snippets)
      set({ snippets })
    }
    reader.readAsText(file)
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(160, Math.min(400, width)) }),

  setOutputWidth: (width) => set({ outputWidth: Math.max(280, Math.min(700, width)) }),

  updateCurrentSnippetCode: () => {
    const { currentSnippetId, code, snippets } = get()
    if (!currentSnippetId) return
    const updated = snippets.map((s) =>
      s.id === currentSnippetId
        ? { ...s, code, updatedAt: Date.now() }
        : s
    )
    saveSnippetsToStorage(updated)
    set({ snippets: updated })
  }
}))
