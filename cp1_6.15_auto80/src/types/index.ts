export interface TestCase {
  input: string
  expectedOutput: string
}

export interface Assignment {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  testCases: TestCase[]
  createdAt: string
}

export interface TestResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  code: string
  language: 'javascript' | 'python'
  results: TestResult[]
  passed: boolean
  createdAt: string
}

export interface Annotation {
  id: string
  submissionId: string
  lineNumber: number
  content: string
  createdBy: string
  createdAt: string
}

export type UserRole = 'teacher' | 'student'

export interface AssignmentStats {
  assignmentId: string
  title: string
  totalSubmissions: number
  passedSubmissions: number
  passRate: number
}
