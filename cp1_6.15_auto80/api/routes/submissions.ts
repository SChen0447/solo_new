import { Router, type Request, type Response } from 'express'
import { db } from '../data.js'
import type { TestResult } from '../data.js'

const router = Router()

function runJavaScriptTests(code: string, testCases: { input: string; expectedOutput: string }[]): TestResult[] {
  const results: TestResult[] = []
  for (const tc of testCases) {
    try {
      const fn = new Function('return ' + code)()
      if (typeof fn !== 'function') {
        results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: String(fn), passed: false })
        continue
      }
      const args = tc.input.split(',').map((s) => {
        const trimmed = s.trim()
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          return JSON.parse(trimmed)
        }
        const num = Number(trimmed)
        return isNaN(num) ? trimmed : num
      })
      const output = fn(...args)
      const actualOutput = JSON.stringify(output)
      results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput, passed: actualOutput === tc.expectedOutput })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: `Error: ${msg}`, passed: false })
    }
  }
  return results
}

function runPythonTests(_code: string, testCases: { input: string; expectedOutput: string }[]): TestResult[] {
  return testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    actualOutput: '(Python执行环境暂不可用)',
    passed: false,
  }))
}

router.get('/', (req: Request, res: Response): void => {
  const { assignmentId, studentId } = req.query
  let result = db.submissions
  if (assignmentId) {
    result = db.findSubmissionsByAssignment(assignmentId as string)
  }
  if (studentId) {
    result = db.findSubmissionsByStudent(studentId as string)
  }
  res.json(result)
})

router.get('/:id', (req: Request, res: Response): void => {
  const submission = db.findSubmission(req.params.id)
  if (!submission) {
    res.status(404).json({ error: '提交记录未找到' })
    return
  }
  res.json(submission)
})

router.post('/', (req: Request, res: Response): void => {
  const { assignmentId, studentId, studentName, code, language } = req.body
  if (!assignmentId || !studentId || !code || !language) {
    res.status(400).json({ error: '缺少必填字段' })
    return
  }
  const assignment = db.findAssignment(assignmentId)
  if (!assignment) {
    res.status(404).json({ error: '题目未找到' })
    return
  }

  const testCases = assignment.testCases.length > 0 ? assignment.testCases : []
  let results: TestResult[]

  if (language === 'javascript') {
    results = runJavaScriptTests(code, testCases)
  } else {
    results = runPythonTests(code, testCases)
  }

  const passed = results.length > 0 && results.every((r) => r.passed)

  const submission = db.addSubmission({
    assignmentId,
    studentId,
    studentName: studentName || '匿名学生',
    code,
    language,
    results,
    passed,
  })

  res.status(201).json(submission)
})

export default router
