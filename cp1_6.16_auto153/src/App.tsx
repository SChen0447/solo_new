import { createBrowserRouter, Link, Outlet } from 'react-router-dom'
import RecipeEditor from './pages/RecipeEditor'
import RecipeList from './pages/RecipeList'
import Home from './pages/Home'

function Layout() {
  return (
    <div style={layoutStyle}>
      <nav style={navStyle}>
        <h1 style={logoStyle}>🍰 烘焙配方管家</h1>
        <div style={navLinksStyle}>
          <Link to="/" style={navLinkStyle}>首页</Link>
          <Link to="/recipes" style={navLinkStyle}>配方列表</Link>
        </div>
      </nav>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}

const layoutStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#FFF8E1',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
}

const navStyle: React.CSSProperties = {
  backgroundColor: '#795548',
  color: 'white',
  padding: '16px 32px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}

const logoStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 600
}

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px'
}

const navLinkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 500,
  opacity: 0.9,
  transition: 'opacity 0.2s'
}

const mainStyle: React.CSSProperties = {
  padding: '32px',
  maxWidth: '1200px',
  margin: '0 auto'
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'recipes',
        element: <RecipeList />
      },
      {
        path: 'recipes/:id',
        element: <RecipeEditor />
      }
    ]
  }
])

export default function App() {
  return null
}
