import { useState, useEffect } from 'react'
import { usageApi } from '../api/client'
import { Card, CardHeader, CardTitle } from '../components/Card'

function Usage() {
  const [usage, setUsage] = useState(null)
  const [resources, setResources] = useState(null)
  const [topSnippets, setTopSnippets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadData()
  }, [days])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [usageRes, resourcesRes, snippetsRes] = await Promise.all([
        usageApi.get(days),
        usageApi.getResources(),
        usageApi.getTopSnippets()
      ])
      setUsage(usageRes.data || {})
      setResources(resourcesRes.data || null)
      setTopSnippets(snippetsRes.data?.snippets || [])
    } catch (err) {
      console.error('Usage data load error:', err)
      setError(err.message || 'Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hubspot-orange mx-auto"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-hubspot-dark">Usage</h1>
          <p className="text-hubspot-gray mt-1">Monitor your TriOps usage and limits</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-3 py-2 border border-hubspot-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hubspot-blue"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Executions"
          value={usage?.totals?.totalExecutions || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="Success Rate"
          value={`${usage?.totals?.successRate || 0}%`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Webhooks"
          value={usage?.totals?.webhookExecutions || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Code Executions"
          value={usage?.totals?.codeExecutions || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Limits</CardTitle>
          </CardHeader>

          {resources ? (
            <div className="space-y-4">
              <ResourceBar
                label="Snippets"
                current={resources.snippets?.current || 0}
                limit={resources.snippets?.limit || 100}
                percent={resources.snippets?.percentUsed || 0}
              />
              <ResourceBar
                label="Secrets"
                current={resources.secrets?.current || 0}
                limit={resources.secrets?.limit || 50}
                percent={resources.secrets?.percentUsed || 0}
              />
            </div>
          ) : (
            <p className="text-hubspot-gray text-sm">No resource data available</p>
          )}
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-hubspot-gray">Avg Execution Time</span>
              <span className="font-medium">{usage?.totals?.avgExecutionTimeMs || 0}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-hubspot-gray">Errors</span>
              <span className="font-medium text-red-600">{usage?.totals?.errorCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-hubspot-gray">Timeouts</span>
              <span className="font-medium text-yellow-600">{usage?.totals?.timeoutCount || 0}</span>
            </div>
          </div>
        </Card>

        {/* Top Snippets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Snippets</CardTitle>
          </CardHeader>

          {topSnippets.length === 0 ? (
            <p className="text-hubspot-gray text-sm">No snippet executions yet</p>
          ) : (
            <div className="space-y-3">
              {topSnippets.slice(0, 5).map((snippet, i) => (
                <div key={snippet._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-hubspot-light flex items-center justify-center text-xs text-hubspot-gray">
                      {i + 1}
                    </span>
                    <span className="font-medium text-hubspot-dark">{snippet.name}</span>
                  </div>
                  <span className="text-hubspot-gray">{snippet.executionCount} executions</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Daily Chart */}
        {usage?.dailyUsage && usage.dailyUsage.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Executions</CardTitle>
            </CardHeader>

            <div className="h-48 flex items-end gap-1">
              {usage.dailyUsage.map((day, i) => {
                const total = (day.webhookExecutions || 0) + (day.codeExecutions || 0)
                const maxTotal = Math.max(...usage.dailyUsage.map(d => (d.webhookExecutions || 0) + (d.codeExecutions || 0)), 1)
                const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end"
                    title={`${day.date ? new Date(day.date).toLocaleDateString() : 'Unknown'}: ${total} executions`}
                  >
                    <div
                      className="bg-hubspot-orange rounded-t transition-all hover:bg-hubspot-orange-dark"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-hubspot-gray">
              <span>{usage.dailyUsage[0]?.date ? new Date(usage.dailyUsage[0].date).toLocaleDateString() : ''}</span>
              <span>{usage.dailyUsage[usage.dailyUsage.length - 1]?.date ? new Date(usage.dailyUsage[usage.dailyUsage.length - 1].date).toLocaleDateString() : ''}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color = 'orange' }) {
  const colors = {
    orange: 'bg-hubspot-orange/10 text-hubspot-orange',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-hubspot-gray">{title}</p>
          <p className="text-2xl font-semibold text-hubspot-dark mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

function ResourceBar({ label, current, limit, percent }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-hubspot-gray">{label}</span>
        <span className="text-hubspot-dark font-medium">{current} / {limit}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-hubspot-blue'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default Usage
