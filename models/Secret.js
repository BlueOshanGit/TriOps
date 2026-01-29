const mongoose = require('mongoose');

const secretSchema = new mongoose.Schema({
  portalId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    match: /^[A-Z][A-Z0-9_]*$/ // Must start with uppercase letter, only uppercase, numbers, underscores
  },
  encryptedValue: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  authTag: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  createdBy: {
    type: String
  },
  lastUsedAt: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for portal + name uniqueness
secretSchema.index({ portalId: 1, name: 1 }, { unique: true });

// Never include encrypted values in JSON output
secretSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.encryptedValue;
  delete obj.iv;
  delete obj.authTag;
  return obj;
};

module.exports = mongoose.model('Secret', secretSchema);
