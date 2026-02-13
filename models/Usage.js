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
  formatExecutions: {
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

  const actionTypeField = executionData.actionType === 'webhook' ? 'webhookExecutions'
    : executionData.actionType === 'format' ? 'formatExecutions' : 'codeExecutions';

  // Validate status to prevent arbitrary field creation
  const allowedStatuses = ['success', 'error', 'timeout'];
  const status = allowedStatuses.includes(executionData.status) ? executionData.status : 'error';

  const update = {
    $inc: {
      [actionTypeField]: 1,
      [`${status}Count`]: 1,
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

  // Use aggregation pipeline update to compute derived fields atomically in a single operation.
  // This prevents race conditions where concurrent requests read stale counters.
  const usage = await this.findOneAndUpdate(
    { portalId, date: today },
    [
      { $set: update.$inc ? Object.fromEntries(
        Object.entries(update.$inc).map(([k, v]) => [k, { $add: [{ $ifNull: [`$${k}`, 0] }, v] }])
      ) : {} },
      { $set: {
        maxExecutionTimeMs: { $max: [{ $ifNull: ['$maxExecutionTimeMs', 0] }, executionData.executionTimeMs || 0] },
        workflowIds: executionData.workflowId
          ? { $setUnion: [{ $ifNull: ['$workflowIds', []] }, [executionData.workflowId]] }
          : { $ifNull: ['$workflowIds', []] }
      } },
      { $set: {
        avgExecutionTimeMs: {
          $cond: {
            if: { $gt: [{ $add: ['$webhookExecutions', '$codeExecutions', { $ifNull: ['$formatExecutions', 0] }] }, 0] },
            then: { $round: [{ $divide: ['$totalExecutionTimeMs', { $add: ['$webhookExecutions', '$codeExecutions', { $ifNull: ['$formatExecutions', 0] }] }] }, 0] },
            else: 0
          }
        },
        uniqueWorkflows: { $size: { $ifNull: ['$workflowIds', []] } }
      } }
    ],
    { upsert: true, new: true }
  );

  return usage;
};

module.exports = mongoose.model('Usage', usageSchema);
