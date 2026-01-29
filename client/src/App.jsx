import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Snippets from './pages/Snippets'
import SnippetEditor from './pages/SnippetEditor'
import Secrets from './pages/Secrets'
import Logs from './pages/Logs'
import Usage from './pages/Usage'
import Account from './pages/Account'
import { getToken, setToken, api } from './api/client'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [portal, setPortal] = useState(null)

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')

    if (urlToken) {
      setToken(urlToken)
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
      api.get('/oauth/me')
        .then(res => {
          setPortal(res.data)
          setIsAuthenticated(true)
        })
        .catch(() => {
          setToken(null)
          setIsAuthenticated(false)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hubspot-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hubspot-orange mx-auto mb-4"></div>
          <p className="text-hubspot-gray">Loading CodeFlow...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hubspot-light">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-semibold text-hubspot-dark mb-4">CodeFlow</h1>
          <p className="text-hubspot-gray mb-6">
            Connect your HubSpot portal to use CodeFlow webhook and code execution features.
          </p>
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/oauth/authorize?returnUrl=${encodeURIComponent(window.location.origin)}`}
            className="inline-block bg-hubspot-orange hover:bg-hubspot-orange-dark text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Connect HubSpot
          </a>
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
        <Route path="/secrets" element={<Secrets />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/account" element={<Account portal={portal} />} />
      </Routes>
    </Layout>
  )
}

export default App
