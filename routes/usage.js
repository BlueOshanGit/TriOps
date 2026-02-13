const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Usage = require('../models/Usage');
const Snippet = require('../models/Snippet');
const Secret = require('../models/Secret');
const Execution = require('../models/Execution');
const logger = require('../utils/logger');

// All routes require authentication
router.use(requireAuth);

/**
 * Get usage overview
 * GET /api/usage
 */
router.get('/', async (req, res) => {
  try {
    const { days: rawDays = 30 } = req.query;
    const days = Math.max(1, Math.min(parseInt(rawDays, 10) || 30, 365));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get usage records
    const usageRecords = await Usage.find({
      portalId: req.portalId,
      date: { $gte: startDate }
    }).sort('date');

    // Aggregate totals
    const totals = usageRecords.reduce((acc, record) => {
      acc.webhookExecutions += record.webhookExecutions;
      acc.codeExecutions += record.codeExecutions;
      acc.successCount += record.successCount;
      acc.errorCount += record.errorCount;
      acc.timeoutCount += record.timeoutCount;
      acc.totalExecutionTimeMs += record.totalExecutionTimeMs;
      return acc;
    }, {
      webhookExecutions: 0,
      codeExecutions: 0,
      successCount: 0,
      errorCount: 0,
      timeoutCount: 0,
      totalExecutionTimeMs: 0
    });

    const totalExecutions = totals.webhookExecutions + totals.codeExecutions;

    res.json({
      period: {
        days: parseInt(days, 10),
        startDate,
        endDate: new Date()
      },
      totals: {
        ...totals,
        totalExecutions,
        successRate: totalExecutions > 0
          ? Math.round((totals.successCount / totalExecutions) * 100)
          : 0,
        avgExecutionTimeMs: totalExecutions > 0
          ? Math.round(totals.totalExecutionTimeMs / totalExecutions)
          : 0
      },
      dailyUsage: usageRecords.map(r => ({
        date: r.date,
        webhookExecutions: r.webhookExecutions,
        codeExecutions: r.codeExecutions,
        successCount: r.successCount,
        errorCount: r.errorCount,
        avgExecutionTimeMs: r.avgExecutionTimeMs
      }))
    });
  } catch (error) {
    logger.error('Get usage error', { error: error.message });
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

/**
 * Get resource counts
 * GET /api/usage/resources
 */
router.get('/resources', async (req, res) => {
  try {
    const [snippetCount, secretCount] = await Promise.all([
      Snippet.countDocuments({ portalId: req.portalId, isActive: true }),
      Secret.countDocuments({ portalId: req.portalId })
    ]);

    const portal = req.portal;
    const maxSnippets = portal.settings?.maxSnippets || 100;
    const maxSecrets = portal.settings?.maxSecrets || 50;

    res.json({
      snippets: {
        current: snippetCount,
        limit: maxSnippets,
        percentUsed: maxSnippets > 0 ? Math.round((snippetCount / maxSnippets) * 100) : 0
      },
      secrets: {
        current: secretCount,
        limit: maxSecrets,
        percentUsed: maxSecrets > 0 ? Math.round((secretCount / maxSecrets) * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Get resources error', { error: error.message });
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

/**
 * Get top snippets by usage
 * GET /api/usage/top-snippets
 */
router.get('/top-snippets', async (req, res) => {
  try {
    const { limit: rawLimit = 10 } = req.query;
    const limit = Math.max(1, Math.min(parseInt(rawLimit, 10) || 10, 100));

    const snippets = await Snippet.find({
      portalId: req.portalId,
      isActive: true
    })
      .sort('-executionCount')
      .limit(limit)
      .select('name executionCount lastExecutedAt');

    res.json({ snippets });
  } catch (error) {
    logger.error('Get top snippets error', { error: error.message });
    res.status(500).json({ error: 'Failed to get top snippets' });
  }
});

/**
 * Get unique workflows using HubHacks
 * GET /api/usage/workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    const { days: rawDays = 30 } = req.query;
    const days = Math.max(1, Math.min(parseInt(rawDays, 10) || 30, 365));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const workflows = await Execution.aggregate([
      {
        $match: {
          portalId: req.portalId,
          createdAt: { $gte: startDate },
          workflowId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$workflowId',
          executionCount: { $sum: 1 },
          lastExecution: { $max: '$createdAt' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          errorCount: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          }
        }
      },
      { $sort: { executionCount: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      uniqueWorkflowCount: workflows.length,
      workflows: workflows.map(w => ({
        workflowId: w._id,
        executionCount: w.executionCount,
        lastExecution: w.lastExecution,
        successRate: w.executionCount > 0
          ? Math.round((w.successCount / w.executionCount) * 100)
          : 0
      }))
    });
  } catch (error) {
    logger.error('Get workflows error', { error: error.message });
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

/**
 * Get hourly distribution of executions
 * GET /api/usage/hourly
 */
router.get('/hourly', async (req, res) => {
  try {
    const { days: rawDays = 7 } = req.query;
    const days = Math.max(1, Math.min(parseInt(rawDays, 10) || 7, 90));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const hourlyStats = await Execution.aggregate([
      {
        $match: {
          portalId: req.portalId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0
    }));

    hourlyStats.forEach(stat => {
      hourlyData[stat._id].count = stat.count;
    });

    res.json({ hourlyData });
  } catch (error) {
    logger.error('Get hourly stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to get hourly stats' });
  }
});

module.exports = router;
