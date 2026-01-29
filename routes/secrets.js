const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');
const Secret = require('../models/Secret');

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
    console.error('List secrets error:', error);
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

    // Validate name format (uppercase, underscores only)
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error: 'Secret name must start with an uppercase letter and contain only uppercase letters, numbers, and underscores (e.g., API_KEY, MY_SECRET_123)'
      });
    }

    // Check secret limit
    const portal = req.portal;
    const currentCount = await Secret.countDocuments({ portalId: req.portalId });

    if (currentCount >= portal.settings.maxSecrets) {
      return res.status(400).json({
        error: `Secret limit reached (${portal.settings.maxSecrets})`
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
    console.error('Create secret error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ error: 'A secret with this name already exists' });
    }

    res.status(500).json({ error: 'Failed to create secret' });
  }
});

/**
 * Update a secret's value
 * PUT /api/secrets/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { value, description } = req.body;

    const secret = await Secret.findOne({
      _id: req.params.id,
      portalId: req.portalId
    });

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
    console.error('Update secret error:', error);
    res.status(500).json({ error: 'Failed to update secret' });
  }
});

/**
 * Delete a secret
 * DELETE /api/secrets/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Secret.deleteOne({
      _id: req.params.id,
      portalId: req.portalId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    res.json({ success: true, message: 'Secret deleted' });
  } catch (error) {
    console.error('Delete secret error:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

/**
 * Verify a secret exists and can be decrypted
 * POST /api/secrets/:id/verify
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const secret = await Secret.findOne({
      _id: req.params.id,
      portalId: req.portalId
    });

    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Try to decrypt
    try {
      const decrypted = decrypt(secret.encryptedValue, secret.iv, secret.authTag);
      res.json({
        valid: true,
        length: decrypted.length,
        preview: decrypted.slice(0, 3) + '***' // Show first 3 chars only
      });
    } catch (decryptError) {
      res.json({
        valid: false,
        error: 'Failed to decrypt secret'
      });
    }
  } catch (error) {
    console.error('Verify secret error:', error);
    res.status(500).json({ error: 'Failed to verify secret' });
  }
});

module.exports = router;
