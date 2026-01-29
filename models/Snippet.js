const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  portalId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  code: {
    type: String,
    required: true,
    maxlength: 50000 // 50KB limit
  },
  runtime: {
    type: String,
    enum: ['javascript'],
    default: 'javascript'
  },
  // Input schema definition for the snippet
  inputs: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      default: 'string'
    },
    required: {
      type: Boolean,
      default: false
    },
    description: String
  }],
  // Output schema definition
  outputs: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      default: 'string'
    },
    description: String
  }],
  // Metadata
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecutedAt: {
    type: Date
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for portal + name uniqueness
snippetSchema.index({ portalId: 1, name: 1 }, { unique: true });

// Text index for search
snippetSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Snippet', snippetSchema);
