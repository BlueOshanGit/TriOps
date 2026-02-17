import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { snippetsApi } from '../api/client'
import { Card } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'

function Snippets() {
  const [snippets, setSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadSnippets()
  }, [])

  const loadSnippets = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await snippetsApi.list({ search })
      setSnippets(data.snippets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadSnippets()
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-hubspot-dark">Snippets</h1>
          <p className="text-hubspot-gray mt-1">Reusable code snippets for your workflows</p>
        </div>
        <Link to="/snippets/new">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Snippet
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="flex-1 px-4 py-2 border border-hubspot-border rounded-lg focus:outline-none focus:ring-2 focus:ring-hubspot-blue"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hubspot-orange mx-auto"></div>
          <p className="text-hubspot-gray mt-2">Loading snippets...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && snippets.length === 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 text-hubspot-border mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-hubspot-dark mb-2">No snippets yet</h3>
          <p className="text-hubspot-gray mb-4">Create your first code snippet to use in HubSpot workflows.</p>
          <Link to="/snippets/new">
            <Button>Create Snippet</Button>
          </Link>
        </Card>
      )}

      {/* Snippets list */}
      {!loading && snippets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {snippets.map(snippet => (
            <Link key={snippet._id} to={`/snippets/${snippet._id}`}>
              <Card className="hover:border-hubspot-blue transition-colors cursor-pointer h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-hubspot-dark truncate flex-1 mr-2">{snippet.name}</h3>
                    <Badge variant="info">v{snippet.version}</Badge>
                  </div>
                  {snippet.description && (
                    <p className="text-sm text-hubspot-gray line-clamp-2 mb-3">{snippet.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-hubspot-border/50 text-xs text-hubspot-gray">
                    <span>Updated {formatDate(snippet.updatedAt)}</span>
                    <span>{snippet.executionCount} executions</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Snippets
