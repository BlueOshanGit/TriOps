import { useState, useEffect } from 'react'
import { secretsApi } from '../api/client'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/Card'
import Button from '../components/Button'
import { Input, Textarea } from '../components/Input'
import Modal from '../components/Modal'

function Secrets() {
  const [secrets, setSecrets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [creating, setCreating] = useState(false)

  const [newSecret, setNewSecret] = useState({
    name: '',
    value: '',
    description: ''
  })

  useEffect(() => {
    loadSecrets()
  }, [])

  const loadSecrets = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await secretsApi.list()
      setSecrets(data.secrets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newSecret.name || !newSecret.value) {
      setError('Name and value are required')
      return
    }

    try {
      setCreating(true)
      setError(null)
      await secretsApi.create(newSecret)
      setShowCreateModal(false)
      setNewSecret({ name: '', value: '', description: '' })
      loadSecrets()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (name) => {
    try {
      await secretsApi.delete(name)
      setShowDeleteModal(null)
      loadSecrets()
    } catch (err) {
      setError(err.message)
    }
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
          <h1 className="text-2xl font-semibold text-hubspot-dark">Secrets</h1>
          <p className="text-hubspot-gray mt-1">Securely store API keys and sensitive values</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Secret
        </Button>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900">How to use secrets</h3>
            <p className="text-sm text-blue-700 mt-1">
              Access secrets in your code using <code className="bg-blue-100 px-1 rounded">secrets.SECRET_NAME</code>.
              Secret names must be uppercase with underscores only.
            </p>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hubspot-orange mx-auto"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && secrets.length === 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 text-hubspot-border mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h3 className="text-lg font-medium text-hubspot-dark mb-2">No secrets yet</h3>
          <p className="text-hubspot-gray mb-4">Store API keys and other sensitive values securely.</p>
          <Button onClick={() => setShowCreateModal(true)}>Add Secret</Button>
        </Card>
      )}

      {/* Secrets list */}
      {!loading && secrets.length > 0 && (
        <div className="grid gap-4">
          {secrets.map(secret => (
            <Card key={secret._id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono font-medium text-hubspot-dark">{secret.name}</h3>
                  {secret.description && (
                    <p className="text-sm text-hubspot-gray mt-1">{secret.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-hubspot-gray">
                    <span>Created {formatDate(secret.createdAt)}</span>
                    {secret.lastUsedAt && (
                      <span>Last used {formatDate(secret.lastUsedAt)}</span>
                    )}
                    <span>{secret.usageCount} uses</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(secret)}
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setNewSecret({ name: '', value: '', description: '' })
        }}
        title="Add Secret"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Add Secret
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newSecret.name}
            onChange={(value) => setNewSecret({ ...newSecret, name: value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
            placeholder="API_KEY"
            required
          />
          <p className="text-xs text-hubspot-gray -mt-2">
            Uppercase letters, numbers, and underscores only
          </p>
          <Input
            label="Value"
            type="password"
            value={newSecret.value}
            onChange={(value) => setNewSecret({ ...newSecret, value })}
            placeholder="Enter secret value"
            required
          />
          <Textarea
            label="Description (optional)"
            value={newSecret.description}
            onChange={(value) => setNewSecret({ ...newSecret, description: value })}
            placeholder="What is this secret for?"
            rows={2}
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Secret"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete(showDeleteModal?.name)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-hubspot-gray">
          Are you sure you want to delete "{showDeleteModal?.name}"? Any code using this secret will fail.
        </p>
      </Modal>
    </div>
  )
}

export default Secrets
