const express = require('express');
const router = express.Router();
const { verifyWorkflowActionSignature } = require('../middleware/hubspotSignature');
const { executeWebhook, extractOutputFields } = require('../services/webhookDispatcher');
const { executeCode } = require('../services/codeExecutor');
const { decrypt } = require('../services/encryption');
const Portal = require('../models/Portal');
const Snippet = require('../models/Snippet');
const Secret = require('../models/Secret');
const Execution = require('../models/Execution');
const Usage = require('../models/Usage');
const logger = require('../utils/logger');

/**
 * Sanitize error messages before returning to external callers.
 * Strips internal details like file paths, connection strings, and stack traces.
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return 'An internal error occurred';
  // Strip file paths (Unix and Windows)
  let safe = message.replace(/\/[^\s:]+\.[jt]s[x]?/g, '[path]');
  safe = safe.replace(/[A-Z]:\\[^\s:]+\.[jt]s[x]?/gi, '[path]');
  // Strip MongoDB connection strings
  safe = safe.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[connection]');
  // Truncate to reasonable length
  return safe.slice(0, 500);
}

// Length limits to prevent resource abuse
const MAX_FORMULA_LENGTH = 5000;   // Max characters for custom mode formulas
const MAX_INLINE_CODE_LENGTH = 50000; // Max characters for inline code (~50KB)
const MAX_INPUT_LENGTH = 10000;    // Max characters for individual format inputs

/**
 * Formula Evaluation for Custom Mode
 * Supports: concat(), upper(), lower(), trim(), substring(), replace(), if(), math operations
 */
function evaluateFormula(formula, object = {}, inputs = {}) {
  let result = formula;

  // Replace {{property}} placeholders with object property values
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, propPath) => {
    const props = object.properties || object;
    const value = getNestedValue(props, propPath.trim());
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Replace [[input]] placeholders with input field values
  result = result.replace(/\[\[([^\]]+)\]\]/g, (match, inputName) => {
    const value = inputs[inputName.trim()];
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Process functions
  result = processFormulaFunctions(result);

  return result;
}

/**
 * Process formula functions like concat(), upper(), lower(), etc.
 */
function processFormulaFunctions(formula) {
  let result = formula;
  let iterations = 0;
  const maxIterations = 50; // Prevent infinite loops

  // Process nested functions from innermost to outermost
  while (iterations < maxIterations) {
    const previousResult = result;

    // concat(arg1, arg2, ...)
    result = result.replace(/concat\(([^)]*)\)/gi, (match, args) => {
      const parts = splitArgs(args);
      return parts.join('');
    });

    // upper(text)
    result = result.replace(/upper\(([^)]*)\)/gi, (match, text) => {
      return text.toUpperCase();
    });

    // lower(text)
    result = result.replace(/lower\(([^)]*)\)/gi, (match, text) => {
      return text.toLowerCase();
    });

    // trim(text)
    result = result.replace(/trim\(([^)]*)\)/gi, (match, text) => {
      return text.trim();
    });

    // trimall(text) - removes all whitespace
    result = result.replace(/trimall\(([^)]*)\)/gi, (match, text) => {
      return text.replace(/\s+/g, '');
    });

    // capitalize(text)
    result = result.replace(/capitalize\(([^)]*)\)/gi, (match, text) => {
      return text.replace(/\b\w/g, char => char.toUpperCase());
    });

    // substring(text, start, length)
    result = result.replace(/substring\(([^,]+),\s*(\d+)(?:,\s*(\d+))?\)/gi, (match, text, start, length) => {
      const startIdx = parseInt(start, 10);
      if (length !== undefined) {
        return text.substring(startIdx, startIdx + parseInt(length, 10));
      }
      return text.substring(startIdx);
    });

    // replace(text, search, replacement)
    result = result.replace(/replace\(([^,]+),\s*([^,]+),\s*([^)]*)\)/gi, (match, text, search, replacement) => {
      return text.split(search).join(replacement);
    });

    // length(text)
    result = result.replace(/length\(([^)]*)\)/gi, (match, text) => {
      return String(text.length);
    });

    // if(condition, thenValue, elseValue)
    result = result.replace(/if\(([^,]+),\s*([^,]+),\s*([^)]*)\)/gi, (match, condition, thenVal, elseVal) => {
      const isTruthy = condition && condition !== 'false' && condition !== '0' &&
                       condition !== 'null' && condition !== 'undefined' && condition.trim() !== '';
      return isTruthy ? thenVal : elseVal;
    });

    // default(value, defaultValue)
    result = result.replace(/default\(([^,]*),\s*([^)]*)\)/gi, (match, value, defaultVal) => {
      return (value && value.trim() !== '') ? value : defaultVal;
    });

    // round(number, decimals)
    result = result.replace(/round\(([^,]+)(?:,\s*(\d+))?\)/gi, (match, num, decimals) => {
      const n = parseFloat(num);
      if (isNaN(n)) return num;
      const d = parseInt(decimals || '0', 10);
      const factor = Math.pow(10, d);
      return String(Math.round(n * factor) / factor);
    });

    // floor(number)
    result = result.replace(/floor\(([^)]+)\)/gi, (match, num) => {
      const n = parseFloat(num);
      return isNaN(n) ? num : String(Math.floor(n));
    });

    // ceil(number)
    result = result.replace(/ceil\(([^)]+)\)/gi, (match, num) => {
      const n = parseFloat(num);
      return isNaN(n) ? num : String(Math.ceil(n));
    });

    // abs(number)
    result = result.replace(/abs\(([^)]+)\)/gi, (match, num) => {
      const n = parseFloat(num);
      return isNaN(n) ? num : String(Math.abs(n));
    });

    // Math operations — correct precedence: multiplication/division FIRST, then addition/subtraction
    result = result.replace(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)/g, (match, a, b) => {
      return String(parseFloat(a) * parseFloat(b));
    });
    result = result.replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, (match, a, b) => {
      const divisor = parseFloat(b);
      if (divisor === 0) return 'ERROR:DIV/0';
      return String(parseFloat(a) / divisor);
    });
    result = result.replace(/(?<![.\w-])(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/g, (match, a, b) => {
      return String(parseFloat(a) + parseFloat(b));
    });
    result = result.replace(/(?<![.\w])(\d+(?:\.\d+)?)\s+-\s+(\d+(?:\.\d+)?)/g, (match, a, b) => {
      return String(parseFloat(a) - parseFloat(b));
    });

    // If no changes were made, we're done
    if (result === previousResult) break;
    iterations++;
  }

  return result;
}

/**
 * Split function arguments, respecting nested parentheses
 */
function splitArgs(argsString) {
  const args = [];
  let current = '';
  let depth = 0;

  for (const char of argsString) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());

  return args;
}


/**
 * Send Webhook Action
 * POST /v1/actions/webhook
 */
router.post('/webhook', verifyWorkflowActionSignature, async (req, res) => {
  const startTime = Date.now();
  const { portalId, callbackId } = req;

  const {
    inputFields = {},
    object = {},
    context: workflow = {}
  } = req.body;

  // Extract webhook configuration from input fields
  const {
    webhookUrl,
    webhookMethod = 'POST',
    webhookHeaders,
    webhookBody,
    outputMappings,
    // Retry configuration
    retryEnabled = 'true',
    maxRetries = '3',
    initialDelayMs,
    retryDelayMs,
    maxDelayMs = '10000'
  } = inputFields;

  if (!webhookUrl) {
    return res.status(400).json({
      outputFields: {
        hubhacks_error: 'Missing webhook URL'
      }
    });
  }

  try {
    // Get portal settings
    const portal = await Portal.findOne({ portalId });
    const timeout = portal?.settings?.webhookTimeout || 30000;

    // Build context for template processing
    const context = {
      object,
      workflow,
      inputs: inputFields,
      portalId
    };

    // Parse headers if provided as JSON string
    let headers = {};
    if (webhookHeaders) {
      try {
        headers = typeof webhookHeaders === 'string'
          ? JSON.parse(webhookHeaders)
          : webhookHeaders;
      } catch {
        headers = {};
      }
    }

    // Parse body if provided as JSON string
    let body = webhookBody;
    if (typeof webhookBody === 'string') {
      try {
        body = JSON.parse(webhookBody);
      } catch {
        body = webhookBody;
      }
    }

    // Build retry configuration (handle string "true"/"false" from HubSpot UI)
    const isRetryEnabled = retryEnabled === true || retryEnabled === 'true';
    const retryConfig = isRetryEnabled ? {
      maxRetries: parseInt(maxRetries, 10) || 3,
      initialDelayMs: parseInt(retryDelayMs || initialDelayMs, 10) || 1000,
      maxDelayMs: parseInt(maxDelayMs, 10) || 10000,
      backoffMultiplier: 2
    } : { maxRetries: 0 };

    // Execute the webhook with retry
    const result = await executeWebhook({
      url: webhookUrl,
      method: webhookMethod,
      headers,
      body: body || { object, workflow }
    }, context, timeout, retryConfig);

    // Extract output fields if mappings provided
    let outputFields = {};
    if (outputMappings && result.success) {
      try {
        const mappings = typeof outputMappings === 'string'
          ? JSON.parse(outputMappings)
          : outputMappings;
        outputFields = extractOutputFields(result, mappings);
      } catch {
        // Ignore mapping errors
      }
    }

    // Add status fields
    outputFields.hubhacks_success = result.success;
    outputFields.hubhacks_status_code = result.httpStatusCode;
    outputFields.hubhacks_retries_used = result.retriesUsed || 0;
    if (!result.success) {
      outputFields.hubhacks_error = result.errorMessage;
    }

    // Log execution
    await Execution.create({
      portalId,
      actionType: 'webhook',
      webhookUrl,
      webhookMethod,
      workflowId: workflow.workflowId,
      enrollmentId: callbackId,
      objectType: object.objectType,
      objectId: object.objectId,
      status: result.success ? 'success' : result.status,
      executionTimeMs: result.totalExecutionTimeMs || result.executionTimeMs,
      inputData: {
        url: webhookUrl,
        method: webhookMethod,
        retryConfig: retryConfig
      },
      outputData: outputFields,
      errorMessage: result.errorMessage,
      httpStatusCode: result.httpStatusCode,
      httpResponse: result.httpResponse,
      retryAttempts: result.attempts || []
    });

    // Record usage
    await Usage.recordExecution(portalId, {
      actionType: 'webhook',
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      workflowId: workflow.workflowId
    });

    res.json({ outputFields });
  } catch (error) {
    logger.error('Webhook action error', { error: error.message });

    // Log error execution — wrapped to prevent crash in error handler
    try {
      await Execution.create({
        portalId,
        actionType: 'webhook',
        webhookUrl,
        webhookMethod,
        workflowId: workflow?.workflowId,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message
      });
    } catch (logError) {
      logger.error('Failed to log webhook error execution', { error: logError.message });
    }

    res.json({
      outputFields: {
        hubhacks_success: false,
        hubhacks_error: sanitizeErrorMessage(error.message)
      }
    });
  }
});

/**
 * Run Code Action
 * POST /v1/actions/code
 */
router.post('/code', verifyWorkflowActionSignature, async (req, res) => {
  const startTime = Date.now();
  const { portalId, callbackId } = req;

  const {
    inputFields = {},
    object = {},
    context: workflow = {}
  } = req.body;

  const {
    snippetId,
    inlineCode,
    ...customInputs
  } = inputFields;

  try {
    // Get portal settings
    const portal = await Portal.findOne({ portalId });
    const timeout = portal?.settings?.codeTimeout || 10000;

    // Get code to execute
    let code;
    let snippetDoc = null;

    if (snippetId) {
      snippetDoc = await Snippet.findOne({ _id: snippetId, portalId });
      if (!snippetDoc) {
        return res.json({
          outputFields: {
            hubhacks_success: false,
            hubhacks_error: 'Snippet not found'
          }
        });
      }
      code = snippetDoc.code;
    } else if (inlineCode) {
      if (String(inlineCode).length > MAX_INLINE_CODE_LENGTH) {
        return res.json({
          outputFields: {
            hubhacks_success: false,
            hubhacks_error: `Inline code too long (${String(inlineCode).length} chars). Maximum is ${MAX_INLINE_CODE_LENGTH} characters.`
          }
        });
      }
      code = inlineCode;
    } else {
      return res.json({
        outputFields: {
          hubhacks_success: false,
          hubhacks_error: 'No code provided (specify snippetId or inlineCode)'
        }
      });
    }

    // Load secrets for this portal — only decrypt those referenced in the code
    const secretDocs = await Secret.find({ portalId });
    const secrets = {};
    const secretUpdateIds = [];
    for (const secret of secretDocs) {
      const isReferenced = code.includes(`secrets.${secret.name}`) ||
        code.includes(`secrets['${secret.name}']`) ||
        code.includes(`secrets["${secret.name}"]`);
      if (!isReferenced) continue;

      try {
        secrets[secret.name] = decrypt(
          secret.encryptedValue,
          secret.iv,
          secret.authTag
        );
        secretUpdateIds.push(secret._id);
      } catch (decryptError) {
        logger.error(`Failed to decrypt secret ${secret.name}`, { error: decryptError.message });
        secrets[secret.name] = null;
      }
    }

    // Atomic bulk update for secret usage tracking (prevents race conditions)
    if (secretUpdateIds.length > 0) {
      Secret.updateMany(
        { _id: { $in: secretUpdateIds } },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      ).catch(err => logger.error('Failed to update secret usage', { error: err.message }));
    }

    // Build context
    const context = {
      object,
      workflow,
      portalId,
      enrollmentId: callbackId
    };

    // Execute code
    const result = await executeCode({
      code,
      inputs: customInputs,
      secrets,
      context,
      timeout
    });

    // Build output fields from result
    const outputFields = {
      hubhacks_success: result.success,
      ...(result.output || {})
    };

    if (!result.success) {
      outputFields.hubhacks_error = result.errorMessage;
    }

    // Log execution
    await Execution.create({
      portalId,
      actionType: 'code',
      snippetId: snippetDoc?._id,
      snippetName: snippetDoc?.name,
      workflowId: workflow.workflowId,
      enrollmentId: callbackId,
      objectType: object.objectType,
      objectId: object.objectId,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      inputData: customInputs,
      outputData: result.output,
      errorMessage: result.errorMessage
    });

    // Update snippet stats if used
    if (snippetDoc) {
      snippetDoc.executionCount += 1;
      snippetDoc.lastExecutedAt = new Date();
      await snippetDoc.save();
    }

    // Record usage
    await Usage.recordExecution(portalId, {
      actionType: 'code',
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      workflowId: workflow.workflowId,
      snippetId: snippetDoc?._id
    });

    res.json({ outputFields });
  } catch (error) {
    logger.error('Code action error', { error: error.message });

    try {
      await Execution.create({
        portalId,
        actionType: 'code',
        snippetId: inputFields.snippetId,
        workflowId: workflow?.workflowId,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message
      });
    } catch (logError) {
      logger.error('Failed to log code error execution', { error: logError.message });
    }

    res.json({
      outputFields: {
        hubhacks_success: false,
        hubhacks_error: sanitizeErrorMessage(error.message)
      }
    });
  }
});

/**
 * Format Data Action
 * POST /v1/actions/format
 */
router.post('/format', verifyWorkflowActionSignature, async (req, res) => {
  const startTime = Date.now();
  const { portalId, callbackId } = req;

  const {
    inputFields = {},
    object = {},
    context: workflow = {}
  } = req.body;

  const {
    customMode,
    formula,
    operation,
    input1,
    input2,
    input3,
    formatOptions
  } = inputFields;

  // Custom mode - evaluate formula (triggered by customMode flag OR formula without operation)
  if (customMode === true || customMode === 'true' || (formula && !operation)) {
    if (!formula) {
      return res.json({
        outputFields: {
          hubhacks_success: false,
          hubhacks_error: 'No formula specified in custom mode'
        }
      });
    }

    if (String(formula).length > MAX_FORMULA_LENGTH) {
      return res.json({
        outputFields: {
          hubhacks_success: false,
          hubhacks_error: `Formula too long (${String(formula).length} chars). Maximum is ${MAX_FORMULA_LENGTH} characters.`
        }
      });
    }

    try {
      const result = evaluateFormula(formula, object, inputFields);
      const resultNumber = !isNaN(parseFloat(result)) ? parseFloat(result) : null;

      // Log execution
      await Execution.create({
        portalId,
        actionType: 'format',
        workflowId: workflow.workflowId,
        enrollmentId: callbackId,
        objectType: object.objectType,
        objectId: object.objectId,
        status: 'success',
        executionTimeMs: Date.now() - startTime,
        inputData: { customMode: true, formula },
        outputData: { result, result_number: resultNumber }
      });

      // Record usage
      await Usage.recordExecution(portalId, {
        actionType: 'format',
        status: 'success',
        executionTimeMs: Date.now() - startTime,
        workflowId: workflow.workflowId
      });

      return res.json({
        outputFields: {
          hubhacks_success: true,
          result: String(result),
          result_number: resultNumber
        }
      });
    } catch (formulaError) {
      try {
        await Execution.create({
          portalId,
          actionType: 'format',
          workflowId: workflow?.workflowId,
          status: 'error',
          executionTimeMs: Date.now() - startTime,
          errorMessage: formulaError.message
        });
      } catch (logError) {
        logger.error('Failed to log formula error execution', { error: logError.message });
      }

      return res.json({
        outputFields: {
          hubhacks_success: false,
          hubhacks_error: `Formula error: ${formulaError.message}`
        }
      });
    }
  }

  if (!operation) {
    return res.json({
      outputFields: {
        hubhacks_success: false,
        hubhacks_error: 'No operation specified'
      }
    });
  }

  // Validate input lengths for standard operations
  for (const [label, val] of [['input1', input1], ['input2', input2], ['input3', input3]]) {
    if (val && String(val).length > MAX_INPUT_LENGTH) {
      return res.json({
        outputFields: {
          hubhacks_success: false,
          hubhacks_error: `${label} too long (${String(val).length} chars). Maximum is ${MAX_INPUT_LENGTH} characters.`
        }
      });
    }
  }

  try {
    let result;
    let resultNumber = null;

    switch (operation) {
      // Text Operations
      case 'uppercase':
        result = String(input1 || '').toUpperCase();
        break;

      case 'lowercase':
        result = String(input1 || '').toLowerCase();
        break;

      case 'capitalize':
        result = String(input1 || '').replace(/\b\w/g, char => char.toUpperCase());
        break;

      case 'trim':
        result = String(input1 || '').trim();
        break;

      case 'trimwhitespace':
        result = String(input1 || '').replace(/\s+/g, '');
        break;

      case 'concat':
        result = String(input1 || '') + String(input2 || '') + String(input3 || '');
        break;

      case 'substring': {
        const str = String(input1 || '');
        const start = parseInt(input2, 10) || 0;
        const length = input3 ? parseInt(input3, 10) : undefined;
        result = length !== undefined ? str.substring(start, start + length) : str.substring(start);
        break;
      }

      case 'replace':
        result = String(input1 || '').split(String(input2 || '')).join(String(input3 || ''));
        break;

      case 'split': {
        const delimiter = input2 || ',';
        const index = parseInt(input3, 10);
        const parts = String(input1 || '').split(delimiter);
        result = !isNaN(index) ? (parts[index] || '') : parts.join('|');
        break;
      }

      case 'length':
        result = String(input1 || '').length.toString();
        resultNumber = String(input1 || '').length;
        break;

      // Number Operations
      case 'number_format': {
        const num = parseFloat(input1);
        if (isNaN(num)) {
          result = input1;
        } else {
          const decimals = parseInt(formatOptions || input2, 10) || 2;
          result = num.toFixed(decimals);
          resultNumber = parseFloat(result);
        }
        break;
      }

      case 'currency': {
        const num = parseFloat(input1);
        if (isNaN(num)) {
          result = input1;
        } else {
          const currency = formatOptions || input2 || 'USD';
          const locale = input3 || 'en-US';
          try {
            result = new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency
            }).format(num);
          } catch {
            result = `${currency} ${num.toFixed(2)}`;
          }
          resultNumber = num;
        }
        break;
      }

      case 'percentage': {
        const num = parseFloat(input1);
        if (isNaN(num)) {
          result = input1;
        } else {
          const decimals = parseInt(formatOptions || input2, 10) || 0;
          const percentage = num * 100;
          result = percentage.toFixed(decimals) + '%';
          resultNumber = percentage;
        }
        break;
      }

      case 'round': {
        const num = parseFloat(input1);
        if (isNaN(num)) {
          result = input1;
        } else {
          const decimals = parseInt(formatOptions || input2, 10) || 0;
          const factor = Math.pow(10, decimals);
          resultNumber = Math.round(num * factor) / factor;
          result = resultNumber.toString();
        }
        break;
      }

      case 'floor': {
        const num = parseFloat(input1);
        resultNumber = isNaN(num) ? 0 : Math.floor(num);
        result = resultNumber.toString();
        break;
      }

      case 'ceil': {
        const num = parseFloat(input1);
        resultNumber = isNaN(num) ? 0 : Math.ceil(num);
        result = resultNumber.toString();
        break;
      }

      case 'abs': {
        const num = parseFloat(input1);
        resultNumber = isNaN(num) ? 0 : Math.abs(num);
        result = resultNumber.toString();
        break;
      }

      // Math Operations
      case 'add': {
        const num1 = parseFloat(input1) || 0;
        const num2 = parseFloat(input2) || 0;
        resultNumber = num1 + num2;
        result = resultNumber.toString();
        break;
      }

      case 'subtract': {
        const num1 = parseFloat(input1) || 0;
        const num2 = parseFloat(input2) || 0;
        resultNumber = num1 - num2;
        result = resultNumber.toString();
        break;
      }

      case 'multiply': {
        const num1 = parseFloat(input1) || 0;
        const num2 = parseFloat(input2) || 0;
        resultNumber = num1 * num2;
        result = resultNumber.toString();
        break;
      }

      case 'divide': {
        const num1 = parseFloat(input1) || 0;
        const num2 = parseFloat(input2);
        if (isNaN(num2) || num2 === 0) {
          return res.json({
            outputFields: {
              hubhacks_success: false,
              hubhacks_error: 'Cannot divide by zero or invalid divisor'
            }
          });
        }
        resultNumber = num1 / num2;
        result = resultNumber.toString();
        break;
      }

      // Date Operations
      case 'date_format': {
        const date = input1 ? new Date(input1) : new Date();
        if (isNaN(date.getTime())) {
          result = input1;
        } else {
          const format = formatOptions || input2 || 'YYYY-MM-DD';
          result = formatDate(date, format);
        }
        break;
      }

      case 'date_add': {
        const date = input1 ? new Date(input1) : new Date();
        const days = parseInt(input2, 10) || 0;
        if (isNaN(date.getTime())) {
          result = input1;
        } else {
          date.setDate(date.getDate() + days);
          const format = formatOptions || input3 || 'YYYY-MM-DD';
          result = formatDate(date, format);
        }
        break;
      }

      case 'date_subtract': {
        const date = input1 ? new Date(input1) : new Date();
        const days = parseInt(input2, 10) || 0;
        if (isNaN(date.getTime())) {
          result = input1;
        } else {
          date.setDate(date.getDate() - days);
          const format = formatOptions || input3 || 'YYYY-MM-DD';
          result = formatDate(date, format);
        }
        break;
      }

      case 'date_diff': {
        const date1 = new Date(input1);
        const date2 = input2 ? new Date(input2) : new Date();
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
          result = '0';
          resultNumber = 0;
        } else {
          const diffTime = Math.abs(date2 - date1);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          resultNumber = diffDays;
          result = diffDays.toString();
        }
        break;
      }

      case 'now': {
        const format = formatOptions || input1 || 'YYYY-MM-DD HH:mm:ss';
        result = formatDate(new Date(), format);
        break;
      }

      // JSON Operations
      case 'json_get': {
        try {
          const obj = typeof input1 === 'string' ? JSON.parse(input1) : input1;
          const path = input2 || '';
          result = getNestedValue(obj, path);
          if (typeof result === 'object') {
            result = JSON.stringify(result);
          } else {
            result = String(result);
          }
          if (!isNaN(parseFloat(result))) {
            resultNumber = parseFloat(result);
          }
        } catch {
          result = '';
        }
        break;
      }

      case 'json_stringify':
        try {
          result = JSON.stringify(typeof input1 === 'string' ? JSON.parse(input1) : input1);
        } catch {
          result = String(input1);
        }
        break;

      case 'json_parse':
        try {
          const parsed = JSON.parse(input1);
          result = JSON.stringify(parsed);
        } catch {
          result = input1;
        }
        break;

      // Logic Operations
      case 'default_value':
        result = (input1 !== null && input1 !== undefined && input1 !== '')
          ? String(input1)
          : String(input2 || '');
        break;

      case 'conditional': {
        // input1 = condition value, input2 = then value, input3 = else value
        const isTruthy = input1 && input1 !== 'false' && input1 !== '0' && input1 !== 'null' && input1 !== 'undefined';
        result = isTruthy ? String(input2 || '') : String(input3 || '');
        break;
      }

      default:
        return res.json({
          outputFields: {
            hubhacks_success: false,
            hubhacks_error: `Unknown operation: ${operation}`
          }
        });
    }

    // Log execution
    await Execution.create({
      portalId,
      actionType: 'format',
      workflowId: workflow.workflowId,
      enrollmentId: callbackId,
      objectType: object.objectType,
      objectId: object.objectId,
      status: 'success',
      executionTimeMs: Date.now() - startTime,
      inputData: { operation, input1, input2, input3, formatOptions },
      outputData: { result, result_number: resultNumber }
    });

    // Record usage
    await Usage.recordExecution(portalId, {
      actionType: 'format',
      status: 'success',
      executionTimeMs: Date.now() - startTime,
      workflowId: workflow.workflowId
    });

    res.json({
      outputFields: {
        hubhacks_success: true,
        result: result,
        result_number: resultNumber
      }
    });
  } catch (error) {
    logger.error('Format action error', { error: error.message });

    try {
      await Execution.create({
        portalId,
        actionType: 'format',
        workflowId: workflow?.workflowId,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message
      });
    } catch (logError) {
      logger.error('Failed to log format error execution', { error: logError.message });
    }

    res.json({
      outputFields: {
        hubhacks_success: false,
        hubhacks_error: sanitizeErrorMessage(error.message)
      }
    });
  }
});

// Helper function to format dates
// Uses placeholder-based replacement to prevent token collision:
// 1. Replace all tokens with unique placeholders (longest first)
// 2. Replace all placeholders with actual values
function formatDate(date, format) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  // Ordered: longest tokens first to prevent partial matches
  const tokens = [
    ['YYYY', String(date.getFullYear())],
    ['YY', String(date.getFullYear()).slice(-2)],
    ['MM', pad(date.getMonth() + 1)],
    ['DD', pad(date.getDate())],
    ['HH', pad(date.getHours())],
    ['hh', pad(date.getHours() % 12 || 12)],
    ['mm', pad(date.getMinutes())],
    ['ss', pad(date.getSeconds())],
    ['M', String(date.getMonth() + 1)],
    ['D', String(date.getDate())],
    ['H', String(date.getHours())],
    ['h', String(date.getHours() % 12 || 12)],
    ['m', String(date.getMinutes())],
    ['s', String(date.getSeconds())],
    ['A', date.getHours() >= 12 ? 'PM' : 'AM'],
    ['a', date.getHours() >= 12 ? 'pm' : 'am']
  ];

  // Phase 1: Replace tokens with unique placeholders
  let result = format;
  const placeholders = [];
  for (let i = 0; i < tokens.length; i++) {
    const placeholder = `\x00${i}\x00`;
    placeholders.push([placeholder, tokens[i][1]]);
    result = result.split(tokens[i][0]).join(placeholder);
  }

  // Phase 2: Replace placeholders with actual values (no collision possible)
  for (const [placeholder, value] of placeholders) {
    result = result.split(placeholder).join(value);
  }
  return result;
}

// Keys that must never be traversed to prevent prototype chain access
const BLOCKED_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Helper function to get nested value from object
function getNestedValue(obj, path) {
  if (!path) return obj;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === null || value === undefined) return '';
    // Handle array index
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const propName = arrayMatch[1];
      if (BLOCKED_PATH_KEYS.has(propName)) return '';
      value = value[propName];
      if (Array.isArray(value)) {
        value = value[parseInt(arrayMatch[2], 10)];
      } else {
        return '';
      }
    } else {
      if (BLOCKED_PATH_KEYS.has(key)) return '';
      if (!Object.prototype.hasOwnProperty.call(value, key)) return '';
      value = value[key];
    }
  }
  return value !== undefined ? value : '';
}

/**
 * Test endpoint for debugging (development only)
 * POST /v1/actions/test
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    success: true,
    message: 'HubHacks actions endpoint is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * Simple Code execution endpoint for testing (development only)
 * POST /v1/actions/simple-code
 */
router.post('/simple-code', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const {
    code,
    inlineCode,
    inputs = {},
    timeout: rawTimeout = 10000
  } = req.body;

  const timeout = Math.max(1000, Math.min(parseInt(rawTimeout, 10) || 10000, 30000));
  const codeToExecute = code || inlineCode;

  if (!codeToExecute) {
    return res.json({
      success: false,
      error: 'No code provided. Send "code" or "inlineCode" in request body.'
    });
  }

  try {
    // Mock context for testing
    const context = {
      object: req.body.object || { objectType: 'contact', objectId: 'test-123' },
      workflow: req.body.workflow || { workflowId: 'test-workflow' },
      portalId: 'test-portal'
    };

    // Execute code
    const result = await executeCode({
      code: codeToExecute,
      inputs,
      secrets: {},
      context,
      timeout
    });

    res.json({
      success: result.success,
      output: result.output,
      consoleOutput: result.consoleOutput,
      executionTimeMs: result.executionTimeMs,
      error: result.errorMessage
    });
  } catch (error) {
    logger.error('Code execution error', { error: error.message });
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Simple Webhook endpoint for testing (development only)
 * POST /v1/actions/simple-webhook
 */
router.post('/simple-webhook', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  // HubSpot sends webhook config inside inputFields or fields
  const inputFields = req.body.inputFields || req.body.fields || req.body;

  const {
    webhookUrl,
    webhookMethod = 'POST',
    webhookBody,
    webhookHeaders,
    webhookParams,  // Query parameters for GET requests
    // Retry configuration
    retryEnabled = 'true',
    maxRetries = '3',
    retryDelayMs = '1000',
    ...otherData
  } = inputFields;

  const method = (webhookMethod || 'POST').toUpperCase();

  // If no webhookUrl provided, just echo back the received data
  if (!webhookUrl) {
    return res.json({
      success: true,
      message: 'Data received (no webhookUrl provided)',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Parse headers if provided
    let headers = {};
    if (webhookHeaders) {
      try {
        headers = typeof webhookHeaders === 'string'
          ? JSON.parse(webhookHeaders)
          : webhookHeaders;
      } catch (e) {
        // Ignore header parse errors
      }
    }

    // Parse query parameters if provided
    let params = null;
    if (webhookParams) {
      try {
        params = typeof webhookParams === 'string'
          ? JSON.parse(webhookParams)
          : webhookParams;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Parse body - use webhookBody if provided, otherwise send otherData
    let body = null;
    if (webhookBody) {
      try {
        body = typeof webhookBody === 'string' ? JSON.parse(webhookBody) : webhookBody;
      } catch (e) {
        body = { data: webhookBody };
      }
    } else if (Object.keys(otherData).length > 0) {
      body = otherData;
    }

    // Build retry configuration
    const isRetryEnabled = retryEnabled === true || retryEnabled === 'true';
    const retryConfig = isRetryEnabled ? {
      maxRetries: parseInt(maxRetries, 10) || 3,
      initialDelayMs: parseInt(retryDelayMs, 10) || 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    } : { maxRetries: 0 };

    // Execute with retry support
    const result = await executeWebhook({
      url: webhookUrl,
      method: method,
      headers,
      body,
      params
    }, {}, 30000, retryConfig);

    // Convert response to string for HubSpot output field compatibility
    const responseStr = result.data
      ? (typeof result.data === 'object' ? JSON.stringify(result.data) : String(result.data))
      : null;

    res.json({
      success: result.success,
      statusCode: result.httpStatusCode || 0,
      executionTimeMs: result.totalExecutionTimeMs || result.executionTimeMs,
      retriesUsed: result.retriesUsed || 0,
      response: responseStr,
      error: result.errorMessage
    });
  } catch (error) {
    logger.error('Webhook error', { error: error.message });

    res.json({
      success: false,
      statusCode: 0,
      executionTimeMs: 0,
      retriesUsed: 0,
      error: error.message
    });
  }
});

module.exports = router;
