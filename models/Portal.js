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
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
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

module.exports = mongoose.model('Portal', portalSchema);
