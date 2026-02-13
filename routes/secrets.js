const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');
const Secret = require('../models/Secret');
const logger = require('../utils/logger');

// All routes require authentication
router.use(requireAuth);

/**
 * List all secrets for the portal (values are never returned)
 * GET /api/secrets
 */
router.get('/', async (req, res) => {
  try {
    const secrets = await Secret.find({ portalId: req.portalId })
      .select('name description createdAt lastUsedAt usageCount')
      .sort('-createdAt');

    res.json({ secrets });
  } catch (error) {
    logger.error('List secrets error', { error: error.message });
    res.status(500).json({ error: 'Failed to list secrets' });
  }
});

/**
 * Create a new secret
 * POST /api/secrets
 */
router.post('/', async (req, res) => {
  try {
    const { name, value, description } = req.body;

    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }

    // Validate name format (uppercase, underscores only) and length
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error: 'Secret name must start with an uppercase letter and contain only uppercase letters, numbers, and underscores (e.g., API_KEY, MY_SECRET_123)'
      });
    }

    if (name.length > 128) {
      return res.status(400).json({ error: 'Secret name must be 128 characters or less' });
    }

    if (value.length > 10000) {
      return res.status(400).json({ error: 'Secret value must be 10,000 characters or less' });
    }

    // Check secret limit
    const portal = req.portal;
    const currentCount = await Secret.countDocuments({ portalId: req.portalId });

    const maxSecrets = portal.settings?.maxSecrets || 50;
    if (currentCount >= maxSecrets) {
      return res.status(400).json({
        error: `Secret limit reached (${maxSecrets})`
      });
    }

    // Check for duplicate name
    const existing = await Secret.findOne({
      portalId: req.portalId,
      name
    });

    if (existing) {
      return res.status(400).json({ error: 'A secret with this name already exists' });
    }

    // Encrypt the value
    const encrypted = encrypt(value);

    const secret = await Secret.create({
      portalId: req.portalId,
      name,
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      description: description?.trim(),
      createdBy: req.portal.userEmail
    });

    // Return without the encrypted value
    res.status(201).json({
      _id: secret._id,
      name: secret.name,
      description: secret.description,
      createdAt: secret.createdAt
    });
  } catch (error) {
    logger.error('Create secret error', { error: error.message });

    if (error.code === 11000) {
      return res.status(400).json({ error: 'A secret with this name already exists' });
    }

    res.status(500).json({ error: 'Failed to create secret' });
  }
});

/**
 * Update a secret's value
 * PUT /api/secrets/:id
 * :id can be a MongoDB ObjectId or the secret name
 */
router.put('/:id', async (req, res) => {
  try {
    const { value, description } = req.body;

    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, portalId: req.portalId }
      : { name: req.params.id, portalId: req.portalId };

    const secret = await Secret.findOne(query);

    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Update value if provided
    if (value) {
      const encrypted = encrypt(value);
      secret.encryptedValue = encrypted.encryptedValue;
      secret.iv = encrypted.iv;
      secret.authTag = encrypted.authTag;
    }

    // Update description if provided
    if (description !== undefined) {
      secret.description = description?.trim();
    }

    await secret.save();

    res.json({
      _id: secret._id,
      name: secret.name,
      description: secret.description,
      updatedAt: secret.updatedAt
    });
  } catch (error) {
    logger.error('Update secret error', { error: error.message });
    res.status(500).json({ error: 'Failed to update secret' });
  }
});

/**
 * Delete a secret
 * DELETE /api/secrets/:id
 * :id can be a MongoDB ObjectId or the secret name
 */
router.delete('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, portalId: req.portalId }
      : { name: req.params.id, portalId: req.portalId };

    const result = await Secret.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    res.json({ success: true, message: 'Secret deleted' });
  } catch (error) {
    logger.error('Delete secret error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

/**
 * Verify a secret exists and can be decrypted
 * POST /api/secrets/:id/verify
 * :id can be a MongoDB ObjectId or the secret name
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, portalId: req.portalId }
      : { name: req.params.id, portalId: req.portalId };

    const secret = await Secret.findOne(query);

    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Try to decrypt — only confirm validity, never leak content
    try {
      decrypt(secret.encryptedValue, secret.iv, secret.authTag);
      res.json({
        valid: true
      });
    } catch (decryptError) {
      res.json({
        valid: false,
        error: 'Failed to decrypt secret'
      });
    }
  } catch (error) {
    logger.error('Verify secret error', { error: error.message });
    res.status(500).json({ error: 'Failed to verify secret' });
  }
});

module.exports = router;
