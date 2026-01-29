
  Your Configuration Summary                                                                            ┌────────────────────┬───────────────────────────────────────────────────────┐
  │      Setting       │                         Value                         │
  ├────────────────────┼───────────────────────────────────────────────────────┤
  │ Local URL          │ http://localhost:3100                                 │
  ├────────────────────┼───────────────────────────────────────────────────────┤
  │ Public URL (ngrok) │ https://reena-noncorroborating-readily.ngrok-free.dev │
  ├────────────────────┼───────────────────────────────────────────────────────┤
  │ HubSpot App ID     │ 29048938                                              │
  └────────────────────┴───────────────────────────────────────────────────────┘

  Step 1: Start Your App

  cd C:\Users\Srikumaran\Desktop\hubspot-codeflow
  npm run dev

  You should see:
  CodeFlow server running on port 3100
  Environment: development

  Step 2: Start ngrok (if not running)

  ngrok http 3100

  Make sure your ngrok URL https://reena-noncorroborating-readily.ngrok-free.dev is forwarding to port
   3100.

  Step 3: Register Workflow Actions in HubSpot

  1. Go to: https://developers.hubspot.com/
  2. Click Manage apps → Select your app (ID: 29048938)
  3. Go to Features → Automation → Custom workflow actions
  4. Click Create action

  Create Webhook Action:
  ┌─────────────┬──────────────────────────────────────────────────────────────────────────┐
  │    Field    │                                  Value                                   │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Action name │ CodeFlow: Send Webhook                                                   │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Action URL  │ https://reena-noncorroborating-readily.ngrok-free.dev/v1/actions/webhook │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Description │ Send HTTP request with retry support                                     │
  └─────────────┴──────────────────────────────────────────────────────────────────────────┘
  Input Fields to add:
  ┌────────────────┬──────────────────────────────────────────┬──────────┐
  │   Field Name   │                   Type                   │ Required │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ webhookUrl     │ Text                                     │ Yes      │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ webhookMethod  │ Dropdown (GET, POST, PUT, PATCH, DELETE) │ Yes      │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ webhookHeaders │ Text area                                │ No       │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ webhookBody    │ Text area                                │ No       │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ retryEnabled   │ Checkbox                                 │ No       │
  ├────────────────┼──────────────────────────────────────────┼──────────┤
  │ maxRetries     │ Number                                   │ No       │
  └────────────────┴──────────────────────────────────────────┴──────────┘
  Output Fields to add:
  ┌───────────────────────┬─────────┐
  │      Field Name       │  Type   │
  ├───────────────────────┼─────────┤
  │ codeflow_success      │ Boolean │
  ├───────────────────────┼─────────┤
  │ codeflow_status_code  │ Number  │
  ├───────────────────────┼─────────┤
  │ codeflow_retries_used │ Number  │
  ├───────────────────────┼─────────┤
  │ codeflow_error        │ String  │
  └───────────────────────┴─────────┘
  ---
  Create Code Action:
  ┌─────────────┬───────────────────────────────────────────────────────────────────────┐
  │    Field    │                                 Value                                 │
  ├─────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Action name │ CodeFlow: Run Code                                                    │
  ├─────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Action URL  │ https://reena-noncorroborating-readily.ngrok-free.dev/v1/actions/code │
  ├─────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Description │ Execute custom JavaScript code                                        │
  └─────────────┴───────────────────────────────────────────────────────────────────────┘
  Input Fields:
  ┌────────────┬───────────┬──────────┐
  │ Field Name │   Type    │ Required │
  ├────────────┼───────────┼──────────┤
  │ snippetId  │ Text      │ No       │
  ├────────────┼───────────┼──────────┤
  │ inlineCode │ Text area │ No       │
  └────────────┴───────────┴──────────┘
  Output Fields:
  ┌──────────────────┬─────────┐
  │    Field Name    │  Type   │
  ├──────────────────┼─────────┤
  │ codeflow_success │ Boolean │
  ├──────────────────┼─────────┤
  │ codeflow_error   │ String  │
  └──────────────────┴─────────┘
  ---
  Step 4: Connect Your HubSpot Portal

  Open in browser:
  http://localhost:3100/oauth/authorize

  This will:
  1. Redirect you to HubSpot login
  2. Ask you to authorize the app
  3. Redirect back with "Successfully Connected!"
  4. Save your portal credentials in MongoDB

  ---
  Step 5: Use in HubSpot Workflow

  1. Go to your HubSpot portal: https://app.hubspot.com/
  2. Navigate to: Automation → Workflows
  3. Create a new workflow (Contact-based, Deal-based, etc.)
  4. Click + to add an action
  5. Search for "CodeFlow"
  6. You'll see your custom actions:
    - CodeFlow: Send Webhook
    - CodeFlow: Run Code

  ---
  Quick Test

  Test 1: Verify Server is Running

  curl http://localhost:3100/health

  Expected:
  {"status":"ok","timestamp":"2026-01-27T..."}

  Test 2: Test Actions Endpoint

  curl -X POST http://localhost:3100/v1/actions/test -H "Content-Type: application/json" -d
  "{\"test\":true}"

  Expected:
  {"success":true,"message":"CodeFlow actions endpoint is working",...}

  Test 3: Test via ngrok

  curl -X POST https://reena-noncorroborating-readily.ngrok-free.dev/v1/actions/test -H "Content-Type:
   application/json" -d "{\"test\":true}"

  ---
  Example: Webhook in Workflow

  When you add "CodeFlow: Send Webhook" in a HubSpot workflow:
  ┌───────────────┬─────────────────────────────────────────────────────────────────┐
  │     Field     │                          Example Value                          │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Webhook URL   │ https://api.example.com/webhook                                 │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Method        │ POST                                                            │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Headers       │ {"Authorization": "Bearer your-api-key"}                        │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Body          │ {"email": "{{contact.email}}", "name": "{{contact.firstname}}"} │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Retry Enabled │ ✅                                                              │
  ├───────────────┼─────────────────────────────────────────────────────────────────┤
  │ Max Retries   │ 3                                                               │
  └───────────────┴─────────────────────────────────────────────────────────────────┘
  The {{contact.email}} placeholders will be replaced with actual contact data from HubSpot.

  ---
  Workflow Visual

  ┌─────────────────────────────────────────────────────────────────┐
  │                     HubSpot Workflow                            │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
  │  │  Trigger    │───▶│ CodeFlow: Send   │───▶│ Next Action   │  │
  │  │  (Contact   │    │ Webhook          │    │ (Branch, etc) │  │
  │  │  Created)   │    │                  │    │               │  │
  │  └─────────────┘    │ URL: your-api    │    └───────────────┘  │
  │                     │ Method: POST     │                        │
  │                     │ Retry: Yes (3x)  │                        │
  │                     └──────────────────┘                        │
  │                              │                                  │
  │                              ▼                                  │
  │                     ┌──────────────────┐                        │
  │                     │ Your Server      │                        │
  │                     │ (ngrok → 3100)   │                        │
  │                     └──────────────────┘                        │
  └─────────────────────────────────────────────────────────────────┘
