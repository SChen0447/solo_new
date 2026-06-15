import { v4 as uuidv4 } from 'uuid'

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

const assignments: Assignment[] = [
  {
    id: uuidv4(),
    title: '两数之和',
    description: '给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出和为目标值的那两个整数，并返回它们的数组下标。\n\n你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。',
    difficulty: 'beginner',
    testCases: [
      { input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
      { input: '[3,2,4], 6', expectedOutput: '[1,2]' },
      { input: '[3,3], 6', expectedOutput: '[0,1]' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    title: '反转链表',
    description: '给你单链表的头节点 `head`，请你反转链表，并返回反转后的链表。\n\n**示例：**\n- 输入：1→2→3→4→5→NULL\n- 输出：5→4→3→2→1→NULL',
    difficulty: 'intermediate',
    testCases: [
      { input: '1->2->3->4->5', expectedOutput: '5->4->3->2->1' },
      { input: '1->2', expectedOutput: '2->1' },
    ],
    createdAt: new Date().toISOString(),
  },
]

const submissions: Submission[] = [
  {
    id: uuidv4(),
    assignmentId: assignments[0].id,
    studentId: 'student-1',
    studentName: '张三',
    code: 'function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n}',
    language: 'javascript',
    results: [
      { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', actualOutput: '[0,1]', passed: true },
      { input: '[3,2,4], 6', expectedOutput: '[1,2]', actualOutput: '[1,2]', passed: true },
      { input: '[3,3], 6', expectedOutput: '[0,1]', actualOutput: '[0,1]', passed: true },
    ],
    passed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    assignmentId: assignments[0].id,
    studentId: 'student-2',
    studentName: '李四',
    code: 'function twoSum(nums, target) {\n  return [0, 1];\n}',
    language: 'javascript',
    results: [
      { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', actualOutput: '[0,1]', passed: true },
      { input: '[3,2,4], 6', expectedOutput: '[1,2]', actualOutput: '[0,1]', passed: false },
    ],
    passed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    assignmentId: assignments[1].id,
    studentId: 'student-1',
    studentName: '张三',
    code: 'function reverseList(head) {\n  let prev = null;\n  let curr = head;\n  while (curr) {\n    let next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}',
    language: 'javascript',
    results: [
      { input: '1->2->3->4->5', expectedOutput: '5->4->3->2->1', actualOutput: '5->4->3->2->1', passed: true },
    ],
    passed: true,
    createdAt: new Date().toISOString(),
  },
]

const annotations: Annotation[] = [
  {
    id: uuidv4(),
    submissionId: submissions[1].id,
    lineNumber: 2,
    content: '这种硬编码返回值的方式只能通过第一个测试用例，需要实现真正的查找逻辑。',
    createdBy: '教师',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    submissionId: submissions[1].id,
    lineNumber: 1,
    content: '建议使用哈希表优化时间复杂度到 O(n)。',
    createdBy: '教师',
    createdAt: new Date().toISOString(),
  },
]

export const db = {
  assignments,
  submissions,
  annotations,

  findAssignment(id: string): Assignment | undefined {
    return this.assignments.find((a) => a.id === id)
  },

  findSubmission(id: string): Submission | undefined {
    return this.submissions.find((s) => s.id === id)
  },

  findSubmissionsByAssignment(assignmentId: string): Submission[] {
    return this.submissions.filter((s) => s.assignmentId === assignmentId)
  },

  findSubmissionsByStudent(studentId: string): Submission[] {
    return this.submissions.filter((s) => s.studentId === studentId)
  },

  findAnnotationsBySubmission(submissionId: string): Annotation[] {
    return this.annotations
      .filter((a) => a.submissionId === submissionId)
      .sort((a, b) => a.lineNumber - b.lineNumber)
  },

  addAssignment(data: Omit<Assignment, 'id' | 'createdAt'>): Assignment {
    const assignment: Assignment = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }
    this.assignments.push(assignment)
    return assignment
  },

  updateAssignment(id: string, data: Partial<Assignment>): Assignment | null {
    const idx = this.assignments.findIndex((a) => a.id === id)
    if (idx === -1) return null
    this.assignments[idx] = { ...this.assignments[idx], ...data }
    return this.assignments[idx]
  },

  deleteAssignment(id: string): boolean {
    const idx = this.assignments.findIndex((a) => a.id === id)
    if (idx === -1) return false
    this.assignments.splice(idx, 1)
    return true
  },

  addSubmission(data: Omit<Submission, 'id' | 'createdAt'>): Submission {
    const submission: Submission = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }
    this.submissions.push(submission)
    return submission
  },

  addAnnotation(data: Omit<Annotation, 'id' | 'createdAt'>): Annotation {
    const annotation: Annotation = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }
    this.annotations.push(annotation)
    return annotation
  },

  deleteAnnotation(id: string): boolean {
    const idx = this.annotations.findIndex((a) => a.id === id)
    if (idx === -1) return false
    this.annotations.splice(idx, 1)
    return true
  },
}
