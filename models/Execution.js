const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  portalId: {
    type: String,
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: ['webhook', 'code'],
    required: true
  },
  // For code actions
  snippetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Snippet'
  },
  snippetName: {
    type: String
  },
  // For webhook actions
  webhookUrl: {
    type: String
  },
  webhookMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  // HubSpot context
  workflowId: {
    type: String
  },
  enrollmentId: {
    type: String
  },
  objectType: {
    type: String // contact, company, deal, ticket, etc.
  },
  objectId: {
    type: String
  },
  // Execution details
  status: {
    type: String,
    enum: ['success', 'error', 'timeout'],
    required: true
  },
  executionTimeMs: {
    type: Number
  },
  // Input/Output (truncated for storage)
  inputData: {
    type: mongoose.Schema.Types.Mixed
  },
  outputData: {
    type: mongoose.Schema.Types.Mixed
  },
  // Error details if failed
  errorMessage: {
    type: String
  },
  errorStack: {
    type: String
  },
  // HTTP details for webhooks
  httpStatusCode: {
    type: Number
  },
  httpResponse: {
    type: String,
    maxlength: 10000 // Truncate large responses
  },
  // Retry information
  retryAttempts: [{
    attempt: Number,
    status: String,
    httpStatusCode: Number,
    executionTimeMs: Number,
    errorMessage: String
  }]
}, {
  timestamps: true
});

// TTL index - automatically delete logs after 30 days
executionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for common queries
executionSchema.index({ portalId: 1, createdAt: -1 });
executionSchema.index({ portalId: 1, status: 1, createdAt: -1 });
executionSchema.index({ portalId: 1, actionType: 1, createdAt: -1 });
executionSchema.index({ portalId: 1, snippetId: 1, createdAt: -1 });

module.exports = mongoose.model('Execution', executionSchema);
