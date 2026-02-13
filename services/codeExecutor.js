const { Worker } = require('worker_threads');
const path = require('path');
const vm = require('vm');

/**
 * Execute JavaScript code in a sandboxed worker thread
 * Uses worker_threads for true isolation + vm.createContext for API restriction
 * @param {Object} options - Execution options
 * @param {string} options.code - JavaScript code to execute
 * @param {Object} options.inputs - Input data available to the code
 * @param {Object} options.secrets - Decrypted secrets available to the code
 * @param {Object} options.context - HubSpot workflow context
 * @param {number} options.timeout - Execution timeout in ms
 * @returns {Object} - Execution result
 */
async function executeCode(options) {
  const {
    code,
    inputs = {},
    secrets = {},
    context = {},
    timeout = 10000
  } = options;

  return new Promise((resolve) => {
    let resolved = false;

    const worker = new Worker(path.join(__dirname, 'codeWorker.js'), {
      workerData: { code, inputs, secrets, context, timeout },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
        codeRangeSizeMb: 16
      }
    });

    // Cleanup helper — clears timer and removes all listeners to prevent leaks
    function cleanup() {
      clearTimeout(timer);
      worker.removeAllListeners();
    }

    // Hard timeout — terminates the worker if it exceeds the limit
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        worker.terminate();
        resolve({
          success: false,
          status: 'timeout',
          errorMessage: `Execution timed out after ${timeout}ms`,
          consoleOutput: [],
          executionTimeMs: timeout
        });
      }
    }, timeout + 500);

    worker.on('message', (result) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        worker.terminate();
        resolve(result);
      }
    });

    worker.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        worker.terminate();
        resolve({
          success: false,
          status: 'error',
          errorMessage: error.message,
          consoleOutput: [],
          executionTimeMs: 0
        });
      }
    });

    worker.on('exit', (exitCode) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          status: exitCode === null ? 'timeout' : 'error',
          errorMessage: exitCode === null
            ? `Execution timed out after ${timeout}ms`
            : `Worker exited unexpectedly with code ${exitCode}`,
          consoleOutput: [],
          executionTimeMs: 0
        });
      }
    });
  });
}

/**
 * Validate code syntax without executing
 * @param {string} code - JavaScript code to validate
 * @returns {Object} - Validation result
 */
function validateCode(code) {
  try {
    new vm.Script(code, { filename: 'validation.js' });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      line: extractLineNumber(error)
    };
  }
}

/**
 * Extract line number from syntax error
 * @param {Error} error - Error object
 * @returns {number|null} - Line number or null
 */
function extractLineNumber(error) {
  // Try V8 stack trace format first (e.g., "validation.js:5:10")
  const stackMatch = error.stack && error.stack.match(/:(\d+):\d+/);
  if (stackMatch) return parseInt(stackMatch[1], 10);
  // Fallback: "at line N" or "(N:M)" format
  const msgMatch = error.message.match(/at line (\d+)/) || error.message.match(/\((\d+):\d+\)/);
  return msgMatch ? parseInt(msgMatch[1], 10) : null;
}

/**
 * Create a safe preview of code output
 * @param {any} output - Output to preview
 * @param {number} maxLength - Maximum string length
 * @returns {string} - Preview string
 */
function createOutputPreview(output, maxLength = 1000) {
  if (output === undefined) return 'undefined';
  if (output === null) return 'null';

  try {
    const str = JSON.stringify(output, null, 2);
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + '... (truncated)';
    }
    return str;
  } catch {
    return String(output).slice(0, maxLength);
  }
}

module.exports = {
  executeCode,
  validateCode,
  createOutputPreview
};
