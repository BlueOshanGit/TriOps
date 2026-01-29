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

  // If key is not 32 bytes, hash it to get consistent 32 bytes
  if (key.length !== 32) {
    return crypto.createHash('sha256').update(key).digest();
  }

  return Buffer.from(key, 'utf8');
}

/**
 * Encrypt a plaintext string
 * @param {string} plaintext - The text to encrypt
 * @returns {Object} - Object containing encrypted data, IV, and auth tag
 */
function encrypt(plaintext) {
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
