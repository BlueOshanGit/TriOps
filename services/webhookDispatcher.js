const axios = require('axios');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const dns = require('dns');
const { promisify } = require('util');
const logger = require('../utils/logger');

const dnsLookup = promisify(dns.lookup);

/**
 * Resolve all IP addresses for a hostname (IPv4 + IPv6)
 */
function dnsLookupAll(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses || []);
    });
  });
}

/**
 * Private/internal IP ranges that should be blocked for SSRF protection
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./,                          // Loopback (127.0.0.0/8)
  /^10\./,                           // Private Class A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B (172.16.0.0/12)
  /^192\.168\./,                     // Private Class C (192.168.0.0/16)
  /^169\.254\./,                     // Link-local (169.254.0.0/16)
  /^0\./,                            // Current network (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./,  // Carrier-grade NAT (100.64.0.0/10)
  /^192\.0\.0\./,                    // IETF Protocol Assignments (192.0.0.0/24)
  /^192\.0\.2\./,                    // TEST-NET-1 (192.0.2.0/24)
  /^198\.51\.100\./,                 // TEST-NET-2 (198.51.100.0/24)
  /^203\.0\.113\./,                  // TEST-NET-3 (203.0.113.0/24)
  /^224\./,                          // Multicast (224.0.0.0/4)
  /^240\./,                          // Reserved (240.0.0.0/4)
  /^255\./,                          // Broadcast
  /^::1$/,                           // IPv6 loopback
  /^fc00:/i,                         // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
];

/**
 * Blocked hostnames for SSRF protection
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',        // GCP metadata
  '169.254.169.254',                 // AWS/Azure/GCP metadata
  'metadata.azure.com',              // Azure metadata
];

/**
 * Validate URL for SSRF protection
 * @param {string} urlString - The URL to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow http and https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, error: `Protocol '${parsedUrl.protocol}' is not allowed. Use http or https.` };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block known internal hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, error: `Hostname '${hostname}' is not allowed for security reasons` };
  }

  // Check if hostname looks like an IP address
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    // Check against blocked IP patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: `IP address '${hostname}' is in a blocked range` };
      }
    }
  }

  // Block IPv6 internal addresses
  if (hostname.startsWith('[') || hostname.includes(':')) {
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: `IPv6 address '${hostname}' is in a blocked range` };
      }
    }
  }

  // Block URLs with credentials
  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' };
  }

  return { valid: true };
}

/**
 * Check if a resolved IP address is in a blocked range
 * @param {string} ip - Resolved IP address
 * @returns {boolean} - True if blocked
 */
function isBlockedIP(ip) {
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(ip)) return true;
  }
  if (BLOCKED_HOSTNAMES.includes(ip)) return true;
  return false;
}

/**
 * Resolve hostname and validate the resolved IP against blocked ranges
 * Prevents DNS rebinding SSRF attacks
 * Resolves ALL addresses (IPv4 + IPv6) for Node.js 24+ Happy Eyeballs support
 * @param {string} hostname - Hostname to resolve
 * @returns {Object} - { valid: boolean, resolvedAddresses?: Array, error?: string }
 */
async function validateResolvedIP(hostname) {
  // Skip DNS check for direct IP addresses (already validated by validateWebhookUrl)
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) return { valid: true };

  try {
    const addresses = await dnsLookupAll(hostname);
    if (!addresses || addresses.length === 0) {
      return { valid: false, error: `DNS resolution returned no addresses for '${hostname}'` };
    }
    for (const entry of addresses) {
      if (isBlockedIP(entry.address)) {
        return { valid: false, error: `Hostname '${hostname}' resolves to blocked IP '${entry.address}'` };
      }
    }
    return { valid: true, resolvedAddresses: addresses };
  } catch (err) {
    return { valid: false, error: `DNS resolution failed for '${hostname}': ${err.code || err.message}` };
  }
}

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

  // Simple {{path}} replacement — no Handlebars, no template injection risk
  return template.replace(/\{\{([^}]+)\}\}/g, (match, pathStr) => {
    const value = getValueByPath(context, pathStr.trim());
    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/**
 * Process an object's values recursively with templates
 * @param {Object} obj - Object to process
 * @param {Object} context - Context for templates
 * @param {number} depth - Current recursion depth (prevents stack overflow)
 * @returns {Object} - Processed object
 */
const MAX_TEMPLATE_DEPTH = 20;

function processObjectTemplates(obj, context, depth = 0) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (depth >= MAX_TEMPLATE_DEPTH) {
    return obj; // Stop recursing at depth limit
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processObjectTemplates(item, context, depth + 1));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = processTemplate(value, context);
    } else if (typeof value === 'object') {
      result[key] = processObjectTemplates(value, context, depth + 1);
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
 * @param {boolean} skipValidation - Skip URL validation (used when called from executeWebhook which already validated)
 * @param {Array|null} resolvedAddresses - Pre-resolved addresses to use (prevents DNS rebinding TOCTOU)
 * @returns {Object} - Response data
 */
async function executeSingleRequest(config, context, timeout = 30000, skipValidation = false, resolvedAddresses = null) {
  const startTime = Date.now();

  // Process templates in URL and body
  const url = processTemplate(config.url, context);
  const method = (config.method || 'POST').toUpperCase();

  // Validate URL for SSRF protection (if not already validated)
  if (!skipValidation) {
    const urlValidation = validateWebhookUrl(url);
    if (!urlValidation.valid) {
      return {
        success: false,
        status: 'error',
        errorMessage: `URL validation failed: ${urlValidation.error}`,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'HubHacks/1.0',
    ...(config.headers ? processObjectTemplates(config.headers, context) : {})
  };

  // Build request body
  let data = null;
  let params = config.params ? processObjectTemplates(config.params, context) : undefined;

  if (config.body) {
    let processedBody;
    if (typeof config.body === 'string') {
      // Try to parse as JSON template
      const processed = processTemplate(config.body, context);
      try {
        processedBody = JSON.parse(processed);
      } catch {
        processedBody = processed;
      }
    } else {
      processedBody = processObjectTemplates(config.body, context);
    }

    // For GET requests, convert body to query parameters
    if (method === 'GET' && typeof processedBody === 'object') {
      params = { ...params, ...processedBody };
    } else {
      // POST, PUT, PATCH, DELETE - send body in request body
      data = processedBody;
    }
  }

  // Create custom agents that pin to the validated IP to prevent DNS rebinding
  const axiosOptions = {
    method,
    url,
    headers,
    data,
    params,
    timeout,
    validateStatus: () => true // Don't throw on any status code
  };

  if (resolvedAddresses && resolvedAddresses.length > 0) {
    const pinnedLookup = (_hostname, options, cb) => {
      if (options && options.all) {
        cb(null, resolvedAddresses);
      } else {
        cb(null, resolvedAddresses[0].address, resolvedAddresses[0].family);
      }
    };
    axiosOptions.httpAgent = new http.Agent({ lookup: pinnedLookup });
    axiosOptions.httpsAgent = new https.Agent({ lookup: pinnedLookup });
  }

  let error = null;
  try {
    const response = await axios(axiosOptions);

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

    // Limit response data size to prevent memory issues
    let limitedData = responseData;
    if (typeof responseData === 'object') {
      const serialized = JSON.stringify(responseData);
      if (serialized.length > 100000) { // 100KB limit
        limitedData = JSON.parse(serialized.slice(0, 100000));
      }
    }

    return {
      success: isSuccess,
      status: isSuccess ? 'success' : 'error',
      httpStatusCode: response.status,
      httpResponse: typeof responseData === 'object'
        ? JSON.stringify(responseData).slice(0, 10000)
        : String(responseData).slice(0, 10000),
      data: limitedData,
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

  // Process the URL template first to get the final URL
  const processedUrl = processTemplate(config.url, context);

  // Validate URL for SSRF protection
  const urlValidation = validateWebhookUrl(processedUrl);
  if (!urlValidation.valid) {
    return {
      success: false,
      status: 'error',
      errorMessage: `URL validation failed: ${urlValidation.error}`,
      executionTimeMs: Date.now() - totalStartTime,
      totalExecutionTimeMs: Date.now() - totalStartTime,
      attempts: [],
      retriesUsed: 0
    };
  }

  // Resolve DNS and check resolved IP against blocked ranges (prevent DNS rebinding)
  // Pin the resolved IPs so the actual HTTP request uses the same IPs we validated
  let resolvedAddresses = null;
  try {
    const parsedUrl = new URL(processedUrl);
    const dnsCheck = await validateResolvedIP(parsedUrl.hostname);
    if (!dnsCheck.valid) {
      return {
        success: false,
        status: 'error',
        errorMessage: `SSRF protection: ${dnsCheck.error}`,
        executionTimeMs: Date.now() - totalStartTime,
        totalExecutionTimeMs: Date.now() - totalStartTime,
        attempts: [],
        retriesUsed: 0
      };
    }
    resolvedAddresses = dnsCheck.resolvedAddresses || null; // null for direct IP addresses
  } catch (dnsError) {
    return {
      success: false,
      status: 'error',
      errorMessage: `DNS validation failed: ${dnsError.message}`,
      executionTimeMs: Date.now() - totalStartTime,
      totalExecutionTimeMs: Date.now() - totalStartTime,
      attempts: [],
      retriesUsed: 0
    };
  }

  // Merge retry config with defaults
  const retry = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  };

  // Disable retry if maxRetries is 0
  if (retry.maxRetries === 0) {
    return executeSingleRequest(config, context, timeout, true, resolvedAddresses); // skip validation - already done
  }

  let lastResult = null;
  let attempts = [];

  for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
    // Wait before retry (skip for first attempt)
    if (attempt > 0) {
      const delay = calculateBackoffDelay(attempt - 1, retry);
      logger.info(`Webhook retry attempt ${attempt}/${retry.maxRetries} after ${delay}ms delay`);
      await sleep(delay);
    }

    // Execute the request (skip validation - already done above, pin to validated IPs)
    const result = await executeSingleRequest(config, context, timeout, true, resolvedAddresses);

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
      logger.info(`Webhook failed (${result.errorMessage || result.httpStatusCode}), will retry...`);
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
// Keys that must never be traversed to prevent prototype pollution reads
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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
      const key = arrayMatch[1];
      if (BLOCKED_KEYS.has(key)) return undefined;
      current = current[key];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)];
      } else {
        return undefined;
      }
    } else {
      if (BLOCKED_KEYS.has(part)) return undefined;
      if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined;
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
  validateWebhookUrl,
  validateResolvedIP,
  DEFAULT_RETRY_CONFIG
};
