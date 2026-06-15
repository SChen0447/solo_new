import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor, rectangularSelection, crosshairCursor, ViewPlugin, Decoration, type DecorationSet } from '@codemirror/view'
import { EditorState, StateEffect, StateField, RangeSet } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python, pythonLanguage } from '@codemirror/lang-python'
import { syntaxHighlighting, HighlightStyle, defaultHighlightStyle } from '@codemirror/language'
import { tags } from '@codemirror/highlight'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'

const customPythonHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#569cd6' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.definition(tags.function(tags.variableName)),
  { tag: tags.propertyName, color: '#9cdcfe' },
  { tag: tags.className, color: '#4ec9b0' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.punctuation, color: '#d4d4d4' }
])

const customTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e2e !important',
    fontSize: '16px',
    height: '100%',
    flex: 1
  },
  '.cm-content': {
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    lineHeight: '1.6',
    padding: '0'
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e2e',
    borderRight: '1px solid #2d2d2d',
    color: '#858585'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d3e'
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d3e'
  },
  '.cm-selectionBackground': {
    backgroundColor: '#264f78 !important'
  },
  '.cm-cursor': {
    borderLeftColor: '#aeafad',
    borderLeftWidth: '2px'
  },
  '.cm-lineNumbers': {
    fontSize: '14px'
  }
}, { dark: true })

interface Diagnostic {
  from: number
  to: number
  message: string
}

const setDiagnosticsEffect = StateEffect.define<Diagnostic[]>()

const diagnosticField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDiagnosticsEffect)) {
        const widgets = [] as any[]
        for (const d of effect.value) {
          widgets.push(
            Decoration.line({
            class: 'cm-diagnostic-line',
            attributes: { 'data-error': d.message }
          }).range(d.from)
        )
        return Decoration.set(widgets)
      }
    }
    return value.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f)
})

const errorTooltipTheme = EditorView.baseTheme({
  '.cm-diagnostic-line': {
    position: 'relative'
  },
  '.cm-error-gutter': {
    color: '#f44747'
  },
  '.cm-tooltip-error': {
    position: 'absolute',
    background: '#ffffff',
    color: '#1e1e2e',
    padding: '6px 10px',
    borderRadius: '4px',
    boxShadow: '0 2px 8px #00000050',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    maxWidth: '300px',
    zIndex: '100'
  }
})

const simplePythonLint = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  diagnostics: Diagnostic[] = []

  constructor() {
    this.decorations = Decoration.none
  }

  update(update: any) {
    if (update.docChanged || update.viewportChanged) {
      this.checkSyntax(update.view)
    }
  }

  checkSyntax(view: EditorView) {
    const doc = view.state.doc
    const diagnostics: Diagnostic[] = []
    const text = doc.toString()
    const lines = text.split('\n')

    const bracketStack: { char: string; line: number; pos: number }[] = []
    const bracketMap: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
    const openBrackets = '([{'
    const closeBrackets = ')]}'

    let lineOffset = 0
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const lineLen = line.length
      let inString: string | null = null
      let inComment = false

      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        const pos = lineOffset + i

        if (inComment) break

        if (inString) {
          if (ch === inString && line[i - 1] !== '\\') {
            inString = null
          }
          continue
        }

        if (ch === '#' && !inString) {
          inComment = true
          break
        }

        if ((ch === '"' || ch === "'") && !inComment) {
          inString = ch
          continue
        }

        if (openBrackets.includes(ch)) {
          bracketStack.push({ char: ch, line: lineIdx, pos })
        } else if (closeBrackets.includes(ch)) {
          const expected = bracketMap[ch]
          const last = bracketStack.pop()
          if (!last || last.char !== expected) {
            diagnostics.push({
              from: pos,
              to: pos + 1,
              message: `不匹配的括号: ${ch}`
            })
          }
        }
      }
      lineOffset += lineLen + 1
    }

    while (bracketStack.length > 0) {
      const b = bracketStack.pop()!
      diagnostics.push({
        from: b.pos,
        to: b.pos + 1,
        message: `未闭合的括号: ${b.char}`
      })
    }

    let currentIndent = 0
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1].length

      if (indent % 4 !== 0 && indent > 0) {
        diagnostics.push({
          from: lineOffset - line.length - 1,
          to: lineOffset - 1,
          message: '缩进错误：应为4个空格的倍数'
        })
      }

      if (trimmed.endsWith(':') && lineIdx + 1 < lines.length) {
        const nextLine = lines[lineIdx + 1].replace(/\s*#.*$/, '')
        if (nextLine.trim() && !nextLine.trim().startsWith(' ') && !nextLine.trim().startsWith('\t')) {
          diagnostics.push({
            from: lineOffset - 1,
            to: lineOffset,
            message: '此语句后需要缩进块'
          })
        }
      }
    }

    this.diagnostics = diagnostics
    view.dispatch({
      effects: setDiagnosticsEffect.of(diagnostics)
    })
  }
})

const errorGutter = lineNumbers({
  formatNumber: (lineNo, state) => {
    const diagnostics = (state.field(diagnosticField, false)
    if (!diagnostics) return String(lineNo)

    const lineStart = state.doc.line(lineNo).from
    let hasError = false
    diagnostics.between(lineStart, lineStart, () => {
      hasError = true
    })
    if (hasError) {
      return `<span class="cm-error-gutter">●</span> ${lineNo}`
    return String(lineNo)
  }
})

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
}

export default function CodeEditor({ value, onChange, onRun }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isInternalChange = useRef(false)

  const runKeymap = useRef(
    keymap.of([{
      key: 'Ctrl-s',
      preventDefault: true,
      run: () => {
        onRun()
        return true
      }
    }, {
      key: 'Mod-s',
      preventDefault: true,
      run: () => {
        onRun()
        return true
      }
    }])
  ).current

  useEffect(() => {
    if (!editorRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalChange.current = true
        const newVal = update.state.doc.toString()
        onChange(newVal)
        setTimeout(() => { isInternalChange.current = false
        }, 0)
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(customPythonHighlight),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        dropCursor(),
        python(),
        oneDark,
        customTheme,
        errorTooltipTheme,
        diagnosticField,
        simplePythonLint,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...lintKeymap,
          indentWithTab
        ]),
        runKeymap,
        updateListener
      ]
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || isInternalChange.current) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value }
      })
    }
  }, [value])

  return <div ref={editorRef} className="code-editor-wrapper" />
}
