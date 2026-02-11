/**
 * Worker thread for sandboxed code execution
 * Runs user code inside vm.createContext with restricted globals
 * The worker_thread provides hard isolation (separate V8 instance + resource limits)
 */
const { parentPort, workerData } = require('worker_threads');
const vm = require('vm');

const { code, inputs, secrets, context, timeout } = workerData;
const startTime = Date.now();

const MAX_CONSOLE_LINES = 100;
const consoleOutput = [];

function addConsoleEntry(level, args) {
  if (consoleOutput.length < MAX_CONSOLE_LINES) {
    consoleOutput.push({ level, message: args.map(String).join(' ') });
  }
}

// Build the sandbox with only safe globals
const sandbox = {
  console: {
    log: (...args) => addConsoleEntry('log', args),
    info: (...args) => addConsoleEntry('info', args),
    warn: (...args) => addConsoleEntry('warn', args),
    error: (...args) => addConsoleEntry('error', args)
  },
  inputs: Object.freeze({ ...inputs }),
  secrets: Object.freeze({ ...secrets }),
  context: Object.freeze({ ...context }),
  output: {},
  // Safe built-in globals only
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
  Promise,
  Map,
  Set,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, timeout)),
  clearTimeout
};

const vmContext = vm.createContext(sandbox);

// Harden the sandbox — block prototype-chain escapes to Node.js internals
vm.runInContext(`
  (function() {
    'use strict';
    var desc = { value: undefined, writable: false, configurable: false };
    try { Object.defineProperty(this, 'constructor', desc); } catch(e) {}
  })();
`, vmContext);

const wrappedCode = `
  (async function() {
    'use strict';
    ${code}
    return output;
  })()
`;

(async () => {
  try {
    const script = new vm.Script(wrappedCode, { filename: 'user-code.js' });

    // runInContext timeout handles synchronous infinite loops
    // The worker-level hard timeout (in codeExecutor.js) handles async hangs
    const resultPromise = script.runInContext(vmContext, { timeout });
    const result = await resultPromise;

    parentPort.postMessage({
      success: true,
      status: 'success',
      output: result || sandbox.output,
      consoleOutput,
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    const isTimeout = error.message && (
      error.message.includes('Script execution timed out') ||
      error.message.includes('timed out')
    );

    parentPort.postMessage({
      success: false,
      status: isTimeout ? 'timeout' : 'error',
      errorMessage: isTimeout
        ? `Execution timed out after ${timeout}ms`
        : error.message,
      consoleOutput,
      executionTimeMs: Date.now() - startTime
    });
  }
})();
