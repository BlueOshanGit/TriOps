import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { snippetsApi } from '../api/client'
import { Card, CardHeader, CardTitle } from '../components/Card'
import Button from '../components/Button'
import { Input, Textarea } from '../components/Input'
import CodeEditor from '../components/CodeEditor'
import Modal from '../components/Modal'

const DEFAULT_CODE = `// Available globals:
// - inputs: Object with input field values
// - secrets: Object with decrypted secrets (e.g., secrets.API_KEY)
// - context: HubSpot workflow context (object, workflow info)
// - output: Object to set return values
// - console: log, info, warn, error methods

// Example: Process input and set output
const name = inputs.input1 || 'World';
output.greeting = \`Hello, \${name}!\`;
output.timestamp = new Date().toISOString();

console.log('Snippet executed successfully');
`

function SnippetEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const [snippet, setSnippet] = useState({
    name: '',
    description: '',
    code: DEFAULT_CODE
  })

  const [testInputs, setTestInputs] = useState({
    input1: '',
    input2: '',
    input3: ''
  })

  useEffect(() => {
    if (!isNew) {
      loadSnippet()
    }
  }, [id])

  const loadSnippet = async () => {
    try {
      setLoading(true)
      const { data } = await snippetsApi.get(id)
      setSnippet(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!snippet.name.trim()) {
      setError('Name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (isNew) {
        await snippetsApi.create(snippet)
      } else {
        await snippetsApi.update(id, snippet)
      }
      navigate('/snippets')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await snippetsApi.delete(id)
      navigate('/snippets')
    } catch (err) {
      setError(err.message)
    }
    setShowDeleteModal(false)
  }

  const handleTest = async () => {
    try {
      setTesting(true)
      setTestResult(null)
      const { data } = await snippetsApi.test(id, testInputs)
      setTestResult(data)
    } catch (err) {
      setTestResult({ success: false, error: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hubspot-orange mx-auto"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/snippets')} className="text-hubspot-gray hover:text-hubspot-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-hubspot-dark">
            {isNew ? 'New Snippet' : 'Edit Snippet'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Delete
            </Button>
          )}
          <Button onClick={handleSave} loading={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Input
              label="Name"
              value={snippet.name}
              onChange={(value) => setSnippet({ ...snippet, name: value })}
              placeholder="My Snippet"
              required
              className="mb-4"
            />
            <Textarea
              label="Description"
              value={snippet.description}
              onChange={(value) => setSnippet({ ...snippet, description: value })}
              placeholder="What does this snippet do?"
              rows={2}
            />
          </Card>

          <Card padding={false}>
            <div className="px-6 py-4 border-b border-hubspot-border">
              <h3 className="font-medium text-hubspot-dark">Code</h3>
            </div>
            <CodeEditor
              value={snippet.code}
              onChange={(value) => setSnippet({ ...snippet, code: value })}
              height="400px"
            />
          </Card>

          {/* Snippet ID for workflows */}
          {!isNew && (
            <Card>
              <h3 className="font-medium text-hubspot-dark mb-2">Snippet ID</h3>
              <p className="text-sm text-hubspot-gray mb-2">Use this ID in HubSpot workflows:</p>
              <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {id}
              </code>
            </Card>
          )}
        </div>

        {/* Test Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Snippet</CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <Input
                label="Input 1"
                value={testInputs.input1}
                onChange={(value) => setTestInputs({ ...testInputs, input1: value })}
                placeholder="Test value"
              />
              <Input
                label="Input 2"
                value={testInputs.input2}
                onChange={(value) => setTestInputs({ ...testInputs, input2: value })}
                placeholder="Test value"
              />
              <Input
                label="Input 3"
                value={testInputs.input3}
                onChange={(value) => setTestInputs({ ...testInputs, input3: value })}
                placeholder="Test value"
              />

              <Button
                onClick={handleTest}
                loading={testing}
                disabled={isNew}
                className="w-full"
                variant="secondary"
              >
                {testing ? 'Running...' : 'Run Test'}
              </Button>
            </div>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                  {testResult.success ? 'Success' : 'Error'}
                </CardTitle>
              </CardHeader>

              {testResult.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
                  {testResult.error}
                </div>
              )}

              {testResult.output && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-hubspot-dark mb-2">Output</h4>
                  <pre className="bg-gray-100 px-3 py-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(testResult.output, null, 2)}
                  </pre>
                </div>
              )}

              {testResult.consoleOutput && testResult.consoleOutput.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-hubspot-dark mb-2">Console</h4>
                  <div className="bg-gray-900 text-gray-100 px-3 py-2 rounded text-sm font-mono overflow-auto max-h-40">
                    {testResult.consoleOutput.map((log, i) => (
                      <div key={i} className={`${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : ''}`}>
                        [{log.level}] {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testResult.executionTimeMs !== undefined && (
                <p className="text-xs text-hubspot-gray mt-4">
                  Executed in {testResult.executionTimeMs}ms
                </p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Snippet"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-hubspot-gray">
          Are you sure you want to delete "{snippet.name}"? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

export default SnippetEditor
