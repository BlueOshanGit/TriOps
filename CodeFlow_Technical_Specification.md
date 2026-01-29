# CodeFlow - Technical Specification Document

## Product Overview

### Vision
CodeFlow is a HubSpot integration application that provides webhook and custom code execution capabilities within HubSpot workflows, eliminating the need for Operations Hub Professional ($800/month). It democratizes advanced automation for HubSpot users on Starter and Professional plans.

### One-Liner
Execute custom code and send webhooks from any HubSpot workflow without Operations Hub.

### Target Market
- HubSpot Marketing Hub Starter/Professional users
- HubSpot Sales Hub Starter/Professional users
- HubSpot Service Hub Starter/Professional users
- Small to mid-size businesses needing automation
- Agencies managing multiple HubSpot portals

### Value Proposition
- **Cost Savings**: $800/month → $79/month (90% reduction)
- **Flexibility**: Write custom code in Node.js or Python
- **Integration**: Connect to any external API via webhooks
- **Simplicity**: No infrastructure management required
- **Security**: Secrets management built-in

---

## Features Specification

### Core Features

#### 1. Webhook Action
Send HTTP requests to any URL directly from HubSpot workflows.

| Capability | Description |
|------------|-------------|
| HTTP Methods | POST, GET, PUT, PATCH, DELETE |
| Custom Headers | Add any headers including Authorization |
| Payload Templates | Build payloads using HubSpot properties with Handlebars syntax |
| Dynamic URLs | Use HubSpot properties in URL construction |
| Response Handling | Capture response data for use in subsequent workflow actions |
| Timeout | Configurable up to 30 seconds |
| Retry Logic | Automatic retry with exponential backoff (1, 2, 4 attempts) |
| Authentication | API Key, Bearer Token, Basic Auth, HMAC signature |

**Input Fields:**
- `webhook_url` (string, required) - Target URL
- `http_method` (enum, required) - POST/GET/PUT/PATCH/DELETE
- `headers` (JSON string, optional) - Custom headers
- `payload_template` (string, optional) - Handlebars template for body
- `include_all_properties` (boolean, optional) - Send all object properties
- `authentication_type` (enum, optional) - none/api_key/bearer/basic/hmac
- `auth_credentials` (string, optional) - Secret name for credentials
- `timeout_seconds` (number, optional) - Request timeout (default: 25)
- `retry_on_failure` (boolean, optional) - Enable retry logic

**Output Fields:**
- `response_status` (number) - HTTP status code
- `response_body` (string) - Response body (truncated to 500 chars)
- `response_headers` (string) - Response headers JSON
- `execution_id` (string) - Unique execution identifier
- `execution_time_ms` (number) - Execution duration

#### 2. Custom Code Action
Execute JavaScript or Python code within workflows.

| Capability | Description |
|------------|-------------|
| Runtimes | Node.js 18, Node.js 20, Python 3.9, Python 3.11 |
| Execution Time | Up to 30 seconds |
| Memory | 256MB per execution |
| Input Data | Access HubSpot object properties |
| Output Data | Return up to 5 custom output fields |
| Secrets | Inject stored secrets securely |
| Libraries | Pre-installed common libraries |
| Sandboxing | Isolated execution environment |

**Pre-installed Node.js Libraries:**
- axios (HTTP client)
- lodash (utilities)
- moment (dates)
- uuid (ID generation)
- crypto (built-in)
- url (built-in)
- querystring (built-in)

**Pre-installed Python Libraries:**
- requests
- pandas
- numpy
- python-dateutil
- phonenumbers
- json (built-in)
- re (built-in)
- hashlib (built-in)

**Input Fields:**
- `runtime` (enum, required) - nodejs18/nodejs20/python39/python311
- `code_source` (enum, required) - inline/snippet
- `code_snippet_id` (string, conditional) - Reference to saved snippet
- `inline_code` (string, conditional) - Direct code input
- `input_properties` (string, optional) - Comma-separated property names
- `timeout_seconds` (number, optional) - Execution timeout (default: 10)
- `secrets` (string, optional) - Comma-separated secret names to inject

**Output Fields:**
- `output_1` through `output_5` (string) - Custom outputs from code
- `execution_status` (string) - success/error
- `error_message` (string) - Error details if failed
- `execution_time_ms` (number) - Execution duration
- `logs` (string) - Console output (truncated)

#### 3. Code Snippet Library
Save, organize, and reuse code snippets across workflows.

| Capability | Description |
|------------|-------------|
| Versioning | Track changes with version history |
| Sharing | Share within organization |
| Categories | Organize with custom categories |
| Templates | Pre-built templates for common use cases |
| Testing | Test snippets before deployment |
| Documentation | Add descriptions and usage notes |

**Snippet Schema:**
```json
{
  "id": "snip_xxxxx",
  "portal_id": "4066240",
  "name": "Calculate Lead Score",
  "description": "Custom lead scoring based on engagement",
  "runtime": "nodejs18",
  "code": "const { email, jobtitle } = inputs;...",
  "category": "scoring",
  "tags": ["leads", "scoring", "engagement"],
  "input_schema": {
    "email": "string",
    "jobtitle": "string"
  },
  "output_schema": {
    "lead_score": "number"
  },
  "version": 3,
  "is_public": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z",
  "created_by": "user@example.com"
}
```

#### 4. Secrets Manager
Securely store and use API keys and credentials.

| Capability | Description |
|------------|-------------|
| Encryption | AES-256 encryption at rest |
| Access Control | Per-secret access permissions |
| Audit Log | Track secret access |
| Rotation | Support for secret rotation |
| Environment | Separate dev/prod secrets |

**Secret Schema:**
```json
{
  "id": "sec_xxxxx",
  "portal_id": "12345678",
  "name": "SLACK_WEBHOOK_URL",
  "description": "Slack incoming webhook for notifications",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "last_accessed_at": "2025-01-15T00:00:00Z",
  "access_count": 142
}
```

#### 5. Execution Logs
Complete audit trail of all executions.

| Capability | Description |
|------------|-------------|
| Retention | 30 days (Starter), 90 days (Growth), 1 year (Scale) |
| Search | Filter by date, status, type, workflow |
| Export | CSV/JSON export |
| Alerts | Email/Slack alerts on failures |
| Debugging | Full request/response details |

**Execution Log Schema:**
```json
{
  "id": "exec_xxxxx",
  "portal_id": "4066240",
  "type": "webhook|code",
  "workflow_id": "12345",
  "workflow_name": "Lead Nurture",
  "object_type": "contact",
  "object_id": "123",
  "status": "success|error|timeout",
  "started_at": "2025-01-15T10:30:00Z",
  "completed_at": "2025-01-15T10:30:01Z",
  "duration_ms": 1234,
  "request": {
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {},
    "body": {}
  },
  "response": {
    "status": 200,
    "headers": {},
    "body": "{...}"
  },
  "error": null,
  "credits_used": 1
}
```

#### 6. Pre-built Templates
Ready-to-use code templates for common integrations.

**Template Categories:**
- Notifications (Slack, Teams, Discord, Email)
- Data Enrichment (Clearbit, Apollo, Hunter)
- CRM Sync (Salesforce, Pipedrive)
- Spreadsheets (Google Sheets, Airtable)
- Payment (Stripe, PayPal)
- Calendar (Calendly, Google Calendar)
- Custom Calculations (Lead Scoring, Routing)

#### 7. Rate Limiting & Throttling
Intelligent request management.

| Capability | Description |
|------------|-------------|
| Per-Portal Limits | Prevent single portal from consuming all resources |
| Burst Protection | Handle traffic spikes gracefully |
| Queue Management | Queue requests during high load |
| Priority Execution | Priority queue for higher tier customers |

---

## Pricing

### Tier Structure

| Plan | Monthly Price | Annual Price | Executions/Month | Snippets | Secrets | Log Retention |
|------|---------------|--------------|------------------|----------|---------|---------------|
| Starter | $29 | $290 ($24/mo) | 500 | 5 | 3 | 30 days |
| Growth | $79 | $790 ($66/mo) | 3,000 | 25 | 15 | 90 days |
| Scale | $199 | $1,990 ($166/mo) | 20,000 | Unlimited | Unlimited | 1 year |
| Enterprise | Custom | Custom | Unlimited | Unlimited | Unlimited | Custom |

### Overage Pricing
| Plan | Per Additional Execution |
|------|--------------------------|
| Starter | $0.03 |
| Growth | $0.02 |
| Scale | $0.01 |

### Feature Comparison

| Feature | Starter | Growth | Scale | Enterprise |
|---------|---------|--------|-------|------------|
| Webhook Actions | ✓ | ✓ | ✓ | ✓ |
| Custom Code Actions | ✓ | ✓ | ✓ | ✓ |
| Node.js Runtime | ✓ | ✓ | ✓ | ✓ |
| Python Runtime | - | ✓ | ✓ | ✓ |
| Secrets Manager | 3 | 15 | Unlimited | Unlimited |
| Code Snippet Library | 5 | 25 | Unlimited | Unlimited |
| Pre-built Templates | Basic | All | All | All + Custom |
| Execution Timeout | 10s | 20s | 30s | 60s |
| Retry Logic | - | ✓ | ✓ | ✓ |
| Priority Execution | - | - | ✓ | ✓ |
| Failure Alerts | Email | Email + Slack | All Channels | Custom |
| API Access | - | - | ✓ | ✓ |
| Dedicated Support | - | - | - | ✓ |
| SLA | - | - | 99.9% | 99.99% |
| Custom Integrations | - | - | - | ✓ |

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HubSpot Portal                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        Workflow Editor                              │ │
│  │  ┌──────────────┐    ┌────────────────────┐    ┌────────────────┐  │ │
│  │  │   Trigger    │───▶│  CodeFlow Action   │───▶│  Next Action   │  │ │
│  │  │              │    │  (Webhook/Code)    │    │                │  │ │
│  │  └──────────────┘    └────────────────────┘    └────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Settings App (iframe)                                              │ │
│  │  • Snippets • Secrets • Logs • Usage • Account                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (OAuth 2.0)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         AWS Infrastructure                                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        API Gateway                                   │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │ │
│  │  │ /webhook/*  │ │ /code/*     │ │ /snippets/* │ │ /secrets/*  │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                      │
│          ┌─────────────────────────┼─────────────────────────┐           │
│          ▼                         ▼                         ▼           │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐    │
│  │    Lambda:    │        │    Lambda:    │        │    Lambda:    │    │
│  │   Webhook     │        │    Code       │        │     API       │    │
│  │  Dispatcher   │        │   Executor    │        │   Handlers    │    │
│  └───────┬───────┘        └───────┬───────┘        └───────┬───────┘    │
│          │                        │                        │            │
│          └────────────────────────┼────────────────────────┘            │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Data Layer                                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │ │
│  │  │  DynamoDB   │ │  DynamoDB   │ │  DynamoDB   │ │  DynamoDB   │   │ │
│  │  │   Portals   │ │  Snippets   │ │    Logs     │ │   Usage     │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │ │
│  │                                                                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │ │
│  │  │  Secrets    │ │     S3      │ │    SQS      │                   │ │
│  │  │  Manager    │ │ (Templates) │ │  (Retry Q)  │                   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Monitoring                                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │ │
│  │  │ CloudWatch  │ │   X-Ray     │ │   Alarms    │                   │ │
│  │  │    Logs     │ │   Traces    │ │   & SNS     │                   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. API Gateway
- **Type**: AWS API Gateway (HTTP API)
- **Authentication**: JWT validation for settings app, HubSpot signature for workflow actions
- **Rate Limiting**: 1000 req/sec per portal
- **CORS**: Enabled for HubSpot domains

**Endpoints:**
```
POST   /v1/actions/webhook          # Workflow webhook action
POST   /v1/actions/code             # Workflow code action
GET    /v1/snippets                 # List snippets
POST   /v1/snippets                 # Create snippet
GET    /v1/snippets/{id}            # Get snippet
PUT    /v1/snippets/{id}            # Update snippet
DELETE /v1/snippets/{id}            # Delete snippet
GET    /v1/secrets                  # List secrets (metadata only)
POST   /v1/secrets                  # Create secret
DELETE /v1/secrets/{id}             # Delete secret
GET    /v1/logs                     # List execution logs
GET    /v1/logs/{id}                # Get execution details
GET    /v1/usage                    # Get usage statistics
GET    /v1/account                  # Get account details
POST   /v1/oauth/callback           # OAuth callback
POST   /v1/oauth/refresh            # Token refresh
```

#### 2. Lambda Functions

**Webhook Dispatcher (Node.js 20)**
- Memory: 512MB
- Timeout: 30 seconds
- Concurrency: 100 per portal
- Responsibilities:
  - Validate request signature
  - Parse payload template
  - Execute HTTP request
  - Handle retries
  - Log execution
  - Return output fields to HubSpot

**Code Executor (Node.js 20 / Python 3.11)**
- Memory: 256MB
- Timeout: 30 seconds
- Concurrency: 50 per portal
- Responsibilities:
  - Load code from snippet or inline
  - Inject secrets
  - Execute in sandbox (vm2 for Node.js)
  - Capture outputs
  - Log execution
  - Return output fields to HubSpot

**API Handlers (Node.js 20)**
- Memory: 256MB
- Timeout: 10 seconds
- Responsibilities:
  - CRUD operations for snippets, secrets
  - Query execution logs
  - Usage tracking
  - Account management

#### 3. DynamoDB Tables

**Portals Table**
```
Table: codeflow-portals
Partition Key: portal_id (String)

Attributes:
- portal_id: String (HubSpot portal ID)
- access_token: String (encrypted)
- refresh_token: String (encrypted)
- token_expires_at: Number (Unix timestamp)
- plan: String (starter|growth|scale|enterprise)
- plan_started_at: Number
- billing_email: String
- company_name: String
- execution_count_month: Number
- execution_reset_date: Number
- settings: Map
  - default_timeout: Number
  - retry_enabled: Boolean
  - alert_email: String
  - alert_slack_webhook: String
- created_at: Number
- updated_at: Number
- status: String (active|suspended|cancelled)

GSI: plan-index (plan, created_at)
GSI: status-index (status, updated_at)
```

**Snippets Table**
```
Table: codeflow-snippets
Partition Key: portal_id (String)
Sort Key: snippet_id (String)

Attributes:
- portal_id: String
- snippet_id: String
- name: String
- description: String
- runtime: String
- code: String
- category: String
- tags: List<String>
- input_schema: Map
- output_schema: Map
- version: Number
- is_active: Boolean
- created_at: Number
- updated_at: Number
- created_by: String
- usage_count: Number

GSI: category-index (portal_id, category)
LSI: name-index (portal_id, name)
```

**Executions Table**
```
Table: codeflow-executions
Partition Key: portal_id (String)
Sort Key: execution_id (String)

Attributes:
- portal_id: String
- execution_id: String
- type: String (webhook|code)
- workflow_id: String
- workflow_name: String
- object_type: String
- object_id: String
- snippet_id: String (optional)
- status: String (success|error|timeout)
- started_at: Number
- completed_at: Number
- duration_ms: Number
- request: Map
- response: Map
- error: String
- credits_used: Number

GSI: workflow-index (portal_id, workflow_id, started_at)
GSI: status-index (portal_id, status, started_at)
TTL: expires_at (based on plan retention)
```

**Usage Table**
```
Table: codeflow-usage
Partition Key: portal_id (String)
Sort Key: period (String) # YYYY-MM

Attributes:
- portal_id: String
- period: String
- webhook_executions: Number
- code_executions: Number
- total_executions: Number
- successful_executions: Number
- failed_executions: Number
- total_duration_ms: Number
- credits_used: Number
- credits_limit: Number
- overage_credits: Number
- daily_breakdown: Map<String, Number>
```

#### 4. Secrets Manager
- AWS Secrets Manager for storing user secrets
- Secret naming: `codeflow/{portal_id}/{secret_name}`
- Encryption: AWS KMS with customer-managed key option for Enterprise
- Access logging via CloudTrail

#### 5. S3 Buckets
```
codeflow-templates/
├── nodejs/
│   ├── slack-notification.js
│   ├── clearbit-enrichment.js
│   └── ...
├── python/
│   ├── lead-scoring.py
│   └── ...
└── metadata.json

codeflow-logs/
├── {portal_id}/
│   └── {YYYY-MM-DD}/
│       └── {execution_id}.json
```

#### 6. SQS Queues
```
codeflow-retry-queue
- Visibility Timeout: 60 seconds
- Message Retention: 4 days
- DLQ: codeflow-retry-dlq

codeflow-alerts-queue
- For sending failure notifications
```

---

## HubSpot Integration

### OAuth 2.0 Configuration

**App Settings:**
```json
{
  "app_id": "YOUR_APP_ID",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://api.codeflow.io/v1/oauth/callback",
  "scopes": [
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.companies.read",
    "crm.objects.companies.write",
    "crm.objects.deals.read",
    "crm.objects.deals.write",
    "crm.objects.custom.read",
    "crm.objects.custom.write",
    "automation",
    "oauth"
  ]
}
```

**OAuth Flow:**
1. User clicks "Install" in HubSpot Marketplace
2. HubSpot redirects to: `https://api.codeflow.io/v1/oauth/callback?code=xxx`
3. CodeFlow exchanges code for tokens
4. Store tokens in DynamoDB (encrypted)
5. Redirect user to settings page

**Token Refresh:**
- Tokens refreshed 5 minutes before expiry
- Background Lambda checks tokens every minute
- Failed refresh triggers alert

### Workflow Extension Configuration

**App Card (public-app.json):**
```json
{
  "uid": "codeflow",
  "scopes": ["crm.objects.contacts.read", "automation"],
  "public": true,
  "extensions": {
    "crm": {
      "cards": [
        {
          "file": "crm-card.json"
        }
      ]
    }
  },
  "webhooks": {
    "file": "webhooks.json"
  },
  "workflowActions": [
    {
      "file": "workflow-actions/send-webhook.json"
    },
    {
      "file": "workflow-actions/run-code.json"
    }
  ]
}
```

**Workflow Action: Send Webhook (send-webhook.json):**
```json
{
  "actionUrl": "https://api.codeflow.io/v1/actions/webhook",
  "published": true,
  "labels": {
    "en": {
      "actionName": "CodeFlow: Send Webhook",
      "actionDescription": "Send an HTTP request to any URL",
      "actionCardContent": "Send webhook to {{webhook_url}}"
    }
  },
  "inputFields": [
    {
      "typeDefinition": {
        "name": "webhook_url",
        "type": "string",
        "fieldType": "text"
      },
      "supportedValueTypes": ["STATIC_VALUE", "OBJECT_PROPERTY"],
      "isRequired": true,
      "labels": {
        "en": {
          "label": "Webhook URL",
          "description": "The URL to send the request to"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "http_method",
        "type": "enumeration",
        "options": [
          {"value": "POST", "label": "POST"},
          {"value": "GET", "label": "GET"},
          {"value": "PUT", "label": "PUT"},
          {"value": "PATCH", "label": "PATCH"},
          {"value": "DELETE", "label": "DELETE"}
        ]
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": true,
      "labels": {
        "en": {
          "label": "HTTP Method",
          "description": "The HTTP method to use"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "headers",
        "type": "string",
        "fieldType": "textarea"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Headers (JSON)",
          "description": "Custom headers in JSON format"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "payload_template",
        "type": "string",
        "fieldType": "textarea"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Payload Template",
          "description": "Request body template. Use {{property_name}} for dynamic values"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "include_all_properties",
        "type": "bool"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Include All Properties",
          "description": "Send all object properties in the request"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "secret_name",
        "type": "string",
        "fieldType": "text"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Secret Name",
          "description": "Name of secret containing auth credentials"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "retry_on_failure",
        "type": "bool"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Retry on Failure",
          "description": "Automatically retry failed requests"
        }
      }
    }
  ],
  "outputFields": [
    {
      "typeDefinition": {
        "name": "response_status",
        "type": "number"
      },
      "labels": {
        "en": {
          "label": "Response Status Code"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "response_body",
        "type": "string"
      },
      "labels": {
        "en": {
          "label": "Response Body"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "execution_id",
        "type": "string"
      },
      "labels": {
        "en": {
          "label": "Execution ID"
        }
      }
    }
  ]
}
```

**Workflow Action: Run Code (run-code.json):**
```json
{
  "actionUrl": "https://api.codeflow.io/v1/actions/code",
  "published": true,
  "labels": {
    "en": {
      "actionName": "CodeFlow: Run Custom Code",
      "actionDescription": "Execute JavaScript or Python code",
      "actionCardContent": "Run {{runtime}} code"
    }
  },
  "inputFields": [
    {
      "typeDefinition": {
        "name": "runtime",
        "type": "enumeration",
        "options": [
          {"value": "nodejs18", "label": "Node.js 18"},
          {"value": "nodejs20", "label": "Node.js 20"},
          {"value": "python39", "label": "Python 3.9"},
          {"value": "python311", "label": "Python 3.11"}
        ]
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": true,
      "labels": {
        "en": {
          "label": "Runtime",
          "description": "Code execution environment"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "code_source",
        "type": "enumeration",
        "options": [
          {"value": "inline", "label": "Inline Code"},
          {"value": "snippet", "label": "Saved Snippet"}
        ]
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": true,
      "labels": {
        "en": {
          "label": "Code Source"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "snippet_id",
        "type": "string",
        "fieldType": "text"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Snippet ID",
          "description": "ID of saved code snippet"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "inline_code",
        "type": "string",
        "fieldType": "textarea"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Code",
          "description": "JavaScript or Python code to execute"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "input_properties",
        "type": "string",
        "fieldType": "text"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Input Properties",
          "description": "Comma-separated list of properties to pass to code"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "secrets",
        "type": "string",
        "fieldType": "text"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Secrets",
          "description": "Comma-separated list of secret names to inject"
        }
      }
    },
    {
      "typeDefinition": {
        "name": "timeout_seconds",
        "type": "number"
      },
      "supportedValueTypes": ["STATIC_VALUE"],
      "isRequired": false,
      "labels": {
        "en": {
          "label": "Timeout (seconds)",
          "description": "Maximum execution time (default: 10)"
        }
      }
    }
  ],
  "outputFields": [
    {
      "typeDefinition": {"name": "output_1", "type": "string"},
      "labels": {"en": {"label": "Output 1"}}
    },
    {
      "typeDefinition": {"name": "output_2", "type": "string"},
      "labels": {"en": {"label": "Output 2"}}
    },
    {
      "typeDefinition": {"name": "output_3", "type": "string"},
      "labels": {"en": {"label": "Output 3"}}
    },
    {
      "typeDefinition": {"name": "output_4", "type": "string"},
      "labels": {"en": {"label": "Output 4"}}
    },
    {
      "typeDefinition": {"name": "output_5", "type": "string"},
      "labels": {"en": {"label": "Output 5"}}
    },
    {
      "typeDefinition": {"name": "execution_status", "type": "string"},
      "labels": {"en": {"label": "Execution Status"}}
    },
    {
      "typeDefinition": {"name": "error_message", "type": "string"},
      "labels": {"en": {"label": "Error Message"}}
    }
  ]
}
```

---

## API Specifications

### Authentication

**For Workflow Actions (HubSpot → CodeFlow):**
- HubSpot signs requests with app secret
- Validate signature: `X-HubSpot-Signature-v3`

**For Settings App (User → CodeFlow):**
- JWT token issued after OAuth
- Token in `Authorization: Bearer <token>` header
- Token expiry: 24 hours

### API Endpoints

#### Webhook Action
```
POST /v1/actions/webhook

Request (from HubSpot):
{
  "callbackId": "ap-123456789",
  "origin": {
    "portalId": 12345678,
    "actionDefinitionId": "send-webhook"
  },
  "context": {
    "workflowId": 123456
  },
  "object": {
    "objectType": "CONTACT",
    "objectId": 12345,
    "properties": {
      "email": "john@example.com",
      "firstname": "John",
      "lastname": "Doe"
    }
  },
  "inputFields": {
    "webhook_url": "https://hooks.slack.com/xxx",
    "http_method": "POST",
    "headers": "{\"Content-Type\": \"application/json\"}",
    "payload_template": "{\"text\": \"New lead: {{firstname}} {{lastname}}\"}",
    "include_all_properties": false,
    "secret_name": "SLACK_TOKEN",
    "retry_on_failure": true
  }
}

Response:
{
  "outputFields": {
    "response_status": 200,
    "response_body": "{\"ok\": true}",
    "execution_id": "exec_abc123"
  }
}
```

#### Code Execution Action
```
POST /v1/actions/code

Request (from HubSpot):
{
  "callbackId": "ap-123456789",
  "origin": {
    "portalId": 12345678,
    "actionDefinitionId": "run-code"
  },
  "context": {
    "workflowId": 123456
  },
  "object": {
    "objectType": "CONTACT",
    "objectId": 12345,
    "properties": {
      "email": "john@example.com",
      "jobtitle": "CEO"
    }
  },
  "inputFields": {
    "runtime": "nodejs18",
    "code_source": "inline",
    "inline_code": "const score = inputs.jobtitle === 'CEO' ? 100 : 50; return { lead_score: score };",
    "input_properties": "email,jobtitle",
    "secrets": "API_KEY",
    "timeout_seconds": 10
  }
}

Response:
{
  "outputFields": {
    "output_1": "100",
    "output_2": "",
    "output_3": "",
    "output_4": "",
    "output_5": "",
    "execution_status": "success",
    "error_message": ""
  }
}
```

#### Snippets API
```
GET /v1/snippets
Authorization: Bearer <token>
Query: ?category=scoring&limit=20&offset=0

Response:
{
  "snippets": [...],
  "total": 45,
  "limit": 20,
  "offset": 0
}

POST /v1/snippets
Authorization: Bearer <token>
{
  "name": "Lead Scoring",
  "description": "Calculate lead score based on engagement",
  "runtime": "nodejs18",
  "code": "...",
  "category": "scoring",
  "tags": ["leads"]
}

Response:
{
  "snippet_id": "snip_abc123",
  "created_at": "2025-01-15T00:00:00Z"
}

GET /v1/snippets/{id}
PUT /v1/snippets/{id}
DELETE /v1/snippets/{id}
```

#### Secrets API
```
GET /v1/secrets
Authorization: Bearer <token>

Response:
{
  "secrets": [
    {
      "id": "sec_abc123",
      "name": "SLACK_WEBHOOK",
      "description": "Slack incoming webhook",
      "created_at": "2025-01-01T00:00:00Z",
      "last_accessed_at": "2025-01-15T00:00:00Z"
    }
  ]
}

POST /v1/secrets
Authorization: Bearer <token>
{
  "name": "SLACK_WEBHOOK",
  "value": "https://hooks.slack.com/xxx",
  "description": "Slack incoming webhook"
}

DELETE /v1/secrets/{id}
```

#### Logs API
```
GET /v1/logs
Authorization: Bearer <token>
Query: ?status=error&type=webhook&from=2025-01-01&to=2025-01-15&limit=50

Response:
{
  "executions": [...],
  "total": 1234,
  "limit": 50,
  "next_cursor": "xxx"
}

GET /v1/logs/{execution_id}
Authorization: Bearer <token>

Response:
{
  "id": "exec_abc123",
  "type": "webhook",
  "status": "success",
  "duration_ms": 234,
  "request": {...},
  "response": {...}
}
```

#### Usage API
```
GET /v1/usage
Authorization: Bearer <token>
Query: ?period=2025-01

Response:
{
  "period": "2025-01",
  "plan": "growth",
  "executions": {
    "used": 2345,
    "limit": 3000,
    "overage": 0
  },
  "daily_breakdown": {
    "2025-01-01": 123,
    "2025-01-02": 145
  }
}
```

---

## Lambda Functions Implementation

### Webhook Dispatcher

```javascript
// lambda/webhook-dispatcher/index.js

const axios = require('axios');
const Handlebars = require('handlebars');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const dynamodb = DynamoDBDocument.from(new DynamoDBClient({}));
const secretsManager = new SecretsManagerClient({});
const sqs = new SQSClient({});

exports.handler = async (event) => {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  
  const { origin, object, inputFields, context } = body;
  const portalId = String(origin.portalId);
  
  try {
    // 1. Check portal status and usage limits
    const portal = await getPortal(portalId);
    if (!portal || portal.status !== 'active') {
      throw new Error('Portal not active');
    }
    
    await checkUsageLimits(portal);
    
    // 2. Parse input fields
    const {
      webhook_url,
      http_method = 'POST',
      headers,
      payload_template,
      include_all_properties,
      secret_name,
      retry_on_failure
    } = inputFields;
    
    // 3. Build headers
    let requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'CodeFlow/1.0',
      'X-CodeFlow-Execution': executionId
    };
    
    if (headers) {
      try {
        requestHeaders = { ...requestHeaders, ...JSON.parse(headers) };
      } catch (e) {
        // Invalid JSON, ignore custom headers
      }
    }
    
    // 4. Inject secret if specified
    if (secret_name) {
      const secretValue = await getSecret(portalId, secret_name);
      if (secretValue) {
        // Assume secret contains auth header value
        requestHeaders['Authorization'] = secretValue;
      }
    }
    
    // 5. Build payload
    let payload;
    if (payload_template) {
      const template = Handlebars.compile(payload_template);
      const payloadString = template(object.properties);
      try {
        payload = JSON.parse(payloadString);
      } catch (e) {
        payload = payloadString;
      }
    } else if (include_all_properties) {
      payload = {
        objectType: object.objectType,
        objectId: object.objectId,
        properties: object.properties,
        timestamp: new Date().toISOString()
      };
    } else {
      payload = { objectId: object.objectId };
    }
    
    // 6. Execute request
    const response = await axios({
      method: http_method.toLowerCase(),
      url: webhook_url,
      headers: requestHeaders,
      data: payload,
      timeout: 25000,
      validateStatus: () => true
    });
    
    const duration = Date.now() - startTime;
    
    // 7. Log execution
    await logExecution({
      executionId,
      portalId,
      type: 'webhook',
      workflowId: context.workflowId,
      objectType: object.objectType,
      objectId: object.objectId,
      status: response.status < 400 ? 'success' : 'error',
      startedAt: startTime,
      duration,
      request: {
        url: webhook_url,
        method: http_method,
        headers: sanitizeHeaders(requestHeaders),
        body: truncate(JSON.stringify(payload), 2000)
      },
      response: {
        status: response.status,
        body: truncate(JSON.stringify(response.data), 2000)
      }
    });
    
    // 8. Update usage
    await incrementUsage(portalId);
    
    // 9. Return response to HubSpot
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputFields: {
          response_status: response.status,
          response_body: truncate(
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
            500
          ),
          execution_id: executionId
        }
      })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle retry
    if (inputFields.retry_on_failure && !event.isRetry) {
      await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.RETRY_QUEUE_URL,
        MessageBody: JSON.stringify({
          ...event,
          isRetry: true,
          retryCount: 1
        }),
        DelaySeconds: 60
      }));
    }
    
    // Log error
    await logExecution({
      executionId,
      portalId,
      type: 'webhook',
      workflowId: context?.workflowId,
      objectType: object?.objectType,
      objectId: object?.objectId,
      status: 'error',
      startedAt: startTime,
      duration,
      error: error.message
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputFields: {
          response_status: 0,
          response_body: `Error: ${error.message}`,
          execution_id: executionId
        }
      })
    };
  }
};

async function getPortal(portalId) {
  const result = await dynamodb.get({
    TableName: process.env.PORTALS_TABLE,
    Key: { portal_id: portalId }
  });
  return result.Item;
}

async function checkUsageLimits(portal) {
  const limits = {
    starter: 500,
    growth: 3000,
    scale: 20000,
    enterprise: Infinity
  };
  
  const limit = limits[portal.plan] || 500;
  
  if (portal.execution_count_month >= limit) {
    // Check if overage is allowed
    if (portal.plan === 'starter') {
      throw new Error('Execution limit reached. Upgrade to continue.');
    }
    // Allow overage, will be billed
  }
}

async function getSecret(portalId, secretName) {
  try {
    const result = await secretsManager.send(new GetSecretValueCommand({
      SecretId: `codeflow/${portalId}/${secretName}`
    }));
    return result.SecretString;
  } catch (e) {
    console.error(`Secret not found: ${secretName}`);
    return null;
  }
}

async function logExecution(execution) {
  await dynamodb.put({
    TableName: process.env.EXECUTIONS_TABLE,
    Item: {
      portal_id: execution.portalId,
      execution_id: execution.executionId,
      ...execution,
      created_at: Date.now(),
      expires_at: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days TTL
    }
  });
}

async function incrementUsage(portalId) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  await dynamodb.update({
    TableName: process.env.USAGE_TABLE,
    Key: { portal_id: portalId, period },
    UpdateExpression: 'SET webhook_executions = if_not_exists(webhook_executions, :zero) + :one, total_executions = if_not_exists(total_executions, :zero) + :one',
    ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
  });
  
  await dynamodb.update({
    TableName: process.env.PORTALS_TABLE,
    Key: { portal_id: portalId },
    UpdateExpression: 'SET execution_count_month = if_not_exists(execution_count_month, :zero) + :one',
    ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
  });
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  if (sanitized['Authorization']) {
    sanitized['Authorization'] = '***REDACTED***';
  }
  return sanitized;
}

function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
```

### Code Executor

```javascript
// lambda/code-executor/index.js

const { NodeVM } = require('vm2');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const dynamodb = DynamoDBDocument.from(new DynamoDBClient({}));
const secretsManager = new SecretsManagerClient({});
const lambda = new LambdaClient({});

exports.handler = async (event) => {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  
  const { origin, object, inputFields, context } = body;
  const portalId = String(origin.portalId);
  
  try {
    // 1. Check portal and limits
    const portal = await getPortal(portalId);
    if (!portal || portal.status !== 'active') {
      throw new Error('Portal not active');
    }
    
    await checkUsageLimits(portal);
    
    // 2. Parse input fields
    const {
      runtime,
      code_source,
      snippet_id,
      inline_code,
      input_properties,
      secrets: secretNames,
      timeout_seconds = 10
    } = inputFields;
    
    // 3. Get code
    let code;
    if (code_source === 'snippet' && snippet_id) {
      const snippet = await getSnippet(portalId, snippet_id);
      if (!snippet) {
        throw new Error('Snippet not found');
      }
      code = snippet.code;
      
      // Increment snippet usage
      await incrementSnippetUsage(portalId, snippet_id);
    } else {
      code = inline_code;
    }
    
    if (!code) {
      throw new Error('No code provided');
    }
    
    // 4. Build inputs
    const inputProps = input_properties ? input_properties.split(',').map(p => p.trim()) : [];
    const inputs = {};
    for (const prop of inputProps) {
      if (object.properties && object.properties[prop] !== undefined) {
        inputs[prop] = object.properties[prop];
      }
    }
    
    // 5. Load secrets
    const secretValues = {};
    if (secretNames) {
      const names = secretNames.split(',').map(s => s.trim());
      for (const name of names) {
        const value = await getSecret(portalId, name);
        if (value) {
          secretValues[name] = value;
        }
      }
    }
    
    // 6. Execute code based on runtime
    let result;
    const maxTimeout = getMaxTimeout(portal.plan);
    const actualTimeout = Math.min(timeout_seconds, maxTimeout) * 1000;
    
    if (runtime.startsWith('nodejs')) {
      result = await executeNodeJS(code, {
        inputs,
        secrets: secretValues,
        event: {
          objectType: object.objectType,
          objectId: object.objectId,
          portalId,
          executionId
        }
      }, actualTimeout);
    } else if (runtime.startsWith('python')) {
      // Invoke Python executor Lambda
      result = await executePython(code, inputs, secretValues, actualTimeout);
    } else {
      throw new Error(`Unsupported runtime: ${runtime}`);
    }
    
    const duration = Date.now() - startTime;
    
    // 7. Log execution
    await logExecution({
      executionId,
      portalId,
      type: 'code',
      workflowId: context.workflowId,
      objectType: object.objectType,
      objectId: object.objectId,
      snippetId: snippet_id,
      runtime,
      status: 'success',
      startedAt: startTime,
      duration
    });
    
    // 8. Update usage
    await incrementUsage(portalId);
    
    // 9. Map outputs
    const outputFields = {
      output_1: '',
      output_2: '',
      output_3: '',
      output_4: '',
      output_5: '',
      execution_status: 'success',
      error_message: ''
    };
    
    if (result && typeof result === 'object') {
      const keys = Object.keys(result).slice(0, 5);
      keys.forEach((key, index) => {
        outputFields[`output_${index + 1}`] = String(result[key] ?? '');
      });
    } else if (result !== undefined) {
      outputFields.output_1 = String(result);
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputFields })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    await logExecution({
      executionId,
      portalId,
      type: 'code',
      workflowId: context?.workflowId,
      objectType: object?.objectType,
      objectId: object?.objectId,
      status: 'error',
      startedAt: startTime,
      duration,
      error: error.message
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputFields: {
          output_1: '',
          output_2: '',
          output_3: '',
          output_4: '',
          output_5: '',
          execution_status: 'error',
          error_message: error.message
        }
      })
    };
  }
};

async function executeNodeJS(code, context, timeout) {
  const logs = [];
  
  const vm = new NodeVM({
    timeout,
    sandbox: {
      inputs: context.inputs,
      secrets: context.secrets,
      event: context.event,
      console: {
        log: (...args) => logs.push(['log', ...args]),
        error: (...args) => logs.push(['error', ...args]),
        warn: (...args) => logs.push(['warn', ...args])
      }
    },
    require: {
      external: ['axios', 'lodash', 'moment', 'uuid'],
      builtin: ['crypto', 'url', 'querystring', 'util'],
      root: './',
      mock: {
        fs: {},
        child_process: {},
        net: {},
        dns: {}
      }
    }
  });
  
  // Wrap code to handle both return and async
  const wrappedCode = `
    module.exports = (async () => {
      ${code}
    })();
  `;
  
  try {
    const result = await vm.run(wrappedCode);
    return result;
  } catch (error) {
    throw new Error(`Code execution failed: ${error.message}`);
  }
}

async function executePython(code, inputs, secrets, timeout) {
  const response = await lambda.send(new InvokeCommand({
    FunctionName: process.env.PYTHON_EXECUTOR_FUNCTION,
    Payload: JSON.stringify({
      code,
      inputs,
      secrets,
      timeout: timeout / 1000
    })
  }));
  
  const result = JSON.parse(Buffer.from(response.Payload).toString());
  
  if (result.errorMessage) {
    throw new Error(result.errorMessage);
  }
  
  return result.body ? JSON.parse(result.body) : result;
}

function getMaxTimeout(plan) {
  const timeouts = {
    starter: 10,
    growth: 20,
    scale: 30,
    enterprise: 60
  };
  return timeouts[plan] || 10;
}

async function getSnippet(portalId, snippetId) {
  const result = await dynamodb.get({
    TableName: process.env.SNIPPETS_TABLE,
    Key: { portal_id: portalId, snippet_id: snippetId }
  });
  return result.Item;
}

async function incrementSnippetUsage(portalId, snippetId) {
  await dynamodb.update({
    TableName: process.env.SNIPPETS_TABLE,
    Key: { portal_id: portalId, snippet_id: snippetId },
    UpdateExpression: 'SET usage_count = if_not_exists(usage_count, :zero) + :one',
    ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
  });
}

// Reuse functions from webhook dispatcher
async function getPortal(portalId) { /* ... */ }
async function checkUsageLimits(portal) { /* ... */ }
async function getSecret(portalId, secretName) { /* ... */ }
async function logExecution(execution) { /* ... */ }
async function incrementUsage(portalId) { /* ... */ }
```

---

## Settings App (Frontend)

### Technology Stack
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **State**: React Query + Zustand
- **Routing**: React Router v6
- **Code Editor**: Monaco Editor
- **Build**: Vite

### Page Structure

```
/settings
├── /snippets
│   ├── / (list)
│   ├── /new
│   └── /:id/edit
├── /secrets
├── /logs
│   └── /:id
├── /usage
└── /account
```

### Components

**App.jsx**
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SnippetsPage } from './pages/SnippetsPage';
import { SnippetEditor } from './pages/SnippetEditor';
import { SecretsPage } from './pages/SecretsPage';
import { LogsPage } from './pages/LogsPage';
import { LogDetail } from './pages/LogDetail';
import { UsagePage } from './pages/UsagePage';
import { AccountPage } from './pages/AccountPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/snippets" replace />} />
            <Route path="snippets" element={<SnippetsPage />} />
            <Route path="snippets/new" element={<SnippetEditor />} />
            <Route path="snippets/:id" element={<SnippetEditor />} />
            <Route path="secrets" element={<SecretsPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="logs/:id" element={<LogDetail />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

**SnippetEditor.jsx**
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import { api } from '../lib/api';

export function SnippetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  
  const [snippet, setSnippet] = useState({
    name: '',
    description: '',
    runtime: 'nodejs18',
    code: getDefaultCode('nodejs18'),
    category: 'general',
    tags: []
  });
  
  const [testResult, setTestResult] = useState(null);
  const [testInputs, setTestInputs] = useState('{}');
  
  // Load existing snippet
  const { data: existingSnippet } = useQuery({
    queryKey: ['snippet', id],
    queryFn: () => api.getSnippet(id),
    enabled: !isNew
  });
  
  useEffect(() => {
    if (existingSnippet) {
      setSnippet(existingSnippet);
    }
  }, [existingSnippet]);
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => isNew ? api.createSnippet(data) : api.updateSnippet(id, data),
    onSuccess: () => navigate('/snippets')
  });
  
  // Test mutation
  const testMutation = useMutation({
    mutationFn: (data) => api.testSnippet(data),
    onSuccess: (result) => setTestResult(result)
  });
  
  const handleRuntimeChange = (runtime) => {
    setSnippet(prev => ({
      ...prev,
      runtime,
      code: prev.code === getDefaultCode(prev.runtime) ? getDefaultCode(runtime) : prev.code
    }));
  };
  
  const handleTest = () => {
    testMutation.mutate({
      runtime: snippet.runtime,
      code: snippet.code,
      inputs: JSON.parse(testInputs)
    });
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isNew ? 'Create Snippet' : 'Edit Snippet'}
      </h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Code Editor */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Snippet Name"
              value={snippet.name}
              onChange={(e) => setSnippet(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <select
              value={snippet.runtime}
              onChange={(e) => handleRuntimeChange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="nodejs18">Node.js 18</option>
              <option value="nodejs20">Node.js 20</option>
              <option value="python39">Python 3.9</option>
              <option value="python311">Python 3.11</option>
            </select>
          </div>
          
          <textarea
            placeholder="Description"
            value={snippet.description}
            onChange={(e) => setSnippet(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg"
            rows={2}
          />
          
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="400px"
              language={snippet.runtime.startsWith('python') ? 'python' : 'javascript'}
              value={snippet.code}
              onChange={(value) => setSnippet(prev => ({ ...prev, code: value }))}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false
              }}
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => saveMutation.mutate(snippet)}
              disabled={saveMutation.isPending}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Snippet'}
            </button>
            <button
              onClick={() => navigate('/snippets')}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {/* Right: Test Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Snippet</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Test Inputs (JSON)</label>
            <Editor
              height="150px"
              language="json"
              value={testInputs}
              onChange={(value) => setTestInputs(value)}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'off'
              }}
            />
          </div>
          
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {testMutation.isPending ? 'Running...' : 'Run Test'}
          </button>
          
          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium mb-2">
                {testResult.success ? '✓ Success' : '✗ Error'}
              </h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult.output || testResult.error, null, 2)}
              </pre>
              {testResult.logs && testResult.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-1">Console Output</h4>
                  <pre className="text-sm bg-gray-800 text-white p-2 rounded">
                    {testResult.logs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {/* Templates Section */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.filter(t => t.runtime === snippet.runtime).map(template => (
                <button
                  key={template.name}
                  onClick={() => setSnippet(prev => ({ ...prev, code: template.code }))}
                  className="p-2 text-left text-sm border rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-gray-500 text-xs">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultCode(runtime) {
  if (runtime.startsWith('python')) {
    return `# Access inputs via 'inputs' dict
# Access secrets via 'secrets' dict
# Return a dict with your outputs

email = inputs.get('email', '')
score = 50

if '@company.com' not in email:
    score += 25

return {'lead_score': score}`;
  }
  
  return `// Access inputs via 'inputs' object
// Access secrets via 'secrets' object
// Return an object with your outputs

const { email } = inputs;
let score = 50;

if (!email.includes('@company.com')) {
  score += 25;
}

return { lead_score: score };`;
}

const TEMPLATES = [
  {
    name: 'Slack Notification',
    description: 'Send a Slack message',
    runtime: 'nodejs18',
    code: `const axios = require('axios');

const { firstname, lastname, email } = inputs;
const webhookUrl = secrets.SLACK_WEBHOOK_URL;

await axios.post(webhookUrl, {
  text: \`New lead: \${firstname} \${lastname} (\${email})\`
});

return { sent: 'true' };`
  },
  {
    name: 'Lead Scoring',
    description: 'Calculate lead score',
    runtime: 'nodejs18',
    code: `const { email, jobtitle, company_size } = inputs;

let score = 0;

// Email domain scoring
if (!email.includes('gmail.com') && !email.includes('yahoo.com')) {
  score += 20;
}

// Job title scoring
const titles = ['ceo', 'cto', 'vp', 'director', 'head'];
if (titles.some(t => jobtitle?.toLowerCase().includes(t))) {
  score += 30;
}

// Company size scoring
const size = parseInt(company_size) || 0;
if (size > 100) score += 25;
if (size > 500) score += 25;

return { lead_score: score };`
  }
];
```

---

## AWS Infrastructure (IaC - CDK)

```typescript
// lib/codeflow-stack.ts

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class CodeFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const portalsTable = new dynamodb.Table(this, 'PortalsTable', {
      tableName: 'codeflow-portals',
      partitionKey: { name: 'portal_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });

    const snippetsTable = new dynamodb.Table(this, 'SnippetsTable', {
      tableName: 'codeflow-snippets',
      partitionKey: { name: 'portal_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'snippet_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const executionsTable = new dynamodb.Table(this, 'ExecutionsTable', {
      tableName: 'codeflow-executions',
      partitionKey: { name: 'portal_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'execution_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expires_at'
    });

    executionsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'portal_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING }
    });

    const usageTable = new dynamodb.Table(this, 'UsageTable', {
      tableName: 'codeflow-usage',
      partitionKey: { name: 'portal_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'period', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // S3 Bucket for templates
    const templatesBucket = new s3.Bucket(this, 'TemplatesBucket', {
      bucketName: 'codeflow-templates',
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    // SQS Queues
    const retryDlq = new sqs.Queue(this, 'RetryDLQ', {
      queueName: 'codeflow-retry-dlq',
      retentionPeriod: cdk.Duration.days(14)
    });

    const retryQueue = new sqs.Queue(this, 'RetryQueue', {
      queueName: 'codeflow-retry-queue',
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: retryDlq,
        maxReceiveCount: 3
      }
    });

    // Lambda Layer for shared dependencies
    const depsLayer = new lambda.LayerVersion(this, 'DepsLayer', {
      code: lambda.Code.fromAsset('layers/deps'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared dependencies for CodeFlow'
    });

    // Webhook Dispatcher Lambda
    const webhookDispatcher = new lambda.Function(this, 'WebhookDispatcher', {
      functionName: 'codeflow-webhook-dispatcher',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/webhook-dispatcher'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [depsLayer],
      environment: {
        PORTALS_TABLE: portalsTable.tableName,
        EXECUTIONS_TABLE: executionsTable.tableName,
        USAGE_TABLE: usageTable.tableName,
        RETRY_QUEUE_URL: retryQueue.queueUrl
      }
    });

    portalsTable.grantReadData(webhookDispatcher);
    executionsTable.grantWriteData(webhookDispatcher);
    usageTable.grantReadWriteData(webhookDispatcher);
    retryQueue.grantSendMessages(webhookDispatcher);

    // Code Executor Lambda
    const codeExecutor = new lambda.Function(this, 'CodeExecutor', {
      functionName: 'codeflow-code-executor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/code-executor'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      layers: [depsLayer],
      environment: {
        PORTALS_TABLE: portalsTable.tableName,
        SNIPPETS_TABLE: snippetsTable.tableName,
        EXECUTIONS_TABLE: executionsTable.tableName,
        USAGE_TABLE: usageTable.tableName,
        PYTHON_EXECUTOR_FUNCTION: 'codeflow-python-executor'
      }
    });

    portalsTable.grantReadData(codeExecutor);
    snippetsTable.grantReadWriteData(codeExecutor);
    executionsTable.grantWriteData(codeExecutor);
    usageTable.grantReadWriteData(codeExecutor);

    // Python Executor Lambda
    const pythonExecutor = new lambda.Function(this, 'PythonExecutor', {
      functionName: 'codeflow-python-executor',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/python-executor'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });

    codeExecutor.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['lambda:InvokeFunction'],
      resources: [pythonExecutor.functionArn]
    }));

    // API Gateway
    const api = new apigateway.HttpApi(this, 'CodeFlowApi', {
      apiName: 'codeflow-api',
      corsPreflight: {
        allowOrigins: ['https://app.hubspot.com', 'https://*.hubspot.com'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ['*']
      }
    });

    // Routes
    api.addRoutes({
      path: '/v1/actions/webhook',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('WebhookIntegration', webhookDispatcher)
    });

    api.addRoutes({
      path: '/v1/actions/code',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigateway.HttpLambdaIntegration('CodeIntegration', codeExecutor)
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url!,
      description: 'API Gateway URL'
    });
  }
}
```

---

## Security Considerations

### Data Security
1. **Encryption at Rest**: All DynamoDB tables use AWS-managed encryption
2. **Encryption in Transit**: All API calls over HTTPS/TLS 1.2+
3. **Secrets**: Stored in AWS Secrets Manager with KMS encryption
4. **Tokens**: HubSpot tokens encrypted before storage

### Code Execution Security
1. **Sandboxing**: vm2 for Node.js isolation
2. **Resource Limits**: Memory and timeout constraints
3. **Network Isolation**: No direct filesystem or network access (except allowed HTTP)
4. **Dependency Control**: Whitelist of allowed npm/pip packages

### API Security
1. **HubSpot Signature Verification**: Validate X-HubSpot-Signature-v3
2. **JWT Authentication**: For settings app API calls
3. **Rate Limiting**: Per-portal request limits
4. **Input Validation**: Strict schema validation

### Compliance
1. **GDPR**: Data residency options, right to deletion
2. **SOC 2**: Audit logging, access controls
3. **PCI**: No storage of payment card data

---

## Monitoring & Alerts

### CloudWatch Metrics
- Execution count (by type, status)
- Execution duration (p50, p95, p99)
- Error rate
- API latency
- Lambda concurrency

### Alerts
- Error rate > 5%
- p99 latency > 10s
- DLQ message count > 0
- Lambda errors
- API 5xx errors

### Dashboards
- Real-time execution metrics
- Usage by portal
- Error breakdown
- Cost analysis

---

## Implementation Roadmap

### Phase 1: MVP (4 weeks)
- [ ] HubSpot OAuth integration
- [ ] Webhook action (basic)
- [ ] DynamoDB tables setup
- [ ] API Gateway + Lambda
- [ ] Basic settings page

### Phase 2: Core Features (4 weeks)
- [ ] Code execution action (Node.js)
- [ ] Snippet library
- [ ] Secrets manager
- [ ] Execution logs
- [ ] Usage tracking

### Phase 3: Advanced (4 weeks)
- [ ] Python runtime
- [ ] Pre-built templates
- [ ] Retry logic
- [ ] Alerts
- [ ] Full settings app

### Phase 4: Polish (2 weeks)
- [ ] HubSpot marketplace submission
- [ ] Documentation
- [ ] Testing
- [ ] Performance optimization

---

## Appendix

### Environment Variables

```bash
# Lambda
PORTALS_TABLE=codeflow-portals
SNIPPETS_TABLE=codeflow-snippets
EXECUTIONS_TABLE=codeflow-executions
USAGE_TABLE=codeflow-usage
RETRY_QUEUE_URL=https://sqs.xxx
PYTHON_EXECUTOR_FUNCTION=codeflow-python-executor

# App
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
HUBSPOT_APP_ID=xxx
JWT_SECRET=xxx
API_BASE_URL=https://api.codeflow.io
```

### Error Codes

| Code | Description |
|------|-------------|
| CF001 | Portal not found |
| CF002 | Portal suspended |
| CF003 | Usage limit exceeded |
| CF004 | Snippet not found |
| CF005 | Secret not found |
| CF006 | Invalid runtime |
| CF007 | Code execution timeout |
| CF008 | Code execution error |
| CF009 | Webhook request failed |
| CF010 | Invalid payload template |

### Rate Limits

| Resource | Limit |
|----------|-------|
| API requests | 1000/min per portal |
| Webhook executions | 100/sec per portal |
| Code executions | 50/sec per portal |
| Snippet operations | 100/min per portal |

---

*Document Version: 1.0*
*Last Updated: January 2025*