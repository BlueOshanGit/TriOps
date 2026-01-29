const { VM } = require('vm2');

/**
 * Execute JavaScript code in a sandboxed environment
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

  const startTime = Date.now();

  // Prepare the execution environment
  const consoleOutput = [];
  const customConsole = {
    log: (...args) => consoleOutput.push({ level: 'log', message: args.map(String).join(' ') }),
    info: (...args) => consoleOutput.push({ level: 'info', message: args.map(String).join(' ') }),
    warn: (...args) => consoleOutput.push({ level: 'warn', message: args.map(String).join(' ') }),
    error: (...args) => consoleOutput.push({ level: 'error', message: args.map(String).join(' ') })
  };

  // Output object that the code can populate
  const output = {};

  // Create sandbox with available globals
  const sandbox = {
    console: customConsole,
    inputs: Object.freeze({ ...inputs }),
    secrets: Object.freeze({ ...secrets }),
    context: Object.freeze({ ...context }),
    output,
    // Utility functions
    JSON,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI
  };

  try {
    const vm = new VM({
      timeout,
      sandbox,
      eval: false,
      wasm: false,
      allowAsync: true
    });

    // Wrap code to handle both sync and async execution
    const wrappedCode = `
      (async function() {
        ${code}
        return output;
      })()
    `;

    const result = await vm.run(wrappedCode);
    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      status: 'success',
      output: result || output,
      consoleOutput,
      executionTimeMs
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    // Check if it's a timeout error
    if (error.message && error.message.includes('Script execution timed out')) {
      return {
        success: false,
        status: 'timeout',
        errorMessage: `Execution timed out after ${timeout}ms`,
        consoleOutput,
        executionTimeMs
      };
    }

    return {
      success: false,
      status: 'error',
      errorMessage: error.message,
      errorStack: error.stack,
      consoleOutput,
      executionTimeMs
    };
  }
}

/**
 * Validate code syntax without executing
 * @param {string} code - JavaScript code to validate
 * @returns {Object} - Validation result
 */
function validateCode(code) {
  try {
    // Use Function constructor to parse without executing
    new Function(code);
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
  const match = error.message.match(/at line (\d+)/);
  return match ? parseInt(match[1], 10) : null;
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
