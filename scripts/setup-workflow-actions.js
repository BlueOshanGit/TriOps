require('dotenv').config();
const axios = require('axios');

const HUBSPOT_APP_ID = process.env.HUBSPOT_APP_ID;
const HUBSPOT_DEVELOPER_API_KEY = process.env.HUBSPOT_DEVELOPER_API_KEY;
const BASE_URL = process.env.BASE_URL;

const HUBSPOT_API = 'https://api.hubapi.com';

// Workflow action definitions
const actions = [
  {
    actionUrl: `${BASE_URL}/v1/actions/code`,
    published: true,
    labels: {
      en: {
        actionName: 'CodeFlow: Run Code',
        actionDescription: 'Execute custom JavaScript code with access to workflow data and secrets',
        actionCardContent: 'Run code snippet: {{snippetId}}'
      }
    },
    inputFields: [
      {
        typeDefinition: { name: 'snippetId', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'Snippet ID', description: 'The ID of a saved code snippet to execute' } }
      },
      {
        typeDefinition: { name: 'inlineCode', type: 'string', fieldType: 'textarea' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'Inline Code', description: 'JavaScript code to execute' } }
      },
      {
        typeDefinition: { name: 'input1', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Input 1', description: 'Available as inputs.input1 in code' } }
      },
      {
        typeDefinition: { name: 'input2', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Input 2', description: 'Available as inputs.input2 in code' } }
      },
      {
        typeDefinition: { name: 'input3', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Input 3', description: 'Available as inputs.input3 in code' } }
      }
    ],
    outputFields: [
      { typeDefinition: { name: 'codeflow_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'codeflow_error', type: 'string' }, labels: { en: { label: 'Error Message' } } },
      { typeDefinition: { name: 'output1', type: 'string' }, labels: { en: { label: 'Output 1' } } },
      { typeDefinition: { name: 'output2', type: 'string' }, labels: { en: { label: 'Output 2' } } },
      { typeDefinition: { name: 'output3', type: 'string' }, labels: { en: { label: 'Output 3' } } }
    ]
  },
  {
    actionUrl: `${BASE_URL}/v1/actions/webhook`,
    published: true,
    labels: {
      en: {
        actionName: 'CodeFlow: Send Webhook',
        actionDescription: 'Send an HTTP request to any URL with dynamic data',
        actionCardContent: 'Send webhook to {{webhookUrl}}'
      }
    },
    inputFields: [
      {
        typeDefinition: { name: 'webhookUrl', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE', 'OBJECT_PROPERTY'],
        isRequired: true,
        labels: { en: { label: 'Webhook URL', description: 'The URL to send the request to' } }
      },
      {
        typeDefinition: {
          name: 'webhookMethod',
          type: 'enumeration',
          fieldType: 'select',
          options: [
            { value: 'POST', label: 'POST' },
            { value: 'GET', label: 'GET' },
            { value: 'PUT', label: 'PUT' },
            { value: 'PATCH', label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' }
          ]
        },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'HTTP Method', description: 'Defaults to POST' } }
      },
      {
        typeDefinition: { name: 'webhookHeaders', type: 'string', fieldType: 'textarea' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'Headers (JSON)', description: 'Custom headers as JSON object' } }
      },
      {
        typeDefinition: { name: 'webhookBody', type: 'string', fieldType: 'textarea' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'Request Body (JSON)', description: 'The request body as JSON' } }
      }
    ],
    outputFields: [
      { typeDefinition: { name: 'codeflow_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'codeflow_status_code', type: 'number' }, labels: { en: { label: 'HTTP Status Code' } } },
      { typeDefinition: { name: 'codeflow_error', type: 'string' }, labels: { en: { label: 'Error Message' } } }
    ]
  }
];

async function createWorkflowAction(action) {
  try {
    const response = await axios.post(
      `${HUBSPOT_API}/automation/v4/actions/${HUBSPOT_APP_ID}`,
      action,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_DEVELOPER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✓ Created action: ${action.labels.en.actionName}`);
    console.log(`  Action ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`→ Action already exists: ${action.labels.en.actionName}`);
      return null;
    }
    console.error(`✗ Failed to create ${action.labels.en.actionName}:`, error.response?.data || error.message);
    throw error;
  }
}

async function listExistingActions() {
  try {
    const response = await axios.get(
      `${HUBSPOT_API}/automation/v4/actions/${HUBSPOT_APP_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_DEVELOPER_API_KEY}`
        }
      }
    );
    return response.data.results || [];
  } catch (error) {
    console.error('Failed to list actions:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('===========================================');
  console.log('  CodeFlow - Workflow Actions Setup');
  console.log('===========================================\n');

  // Validate environment
  if (!HUBSPOT_APP_ID) {
    console.error('Error: HUBSPOT_APP_ID is not set in .env');
    process.exit(1);
  }

  if (!HUBSPOT_DEVELOPER_API_KEY) {
    console.error('Error: HUBSPOT_DEVELOPER_API_KEY is not set in .env');
    console.log('\nTo get your Developer API Key:');
    console.log('1. Go to https://app.hubspot.com/developer/YOUR_DEV_ACCOUNT_ID/api-key');
    console.log('2. Create or copy your Developer API Key');
    console.log('3. Add to .env: HUBSPOT_DEVELOPER_API_KEY=your_key_here\n');
    process.exit(1);
  }

  if (!BASE_URL) {
    console.error('Error: BASE_URL is not set in .env');
    process.exit(1);
  }

  console.log(`App ID: ${HUBSPOT_APP_ID}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Check existing actions
  console.log('Checking existing actions...');
  const existing = await listExistingActions();
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing action(s):`);
    existing.forEach(a => console.log(`  - ${a.labels?.en?.actionName || a.id}`));
    console.log('');
  }

  // Create actions
  console.log('Creating workflow actions...\n');
  for (const action of actions) {
    await createWorkflowAction(action);
  }

  console.log('\n===========================================');
  console.log('  Setup Complete!');
  console.log('===========================================');
  console.log('\nNext steps:');
  console.log('1. Go to your HubSpot workflow');
  console.log('2. Add a new action');
  console.log('3. Look for "CodeFlow: Run Code" or "CodeFlow: Send Webhook"');
  console.log('4. Configure with your snippet ID or webhook URL\n');
}

main().catch(console.error);
