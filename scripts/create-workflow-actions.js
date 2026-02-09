require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const APP_ID = process.env.HUBSPOT_APP_ID;
const DEVELOPER_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = process.env.BASE_URL;

async function createWorkflowActions() {
  console.log('Creating workflow actions for App ID:', APP_ID);
  console.log('Using Base URL:', BASE_URL);

  const actions = [
    {
      actionUrl: `${BASE_URL}/v1/actions/webhook`,
      objectTypes: ['CONTACT', 'COMPANY', 'DEAL'],
      published: true,
      labels: {
        en: {
          actionName: 'Send Webhook',
          actionDescription: 'Send data to an external webhook URL',
          actionCardContent: 'Send webhook request'
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
              description: 'The HTTP method to use (default: POST)'
            }
          }
        },
        {
          typeDefinition: {
            name: 'webhookBody',
            type: 'string',
            fieldType: 'textarea'
          },
          supportedValueTypes: ['STATIC_VALUE'],
          isRequired: false,
          labels: {
            en: {
              label: 'Request Body (JSON)',
              description: 'Custom JSON body to send'
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
        },
        {
          typeDefinition: {
            name: 'triops_status_code',
            type: 'number'
          },
          labels: {
            en: { label: 'HTTP Status Code' }
          }
        },
        {
          typeDefinition: {
            name: 'triops_error',
            type: 'string'
          },
          labels: {
            en: { label: 'Error Message' }
          }
        }
      ]
    },
    {
      actionUrl: `${BASE_URL}/v1/actions/code`,
      objectTypes: ['CONTACT', 'COMPANY', 'DEAL'],
      published: true,
      labels: {
        en: {
          actionName: 'Run Code',
          actionDescription: 'Execute custom JavaScript code',
          actionCardContent: 'Run custom code'
        }
      },
      inputFields: [
        {
          typeDefinition: {
            name: 'snippetId',
            type: 'string',
            fieldType: 'text'
          },
          supportedValueTypes: ['STATIC_VALUE'],
          isRequired: false,
          labels: {
            en: {
              label: 'Snippet ID',
              description: 'ID of a saved code snippet'
            }
          }
        },
        {
          typeDefinition: {
            name: 'inlineCode',
            type: 'string',
            fieldType: 'textarea'
          },
          supportedValueTypes: ['STATIC_VALUE'],
          isRequired: false,
          labels: {
            en: {
              label: 'Inline Code',
              description: 'JavaScript code to execute'
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
        },
        {
          typeDefinition: {
            name: 'triops_error',
            type: 'string'
          },
          labels: {
            en: { label: 'Error Message' }
          }
        }
      ]
    },
    {
      actionUrl: `${BASE_URL}/v1/actions/format`,
      objectTypes: ['CONTACT', 'COMPANY', 'DEAL', 'TICKET'],
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
          labels: {
            en: {
              label: 'Formula',
              description: 'Use {{property}} for values. Functions: concat(), upper(), lower(), trim(), if(), round(), +, -, *, /'
            }
          }
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
        { typeDefinition: { name: 'triops_success', type: 'bool' }, labels: { en: { label: 'Success' } } },
        { typeDefinition: { name: 'triops_error', type: 'string' }, labels: { en: { label: 'Error Message' } } },
        { typeDefinition: { name: 'result', type: 'string' }, labels: { en: { label: 'Formula Result' } } },
        { typeDefinition: { name: 'result_number', type: 'number' }, labels: { en: { label: 'Result (Number)' } } }
      ]
    }
  ];

  for (const action of actions) {
    try {
      console.log(`\nCreating action: ${action.labels.en.actionName}`);

      const response = await axios.post(
        `https://api.hubapi.com/automation/v4/actions/${APP_ID}`,
        action,
        {
          headers: {
            'Authorization': `Bearer ${DEVELOPER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Success! Action ID:', response.data.id);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error creating action:', error.response?.data || error.message);

      // Try with hapikey as fallback
      try {
        console.log('Trying with hapikey...');
        const response = await axios.post(
          `https://api.hubapi.com/automation/v4/actions/${APP_ID}?hapikey=${DEVELOPER_API_KEY}`,
          action,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Success with hapikey! Action ID:', response.data.id);
      } catch (err2) {
        console.error('Failed with hapikey too:', err2.response?.data || err2.message);
      }
    }
  }
}

createWorkflowActions().then(() => {
  console.log('\nDone!');
}).catch(err => {
  console.error('Script error:', err);
});
