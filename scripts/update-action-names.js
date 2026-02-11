require('dotenv').config();
const axios = require('axios');

const HUBSPOT_APP_ID = process.env.HUBSPOT_APP_ID;
const HUBSPOT_DEVELOPER_API_KEY = process.env.HUBSPOT_DEVELOPER_API_KEY;
const BASE_URL = process.env.BASE_URL;
const HUBSPOT_API = 'https://api.hubapi.com';

// Map old action names to new desired names
const NAME_MAP = {
  'CodeFlow: Send Webhook': 'Send Webhook',
  'CodeFlow: Format Data': 'Format Data',
  'CodeFlow: Run Code': 'Run Code',
  'CodeFlow: Custom Formula': 'Format Data: Custom Mode',
  // In case they don't have "CodeFlow:" prefix
  'Custom Formula': 'Format Data: Custom Mode',
};

async function listActions() {
  const response = await axios.get(
    `${HUBSPOT_API}/automation/v4/actions/${HUBSPOT_APP_ID}?hapikey=${HUBSPOT_DEVELOPER_API_KEY}`,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.results || [];
}

async function updateAction(actionId, actionData) {
  const response = await axios.patch(
    `${HUBSPOT_API}/automation/v4/actions/${HUBSPOT_APP_ID}/${actionId}?hapikey=${HUBSPOT_DEVELOPER_API_KEY}`,
    actionData,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

async function main() {
  console.log('===========================================');
  console.log('  Update Workflow Action Names');
  console.log('===========================================\n');
  console.log(`App ID: ${HUBSPOT_APP_ID}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // List existing actions
  console.log('Fetching existing actions...\n');
  const actions = await listActions();

  if (actions.length === 0) {
    console.log('No actions found.');
    return;
  }

  console.log(`Found ${actions.length} action(s):\n`);
  for (const action of actions) {
    const currentName = action.labels?.en?.actionName || 'Unknown';
    const newName = NAME_MAP[currentName];

    console.log(`  ID: ${action.id}`);
    console.log(`  Current name: ${currentName}`);

    if (newName) {
      console.log(`  New name: ${newName}`);
      try {
        await updateAction(action.id, {
          labels: {
            ...action.labels,
            en: {
              ...action.labels?.en,
              actionName: newName
            }
          }
        });
        console.log(`  Status: UPDATED\n`);
      } catch (error) {
        console.error(`  Status: FAILED - ${error.response?.data?.message || error.message}\n`);
      }
    } else {
      console.log(`  Status: Already correct (no change needed)\n`);
    }
  }

  console.log('===========================================');
  console.log('  Done! Refresh HubSpot to see changes.');
  console.log('===========================================\n');
  console.log('Also update the app name in HubSpot developer portal:');
  console.log('1. Go to app.hubspot.com/developer → Apps → CodeFlow');
  console.log('2. Basic Info → Change name from "CodeFlow" to "TriOps"');
  console.log('3. Save\n');
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});
