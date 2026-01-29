const axios = require('axios');
const Handlebars = require('handlebars');

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN']
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoffDelay(attempt, config) {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Check if error/response is retryable
 * @param {Object} result - Execution result
 * @param {Error} error - Error object (if any)
 * @param {Object} config - Retry configuration
 * @returns {boolean} - True if should retry
 */
function isRetryable(result, error, config) {
  // Check for retryable error codes
  if (error && config.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check for retryable HTTP status codes
  if (result && result.httpStatusCode && config.retryableStatusCodes.includes(result.httpStatusCode)) {
    return true;
  }

  // Timeout is retryable
  if (result && result.status === 'timeout') {
    return true;
  }

  return false;
}

/**
 * Process template strings with Handlebars
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} context - Context object with values
 * @returns {string} - Processed string
 */
function processTemplate(template, context) {
  if (!template || typeof template !== 'string') {
    return template;
  }

  try {
    const compiled = Handlebars.compile(template, { noEscape: true });
    return compiled(context);
  } catch (error) {
    console.error('Template processing error:', error.message);
    return template;
  }
}

/**
 * Process an object's values recursively with templates
 * @param {Object} obj - Object to process
 * @param {Object} context - Context for templates
 * @returns {Object} - Processed object
 */
function processObjectTemplates(obj, context) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processObjectTemplates(item, context));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = processTemplate(value, context);
    } else if (typeof value === 'object') {
      result[key] = processObjectTemplates(value, context);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Execute a single webhook request (no retry)
 * @param {Object} config - Webhook configuration
 * @param {Object} context - Context data from HubSpot workflow
 * @param {number} timeout - Request timeout in ms
 * @returns {Object} - Response data
 */
async function executeSingleRequest(config, context, timeout = 30000) {
  const startTime = Date.now();

  // Process templates in URL and body
  const url = processTemplate(config.url, context);
  const method = (config.method || 'POST').toUpperCase();

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'CodeFlow/1.0',
    ...(config.headers ? processObjectTemplates(config.headers, context) : {})
  };

  // Build request body for methods that support it
  let data = null;
  if (['POST', 'PUT', 'PATCH'].includes(method) && config.body) {
    if (typeof config.body === 'string') {
      // Try to parse as JSON template
      const processed = processTemplate(config.body, context);
      try {
        data = JSON.parse(processed);
      } catch {
        data = processed;
      }
    } else {
      data = processObjectTemplates(config.body, context);
    }
  }

  // Build query params
  const params = config.params ? processObjectTemplates(config.params, context) : undefined;

  let error = null;
  try {
    const response = await axios({
      method,
      url,
      headers,
      data,
      params,
      timeout,
      validateStatus: () => true // Don't throw on any status code
    });

    const executionTimeMs = Date.now() - startTime;

    // Parse response
    let responseData = response.data;
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Keep as string
      }
    }

    const isSuccess = response.status >= 200 && response.status < 300;

    return {
      success: isSuccess,
      status: isSuccess ? 'success' : 'error',
      httpStatusCode: response.status,
      httpResponse: typeof responseData === 'object'
        ? JSON.stringify(responseData).slice(0, 10000)
        : String(responseData).slice(0, 10000),
      data: responseData,
      executionTimeMs,
      headers: response.headers,
      error: null
    };
  } catch (err) {
    error = err;
    const executionTimeMs = Date.now() - startTime;

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return {
        success: false,
        status: 'timeout',
        errorMessage: `Request timed out after ${timeout}ms`,
        executionTimeMs,
        error: err
      };
    }

    return {
      success: false,
      status: 'error',
      errorMessage: err.message,
      errorCode: err.code,
      executionTimeMs,
      error: err
    };
  }
}

/**
 * Execute a webhook request with retry logic
 * @param {Object} config - Webhook configuration
 * @param {Object} context - Context data from HubSpot workflow
 * @param {number} timeout - Request timeout in ms
 * @param {Object} retryConfig - Retry configuration (optional)
 * @returns {Object} - Response data with retry info
 */
async function executeWebhook(config, context, timeout = 30000, retryConfig = {}) {
  const totalStartTime = Date.now();

  // Merge retry config with defaults
  const retry = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  };

  // Disable retry if maxRetries is 0
  if (retry.maxRetries === 0) {
    return executeSingleRequest(config, context, timeout);
  }

  let lastResult = null;
  let attempts = [];

  for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
    // Wait before retry (skip for first attempt)
    if (attempt > 0) {
      const delay = calculateBackoffDelay(attempt - 1, retry);
      console.log(`Webhook retry attempt ${attempt}/${retry.maxRetries} after ${delay}ms delay`);
      await sleep(delay);
    }

    // Execute the request
    const result = await executeSingleRequest(config, context, timeout);

    // Track attempt info
    attempts.push({
      attempt: attempt + 1,
      status: result.status,
      httpStatusCode: result.httpStatusCode,
      executionTimeMs: result.executionTimeMs,
      errorMessage: result.errorMessage
    });

    lastResult = result;

    // If successful, return immediately
    if (result.success) {
      return {
        ...result,
        totalExecutionTimeMs: Date.now() - totalStartTime,
        attempts,
        retriesUsed: attempt
      };
    }

    // Check if we should retry
    if (attempt < retry.maxRetries && isRetryable(result, result.error, retry)) {
      console.log(`Webhook failed (${result.errorMessage || result.httpStatusCode}), will retry...`);
      continue;
    }

    // Not retryable or max retries reached
    break;
  }

  // Return final result with retry info
  return {
    ...lastResult,
    totalExecutionTimeMs: Date.now() - totalStartTime,
    attempts,
    retriesUsed: attempts.length - 1,
    maxRetriesReached: attempts.length > retry.maxRetries
  };
}

/**
 * Extract output fields from response based on mappings
 * @param {Object} response - Webhook response
 * @param {Array} outputMappings - Array of output field mappings
 * @returns {Object} - Extracted output fields
 */
function extractOutputFields(response, outputMappings) {
  if (!outputMappings || !response.data) {
    return {};
  }

  const outputs = {};

  for (const mapping of outputMappings) {
    const { outputFieldName, jsonPath } = mapping;

    if (!jsonPath) {
      continue;
    }

    // Simple dot-notation path extraction
    const value = getValueByPath(response.data, jsonPath);
    if (value !== undefined) {
      outputs[outputFieldName] = value;
    }
  }

  return outputs;
}

/**
 * Get value from object by dot-notation path
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path (e.g., "data.user.name")
 * @returns {any} - Value at path or undefined
 */
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index notation like "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

module.exports = {
  executeWebhook,
  executeSingleRequest,
  processTemplate,
  processObjectTemplates,
  extractOutputFields,
  getValueByPath,
  DEFAULT_RETRY_CONFIG
};
