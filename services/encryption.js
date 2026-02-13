const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Key must be exactly 32 bytes for AES-256
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Require a 64-char hex string (32 bytes) for proper AES-256 security
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Reject non-hex keys - they indicate a misconfiguration
  throw new Error(
    'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

/**
 * Encrypt a plaintext string
 * @param {string} plaintext - The text to encrypt
 * @returns {Object} - Object containing encrypted data, IV, and auth tag
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new Error('encrypt() requires a string argument');
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedValue - The encrypted hex string
 * @param {string} ivHex - The initialization vector as hex
 * @param {string} authTagHex - The authentication tag as hex
 * @returns {string} - The decrypted plaintext
 */
function decrypt(encryptedValue, ivHex, authTagHex) {
  if (!encryptedValue || !ivHex || !authTagHex) {
    throw new Error('decrypt() requires encryptedValue, iv, and authTag');
  }
  if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex)) {
    throw new Error('decrypt() iv and authTag must be hex strings');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a secure random string for JWT secrets, etc.
 * @param {number} length - Length of the string
 * @returns {string} - Random hex string
 */
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a hash of a value (for signatures, etc.)
 * @param {string} value - Value to hash
 * @param {string} secret - Secret key for HMAC
 * @returns {string} - HMAC-SHA256 hash as hex
 */
function createHmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateSecureKey,
  createHmac
};
