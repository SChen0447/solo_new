import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_PATH = path.join(__dirname, 'data.json')

app.use(cors())
app.use(express.json())

interface Material {
  id: string
  name: string
  stock: number
  threshold: number
}

interface Student {
  id: string
  name: string
  phone: string
}

interface CourseMaterial {
  materialId: string
  quantity: number
}

interface Course {
  id: string
  name: string
  type: string
  date: string
  startTime: string
  duration: number
  capacity: number
  materials: CourseMaterial[]
  enrolledStudents: string[]
  attendance: Record<string, string>
}

interface Data {
  courses: Course[]
  students: Student[]
  materials: Material[]
}

const readData = (): Data => {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
}

const writeData = (data: Data) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/courses', (_req: Request, res: Response) => {
  const data = readData()
  res.json(data.courses)
})

app.post('/api/courses', (req: Request, res: Response) => {
  const data = readData()
  const newCourse: Course = {
    id: uuidv4(),
    ...req.body,
    enrolledStudents: [],
    attendance: {}
  }
  data.courses.push(newCourse)
  writeData(data)
  res.json(newCourse)
})

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const data = readData()
  const index = data.courses.findIndex(c => c.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: 'Course not found' })
    return
  }
  const existing = data.courses[index]
  data.courses[index] = {
    ...existing,
    ...req.body,
    enrolledStudents: existing.enrolledStudents,
    attendance: existing.attendance
  }
  writeData(data)
  res.json(data.courses[index])
})

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const data = readData()
  data.courses = data.courses.filter(c => c.id !== req.params.id)
  writeData(data)
  res.json({ success: true })
})

app.put('/api/courses/:id/enroll', (req: Request, res: Response) => {
  const { studentId } = req.body
  const data = readData()
  const course = data.courses.find(c => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ error: 'Course not found' })
    return
  }
  if (course.enrolledStudents.length >= course.capacity) {
    res.status(400).json({ error: 'Course is full' })
    return
  }
  if (!course.enrolledStudents.includes(studentId)) {
    course.enrolledStudents.push(studentId)
    writeData(data)
  }
  res.json(course)
})

app.put('/api/courses/:id/attend', (req: Request, res: Response) => {
  const { studentId, time } = req.body
  const data = readData()
  const course = data.courses.find(c => c.id === req.params.id)
  if (!course) {
    res.status(404).json({ error: 'Course not found' })
    return
  }
  course.attendance[studentId] = time
  writeData(data)
  res.json(course)
})

app.get('/api/students', (_req: Request, res: Response) => {
  const data = readData()
  res.json(data.students)
})

app.post('/api/students', (req: Request, res: Response) => {
  const data = readData()
  const newStudent: Student = {
    id: uuidv4(),
    ...req.body
  }
  data.students.push(newStudent)
  writeData(data)
  res.json(newStudent)
})

app.put('/api/students/:id', (req: Request, res: Response) => {
  const data = readData()
  const index = data.students.findIndex(s => s.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: 'Student not found' })
    return
  }
  data.students[index] = { ...data.students[index], ...req.body }
  writeData(data)
  res.json(data.students[index])
})

app.delete('/api/students/:id', (req: Request, res: Response) => {
  const data = readData()
  data.students = data.students.filter(s => s.id !== req.params.id)
  data.courses.forEach(course => {
    course.enrolledStudents = course.enrolledStudents.filter(id => id !== req.params.id)
    delete course.attendance[req.params.id]
  })
  writeData(data)
  res.json({ success: true })
})

app.get('/api/materials', (_req: Request, res: Response) => {
  const data = readData()
  res.json(data.materials)
})

app.post('/api/materials', (req: Request, res: Response) => {
  const data = readData()
  const newMaterial: Material = {
    id: uuidv4(),
    ...req.body
  }
  data.materials.push(newMaterial)
  writeData(data)
  res.json(newMaterial)
})

app.put('/api/materials/:id', (req: Request, res: Response) => {
  const data = readData()
  const index = data.materials.findIndex(m => m.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: 'Material not found' })
    return
  }
  data.materials[index] = { ...data.materials[index], ...req.body }
  writeData(data)
  res.json(data.materials[index])
})

app.delete('/api/materials/:id', (req: Request, res: Response) => {
  const data = readData()
  data.materials = data.materials.filter(m => m.id !== req.params.id)
  data.courses.forEach(course => {
    course.materials = course.materials.filter(cm => cm.materialId !== req.params.id)
  })
  writeData(data)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
