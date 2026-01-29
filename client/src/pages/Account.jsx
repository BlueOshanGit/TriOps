import { Card, CardHeader, CardTitle, CardDescription } from '../components/Card'
import Button from '../components/Button'
import { setToken } from '../api/client'

function Account({ portal }) {
  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect this HubSpot portal?')) {
      setToken(null)
      window.location.href = '/'
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-hubspot-dark">Account</h1>
        <p className="text-hubspot-gray mt-1">Manage your CodeFlow connection</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Portal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Portal</CardTitle>
            <CardDescription>Your HubSpot portal connection details</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-hubspot-border">
              <span className="text-hubspot-gray">Portal ID</span>
              <span className="font-medium text-hubspot-dark">{portal?.portalId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-hubspot-border">
              <span className="text-hubspot-gray">Hub Domain</span>
              <span className="font-medium text-hubspot-dark">{portal?.hubDomain || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-hubspot-border">
              <span className="text-hubspot-gray">User Email</span>
              <span className="font-medium text-hubspot-dark">{portal?.userEmail || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-hubspot-border">
              <span className="text-hubspot-gray">Connected Since</span>
              <span className="font-medium text-hubspot-dark">
                {portal?.installedAt ? formatDate(portal.installedAt) : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-hubspot-gray">Last Activity</span>
              <span className="font-medium text-hubspot-dark">
                {portal?.lastActivityAt ? formatDate(portal.lastActivityAt) : '-'}
              </span>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your CodeFlow settings</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-hubspot-border">
              <div>
                <span className="text-hubspot-dark font-medium">Webhook Timeout</span>
                <p className="text-sm text-hubspot-gray">Maximum time for webhook requests</p>
              </div>
              <span className="font-medium text-hubspot-dark">
                {(portal?.settings?.webhookTimeout || 30000) / 1000}s
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-hubspot-border">
              <div>
                <span className="text-hubspot-dark font-medium">Code Timeout</span>
                <p className="text-sm text-hubspot-gray">Maximum code execution time</p>
              </div>
              <span className="font-medium text-hubspot-dark">
                {(portal?.settings?.codeTimeout || 10000) / 1000}s
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-hubspot-border">
              <div>
                <span className="text-hubspot-dark font-medium">Max Snippets</span>
                <p className="text-sm text-hubspot-gray">Maximum number of code snippets</p>
              </div>
              <span className="font-medium text-hubspot-dark">
                {portal?.settings?.maxSnippets || 100}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="text-hubspot-dark font-medium">Max Secrets</span>
                <p className="text-sm text-hubspot-gray">Maximum number of stored secrets</p>
              </div>
              <span className="font-medium text-hubspot-dark">
                {portal?.settings?.maxSecrets || 50}
              </span>
            </div>
          </div>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Learn how to use CodeFlow in your workflows</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="p-4 bg-hubspot-light rounded-lg">
              <h4 className="font-medium text-hubspot-dark mb-2">Using Code Snippets</h4>
              <pre className="text-sm text-hubspot-gray bg-white p-3 rounded border border-hubspot-border overflow-auto">
{`// Access inputs from workflow
const email = inputs.input1;

// Use stored secrets
const apiKey = secrets.API_KEY;

// Set output values
output.result = "processed";
output.timestamp = Date.now();`}
              </pre>
            </div>

            <div className="p-4 bg-hubspot-light rounded-lg">
              <h4 className="font-medium text-hubspot-dark mb-2">Available Globals</h4>
              <ul className="text-sm text-hubspot-gray space-y-1">
                <li><code className="bg-white px-1 rounded">inputs</code> - Input field values from workflow</li>
                <li><code className="bg-white px-1 rounded">secrets</code> - Your stored secrets (API keys, etc.)</li>
                <li><code className="bg-white px-1 rounded">context</code> - HubSpot object and workflow info</li>
                <li><code className="bg-white px-1 rounded">output</code> - Object to set return values</li>
                <li><code className="bg-white px-1 rounded">console</code> - Log messages (viewable in logs)</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-hubspot-dark font-medium">Disconnect Portal</span>
              <p className="text-sm text-hubspot-gray">Remove this HubSpot connection</p>
            </div>
            <Button variant="danger" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Account
