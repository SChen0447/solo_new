import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import CourseCalendar from './components/CourseCalendar'
import StudentList from './components/StudentList'
import CourseDetail from './components/CourseDetail'
import { useWorkshopStore } from './store/workshopStore'

const HomePage = () => {
  const { courses, students, materials } = useWorkshopStore()
  const lowStock = materials.filter(m => m.stock < m.threshold).length

  return (
    <div className="home-page">
      <h1>欢迎使用手工艺工作坊管理系统</h1>
      <p className="subtitle">高效管理课程排期、学员报名与材料库存</p>
      
      <div className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-value">{courses.length}</div>
          <div className="stat-label">当前课程</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{students.length}</div>
          <div className="stat-label">注册学员</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{materials.length}</div>
          <div className="stat-label">材料种类</div>
        </div>
        {lowStock > 0 && (
          <div className="stat-card warning">
            <div className="stat-value">{lowStock}</div>
            <div className="stat-label">库存预警</div>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h3>快捷操作</h3>
        <div className="action-buttons">
          <Link to="/courses" className="btn btn-primary">查看课程日历</Link>
          <Link to="/students" className="btn btn-primary">管理学员</Link>
        </div>
      </div>
    </div>
  )
}

const App = () => {
  const location = useLocation()
  const courseDetailMatch = location.pathname.match(/^\/course\/(.+)$/)
  const courseId = courseDetailMatch ? courseDetailMatch[1] : null

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <nav className="top-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>首页</Link>
          <Link to="/courses" className={`nav-link ${location.pathname.startsWith('/courses') ? 'active' : ''}`}>课程管理</Link>
          <Link to="/students" className={`nav-link ${location.pathname === '/students' ? 'active' : ''}`}>学员管理</Link>
        </nav>
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CourseCalendar />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/students" element={<StudentList />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
