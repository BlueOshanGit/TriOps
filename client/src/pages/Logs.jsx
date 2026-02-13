import { useState, useEffect } from 'react'
import { logsApi } from '../api/client'
import { Card } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [filters, setFilters] = useState({
    actionType: '',
    status: '',
    limit: 50
  })

  useEffect(() => {
    let cancelled = false

    const loadLogs = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = {}
        if (filters.actionType) params.actionType = filters.actionType
        if (filters.status) params.status = filters.status
        params.limit = filters.limit

        const { data } = await logsApi.list(params)
        if (!cancelled) {
          setLogs(data.logs || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLogs()
    return () => { cancelled = true }
  }, [filters])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (filters.actionType) params.actionType = filters.actionType
      if (filters.status) params.status = filters.status
      params.limit = filters.limit

      const { data } = await logsApi.list(params)
      setLogs(data.logs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      success: 'success',
      error: 'error',
      timeout: 'warning'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const getActionIcon = (type) => {
    if (type === 'webhook') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-hubspot-dark">Execution Logs</h1>
          <p className="text-hubspot-gray mt-1">View webhook and code execution history</p>
        </div>
        <Button variant="secondary" onClick={loadLogs}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-hubspot-dark mb-1">Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
              className="px-3 py-2 border border-hubspot-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hubspot-blue"
            >
              <option value="">All</option>
              <option value="webhook">Webhook</option>
              <option value="code">Code</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-hubspot-dark mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-hubspot-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hubspot-blue"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-hubspot-dark mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="px-3 py-2 border border-hubspot-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hubspot-blue"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </Card>

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
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 text-hubspot-border mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-hubspot-dark mb-2">No logs yet</h3>
          <p className="text-hubspot-gray">Execution logs will appear here when workflows run.</p>
        </Card>
      )}

      {/* Logs list */}
      {!loading && logs.length > 0 && (
        <div className="bg-white rounded-lg border border-hubspot-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-hubspot-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-hubspot-gray uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-hubspot-gray uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-hubspot-gray uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-hubspot-gray uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-hubspot-gray uppercase">Duration</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hubspot-border">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-hubspot-gray">
                      {getActionIcon(log.actionType)}
                      <span className="capitalize">{log.actionType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-hubspot-dark truncate max-w-xs">
                      {log.snippetName || log.webhookUrl || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-hubspot-gray">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-hubspot-gray">
                    {log.executionTimeMs}ms
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Execution Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Type</label>
                <p className="font-medium capitalize">{selectedLog.actionType}</p>
              </div>
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Status</label>
                <p>{getStatusBadge(selectedLog.status)}</p>
              </div>
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Duration</label>
                <p className="font-medium">{selectedLog.executionTimeMs}ms</p>
              </div>
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Time</label>
                <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
              </div>
            </div>

            {selectedLog.webhookUrl && (
              <div>
                <label className="text-xs text-hubspot-gray uppercase">URL</label>
                <p className="font-mono text-sm break-all">{selectedLog.webhookUrl}</p>
              </div>
            )}

            {selectedLog.snippetName && (
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Snippet</label>
                <p className="font-medium">{selectedLog.snippetName}</p>
              </div>
            )}

            {selectedLog.errorMessage && (
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Error</label>
                <pre className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm overflow-auto max-h-32">
                  {selectedLog.errorMessage}
                </pre>
              </div>
            )}

            {selectedLog.outputData && (
              <div>
                <label className="text-xs text-hubspot-gray uppercase">Output</label>
                <pre className="bg-gray-100 px-3 py-2 rounded text-sm overflow-auto max-h-32">
                  {JSON.stringify(selectedLog.outputData, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.httpStatusCode && (
              <div>
                <label className="text-xs text-hubspot-gray uppercase">HTTP Status</label>
                <p className="font-medium">{selectedLog.httpStatusCode}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Logs
