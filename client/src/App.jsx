import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Snippets from './pages/Snippets'
import SnippetEditor from './pages/SnippetEditor'
import FormulaReference from './pages/FormulaReference'
import Secrets from './pages/Secrets'
import Logs from './pages/Logs'
import Usage from './pages/Usage'
import Account from './pages/Account'
import { getToken, setToken, api, onAuthChange } from './api/client'

// Public routes accessible without login
const PUBLIC_ROUTES = ['/formula-reference']

function NotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-semibold text-hubspot-dark mb-2">Page Not Found</h1>
      <p className="text-hubspot-gray">The page you are looking for does not exist.</p>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [portal, setPortal] = useState(null)

  useEffect(() => {
    // Listen for 401 auth failures from API client
    const unsubscribe = onAuthChange(() => {
      setIsAuthenticated(false)
      setPortal(null)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      // Check for token in URL (from OAuth callback)
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')

      if (urlToken) {
        setToken(urlToken)
        // Remove token from URL
        window.history.replaceState({}, '', window.location.pathname)
      }

      // Check for HubSpot iframe parameters
      const portalId = params.get('portalId') || params.get('hub_id')
      if (portalId) {
        sessionStorage.setItem('hubspot_portal_id', portalId)
      }

      // Verify existing token
      const token = getToken()

      if (token) {
        try {
          const res = await api.get('/oauth/me')
          setPortal(res.data)
          setIsAuthenticated(true)
        } catch {
          setToken(null)
          setIsAuthenticated(false)
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hubspot-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hubspot-orange mx-auto mb-4"></div>
          <p className="text-hubspot-gray">Loading HubHacks...</p>
        </div>
      </div>
    )
  }

  // Allow public routes without authentication
  const isPublicRoute = PUBLIC_ROUTES.includes(window.location.pathname)

  if (!isAuthenticated && !isPublicRoute) {
    return <LandingPage />
  }

  if (!isAuthenticated && isPublicRoute) {
    return (
      <div className="min-h-screen bg-hubspot-light">
        {/* Public header with branding */}
        <div className="bg-white border-b border-hubspot-border px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-hubspot-orange rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">HH</span>
              </div>
              <span className="font-semibold text-hubspot-dark">HubHacks</span>
            </a>
            <span className="text-xs text-hubspot-gray">HubSpot Workflow Extension</span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/formula-reference" element={<FormulaReference />} />
          </Routes>
        </div>
      </div>
    )
  }

  return (
    <Layout portal={portal}>
      <Routes>
        <Route path="/" element={<Navigate to="/snippets" replace />} />
        <Route path="/snippets" element={<Snippets />} />
        <Route path="/snippets/new" element={<SnippetEditor />} />
        <Route path="/snippets/:id" element={<SnippetEditor />} />
        <Route path="/formula-reference" element={<FormulaReference />} />
        <Route path="/secrets" element={<Secrets />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/account" element={<Account portal={portal} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
