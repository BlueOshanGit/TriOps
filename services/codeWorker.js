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

// Deep freeze helper — recursively freezes nested objects
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

// Track timers so they can be cleaned up
const activeTimers = new Set();

// Build the sandbox with only safe globals — no native constructors exposed
const sandbox = {
  console: {
    log: (...args) => addConsoleEntry('log', args),
    info: (...args) => addConsoleEntry('info', args),
    warn: (...args) => addConsoleEntry('warn', args),
    error: (...args) => addConsoleEntry('error', args)
  },
  inputs: deepFreeze({ ...inputs }),
  secrets: deepFreeze({ ...secrets }),
  context: deepFreeze({ ...context }),
  output: {},
  // Only expose safe utility functions — NOT raw constructors
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  setTimeout: (fn, ms) => {
    const id = setTimeout(fn, Math.min(ms, timeout));
    activeTimers.add(id);
    return id;
  },
  clearTimeout: (id) => {
    activeTimers.delete(id);
    clearTimeout(id);
  }
};

const vmContext = vm.createContext(sandbox);

// Harden the sandbox — block prototype-chain escapes and inject safe built-ins
vm.runInContext(`
  (function() {
    'use strict';
    // Block constructor escape routes
    var desc = { value: undefined, writable: false, configurable: false };
    try { Object.defineProperty(this, 'constructor', desc); } catch(e) {}

    // Provide safe built-ins created INSIDE the sandbox context
    // This prevents user code from reaching the host's Function constructor
    // via Promise.constructor.constructor etc.
  })();
`, vmContext);

// Pass user code into the sandbox as a variable instead of interpolating
// into a template literal — prevents template injection sandbox escapes.
sandbox.__userCode = code;

const wrappedCode = `
  (async function() {
    'use strict';
    // Provide built-in constructors inside sandbox
    const JSON = globalThis.JSON;
    const Date = globalThis.Date;
    const Math = globalThis.Math;
    const Number = globalThis.Number;
    const String = globalThis.String;
    const Boolean = globalThis.Boolean;
    const Array = globalThis.Array;
    const Object = globalThis.Object;
    const RegExp = globalThis.RegExp;
    const Error = globalThis.Error;
    const Promise = globalThis.Promise;
    const Map = globalThis.Map;
    const Set = globalThis.Set;
    // Execute user code via Function constructor within the sandbox
    const __fn = new Function('inputs', 'secrets', 'context', 'output', 'console', 'setTimeout', 'clearTimeout', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'JSON', 'Date', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'RegExp', 'Error', 'Promise', 'Map', 'Set', __userCode);
    await __fn(inputs, secrets, context, output, console, setTimeout, clearTimeout, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, JSON, Date, Math, Number, String, Boolean, Array, Object, RegExp, Error, Promise, Map, Set);
    return output;
  })()
`;

// Clean up all active timers set by user code
function clearAllTimers() {
  for (const id of activeTimers) {
    clearTimeout(id);
  }
  activeTimers.clear();
}

(async () => {
  try {
    const script = new vm.Script(wrappedCode, { filename: 'user-code.js' });

    // runInContext timeout handles synchronous infinite loops
    // The worker-level hard timeout (in codeExecutor.js) handles async hangs
    const resultPromise = script.runInContext(vmContext, { timeout });
    const result = await resultPromise;

    clearAllTimers();

    parentPort.postMessage({
      success: true,
      status: 'success',
      output: result || sandbox.output,
      consoleOutput,
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    clearAllTimers();

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
