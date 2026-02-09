const axios = require('axios');

// Your app credentials
const APP_ID = '29048938';
const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN; // We'll get this from OAuth

async function createWorkflowAction() {
  const actionDefinition = {
    actionUrl: 'https://reena-noncorroborating-readily.ngrok-free.dev/v1/actions/webhook',
    objectTypes: ['CONTACT', 'COMPANY', 'DEAL'],
    published: true,
    labels: {
      en: {
        actionName: 'Send Webhook',
        actionDescription: 'Send data to an external webhook URL'
      }
    },
    inputFields: [
      {
        typeDefinition: {
          name: 'webhookUrl',
          type: 'string',
          fieldType: 'text'
        },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: true,
        labels: {
          en: {
            label: 'Webhook URL',
            description: 'The URL to send the request to'
          }
        }
      },
      {
        typeDefinition: {
          name: 'webhookMethod',
          type: 'enumeration',
          options: [
            { label: 'POST', value: 'POST' },
            { label: 'GET', value: 'GET' },
            { label: 'PUT', value: 'PUT' }
          ]
        },
        supportedValueTypes: ['STATIC_VALUE'],
        isRequired: false,
        labels: {
          en: {
            label: 'HTTP Method',
            description: 'The HTTP method to use'
          }
        }
      }
    ],
    outputFields: [
      {
        typeDefinition: {
          name: 'triops_success',
          type: 'bool'
        },
        labels: {
          en: { label: 'Success' }
        }
      }
    ]
  };

  try {
    // Note: This API requires developer API key, not OAuth token
    // Since hapikey is deprecated, you need to create the action via UI
    console.log('Action definition ready:');
    console.log(JSON.stringify(actionDefinition, null, 2));
    console.log('\n---\nTo create this action, go to:');
    console.log('https://app.hubspot.com/developer-projects/4066240/project/hubspot-triops');
    console.log('\nClick on TriOps app -> Look for "Automation" or "Extensions" section');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createWorkflowAction();
