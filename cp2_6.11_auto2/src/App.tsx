import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Decks from '@/pages/Decks'
import Groups from '@/pages/Groups'
import Quiz from '@/pages/Quiz'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </Layout>
    </Router>
  )
}
