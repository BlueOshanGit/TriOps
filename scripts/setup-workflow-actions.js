require('dotenv').config();
const axios = require('axios');

const HUBSPOT_APP_ID = process.env.HUBSPOT_APP_ID;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = process.env.BASE_URL;

const HUBSPOT_API = 'https://api.hubapi.com';

// Workflow action definitions
const actions = [
  {
    actionUrl: `${BASE_URL}/v1/actions/code`,
    published: true,
    labels: {
      en: {
        actionName: 'Run Code',
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
      { typeDefinition: { name: 'hubhacks_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'hubhacks_error', type: 'string' }, labels: { en: { label: 'Error Message' } } },
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
        actionName: 'Send Webhook',
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
      { typeDefinition: { name: 'hubhacks_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'hubhacks_status_code', type: 'number' }, labels: { en: { label: 'HTTP Status Code' } } },
      { typeDefinition: { name: 'hubhacks_error', type: 'string' }, labels: { en: { label: 'Error Message' } } }
    ]
  },
  {
    actionUrl: `${BASE_URL}/v1/actions/format`,
    published: true,
    labels: {
      en: {
        actionName: 'Format Data',
        actionDescription: 'Format and transform data - text, numbers, dates, and calculations',
        actionCardContent: 'Format: {{operation}}'
      }
    },
    inputFields: [
      {
        typeDefinition: {
          name: 'operation',
          type: 'enumeration',
          fieldType: 'select',
          options: [
            { value: 'uppercase', label: 'Text: UPPERCASE' },
            { value: 'lowercase', label: 'Text: lowercase' },
            { value: 'capitalize', label: 'Text: Capitalize Each Word' },
            { value: 'trim', label: 'Text: Trim Whitespace' },
            { value: 'concat', label: 'Text: Concatenate' },
            { value: 'substring', label: 'Text: Extract Substring' },
            { value: 'replace', label: 'Text: Find & Replace' },
            { value: 'split', label: 'Text: Split by Delimiter' },
            { value: 'length', label: 'Text: Get Length' },
            { value: 'number_format', label: 'Number: Format with Decimals' },
            { value: 'currency', label: 'Number: Format as Currency' },
            { value: 'percentage', label: 'Number: Format as Percentage' },
            { value: 'round', label: 'Number: Round' },
            { value: 'floor', label: 'Number: Round Down' },
            { value: 'ceil', label: 'Number: Round Up' },
            { value: 'abs', label: 'Number: Absolute Value' },
            { value: 'add', label: 'Math: Add' },
            { value: 'subtract', label: 'Math: Subtract' },
            { value: 'multiply', label: 'Math: Multiply' },
            { value: 'divide', label: 'Math: Divide' },
            { value: 'date_format', label: 'Date: Format' },
            { value: 'date_add', label: 'Date: Add Days' },
            { value: 'date_subtract', label: 'Date: Subtract Days' },
            { value: 'date_diff', label: 'Date: Days Between' },
            { value: 'now', label: 'Date: Current Date/Time' },
            { value: 'json_get', label: 'JSON: Get Value' },
            { value: 'json_stringify', label: 'JSON: Convert to String' },
            { value: 'json_parse', label: 'JSON: Parse String' },
            { value: 'default_value', label: 'Logic: Default Value (if empty)' },
            { value: 'conditional', label: 'Logic: If/Then/Else' }
          ]
        },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: true,
        labels: { en: { label: 'Operation', description: 'The formatting operation to perform' } }
      },
      {
        typeDefinition: { name: 'input1', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: true,
        labels: { en: { label: 'Input Value', description: 'The primary value to format or transform' } }
      },
      {
        typeDefinition: { name: 'input2', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Second Value / Parameter', description: 'Second value for concat, math, find/replace, etc.' } }
      },
      {
        typeDefinition: { name: 'input3', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Third Value / Parameter', description: 'Third value for conditional, replace, etc.' } }
      },
      {
        typeDefinition: { name: 'formatOptions', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: { en: { label: 'Format Options', description: 'Additional options: decimal places, currency code, date format, etc.' } }
      }
    ],
    outputFields: [
      { typeDefinition: { name: 'hubhacks_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'hubhacks_error', type: 'string' }, labels: { en: { label: 'Error Message' } } },
      { typeDefinition: { name: 'result', type: 'string' }, labels: { en: { label: 'Formatted Result' } } },
      { typeDefinition: { name: 'result_number', type: 'number' }, labels: { en: { label: 'Result (Number)' } } }
    ]
  },
  {
    actionUrl: `${BASE_URL}/v1/actions/format`,
    published: true,
    labels: {
      en: {
        actionName: 'Format Data: Custom Mode',
        actionDescription: 'Write custom formulas to transform data using functions, math, and property values',
        actionCardContent: 'Custom formula'
      }
    },
    inputFields: [
      {
        typeDefinition: { name: 'formula', type: 'string', fieldType: 'textarea' },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: true,
        labels: { en: { label: 'Formula', description: 'Use {{property}} for values. Functions: concat(), upper(), lower(), trim(), if(), round(), +, -, *, /' } }
      },
      {
        typeDefinition: { name: 'input1', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Property 1', description: 'Select a property. Use as [[input1]] in your formula' } }
      },
      {
        typeDefinition: { name: 'input2', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Property 2', description: 'Select a property. Use as [[input2]] in your formula' } }
      },
      {
        typeDefinition: { name: 'input3', type: 'string', fieldType: 'text' },
        supportedValueTypes: ['OBJECT_PROPERTY'],
        isRequired: false,
        labels: { en: { label: 'Property 3', description: 'Select a property. Use as [[input3]] in your formula' } }
      }
    ],
    outputFields: [
      { typeDefinition: { name: 'hubhacks_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
      { typeDefinition: { name: 'hubhacks_error', type: 'string' }, labels: { en: { label: 'Error Message' } } },
      { typeDefinition: { name: 'result', type: 'string' }, labels: { en: { label: 'Formula Result' } } },
      { typeDefinition: { name: 'result_number', type: 'number' }, labels: { en: { label: 'Result (Number)' } } }
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
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
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
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`
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
  console.log('  HubHacks - Workflow Actions Setup');
  console.log('===========================================\n');

  // Validate environment
  if (!HUBSPOT_APP_ID) {
    console.error('Error: HUBSPOT_APP_ID is not set in .env');
    process.exit(1);
  }

  if (!HUBSPOT_API_KEY) {
    console.error('Error: HUBSPOT_API_KEY is not set in .env');
    console.log('\nTo get your Developer API Key:');
    console.log('1. Go to https://app.hubspot.com/developer/YOUR_DEV_ACCOUNT_ID/api-key');
    console.log('2. Create or copy your Developer API Key');
    console.log('3. Add to .env: HUBSPOT_API_KEY=your_key_here\n');
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
  console.log('3. Look for "Send Webhook", "Format Data", "Format Data: Custom Mode", or "Run Code" under HubHacks');
  console.log('4. Configure with your snippet ID, webhook URL, or formula\n');
}

main().catch(console.error);
