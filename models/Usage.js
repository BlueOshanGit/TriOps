const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  portalId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Execution counts
  webhookExecutions: {
    type: Number,
    default: 0
  },
  codeExecutions: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  timeoutCount: {
    type: Number,
    default: 0
  },
  // Performance metrics
  totalExecutionTimeMs: {
    type: Number,
    default: 0
  },
  avgExecutionTimeMs: {
    type: Number,
    default: 0
  },
  maxExecutionTimeMs: {
    type: Number,
    default: 0
  },
  // Resource usage
  snippetsUsed: [{
    snippetId: mongoose.Schema.Types.ObjectId,
    count: Number
  }],
  uniqueWorkflows: {
    type: Number,
    default: 0
  },
  workflowIds: [{
    type: String
  }]
}, {
  timestamps: true
});

// Compound index for unique daily records per portal
usageSchema.index({ portalId: 1, date: 1 }, { unique: true });

// TTL index - keep usage data for 90 days
usageSchema.index({ date: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to record an execution
usageSchema.statics.recordExecution = async function(portalId, executionData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const update = {
    $inc: {
      [executionData.actionType === 'webhook' ? 'webhookExecutions' : 'codeExecutions']: 1,
      [`${executionData.status}Count`]: 1,
      totalExecutionTimeMs: executionData.executionTimeMs || 0
    },
    $max: {
      maxExecutionTimeMs: executionData.executionTimeMs || 0
    },
    $addToSet: {}
  };

  if (executionData.workflowId) {
    update.$addToSet.workflowIds = executionData.workflowId;
  }

  const usage = await this.findOneAndUpdate(
    { portalId, date: today },
    update,
    { upsert: true, new: true }
  );

  // Update average execution time
  const totalExecutions = usage.webhookExecutions + usage.codeExecutions;
  if (totalExecutions > 0) {
    usage.avgExecutionTimeMs = Math.round(usage.totalExecutionTimeMs / totalExecutions);
    usage.uniqueWorkflows = usage.workflowIds.length;
    await usage.save();
  }

  return usage;
};

module.exports = mongoose.model('Usage', usageSchema);
