import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TeacherDashboard from '@/pages/TeacherDashboard'
import AssignmentForm from '@/pages/AssignmentForm'
import SubmissionReview from '@/pages/SubmissionReview'
import StudentSubmission from '@/pages/StudentSubmission'
import StudentHistory from '@/pages/StudentHistory'
import { useAppStore } from '@/store'

function AppLayout() {
  const role = useAppStore((s) => s.role)

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header />
        <main className="pt-[60px] p-6 min-h-screen">
          {role === 'teacher' ? (
            <Routes>
              <Route path="/" element={<TeacherDashboard />} />
              <Route path="/assignment/new" element={<AssignmentForm />} />
              <Route path="/assignment/:id/edit" element={<AssignmentForm />} />
              <Route path="/assignment/:assignmentId/submissions" element={<SubmissionReview />} />
              <Route path="/submissions" element={<SubmissionReview />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<StudentSubmission />} />
              <Route path="/student" element={<StudentSubmission />} />
              <Route path="/student/assignment/:id" element={<StudentSubmission />} />
              <Route path="/student/history" element={<StudentHistory />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}
