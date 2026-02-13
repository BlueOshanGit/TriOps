const mongoose = require('mongoose');

const portalSchema = new mongoose.Schema({
  portalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hubId: {
    type: String,
    required: true
  },
  // Tokens are stored encrypted at rest via encrypt/decrypt in services/encryption.js
  accessToken: {
    type: String,
    required: true
  },
  accessTokenIv: { type: String },
  accessTokenAuthTag: { type: String },
  refreshToken: {
    type: String,
    required: true
  },
  refreshTokenIv: { type: String },
  refreshTokenAuthTag: { type: String },
  tokenExpiresAt: {
    type: Date,
    required: true
  },
  scopes: [{
    type: String
  }],
  hubDomain: {
    type: String
  },
  appId: {
    type: String
  },
  userId: {
    type: String
  },
  userEmail: {
    type: String
  },
  settings: {
    webhookTimeout: {
      type: Number,
      default: 30000 // 30 seconds
    },
    codeTimeout: {
      type: Number,
      default: 10000 // 10 seconds
    },
    maxSnippets: {
      type: Number,
      default: 100
    },
    maxSecrets: {
      type: Number,
      default: 50
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for token refresh queries
portalSchema.index({ tokenExpiresAt: 1 });

// Method to check if token is expired
portalSchema.methods.isTokenExpired = function() {
  return new Date() >= this.tokenExpiresAt;
};

// Method to check if token will expire soon (within 5 minutes)
portalSchema.methods.isTokenExpiringSoon = function() {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return fiveMinutesFromNow >= this.tokenExpiresAt;
};

/**
 * Encrypt and set both tokens on this portal document.
 * Call this instead of setting accessToken/refreshToken directly.
 */
portalSchema.methods.setTokens = function(accessToken, refreshToken) {
  const { encrypt } = require('../services/encryption');

  const encAccess = encrypt(accessToken);
  this.accessToken = encAccess.encryptedValue;
  this.accessTokenIv = encAccess.iv;
  this.accessTokenAuthTag = encAccess.authTag;

  const encRefresh = encrypt(refreshToken);
  this.refreshToken = encRefresh.encryptedValue;
  this.refreshTokenIv = encRefresh.iv;
  this.refreshTokenAuthTag = encRefresh.authTag;
};

/**
 * Decrypt and return the access token.
 * Returns the raw value if no IV is stored (backward compat with unencrypted tokens).
 */
portalSchema.methods.getAccessToken = function() {
  if (!this.accessTokenIv) return this.accessToken; // backward compat
  const { decrypt } = require('../services/encryption');
  return decrypt(this.accessToken, this.accessTokenIv, this.accessTokenAuthTag);
};

/**
 * Decrypt and return the refresh token.
 * Returns the raw value if no IV is stored (backward compat with unencrypted tokens).
 */
portalSchema.methods.getRefreshToken = function() {
  if (!this.refreshTokenIv) return this.refreshToken; // backward compat
  const { decrypt } = require('../services/encryption');
  return decrypt(this.refreshToken, this.refreshTokenIv, this.refreshTokenAuthTag);
};

module.exports = mongoose.model('Portal', portalSchema);
