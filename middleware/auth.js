const jwt = require('jsonwebtoken');
const Portal = require('../models/Portal');
const logger = require('../utils/logger');

/**
 * Generate JWT token for a portal
 * @param {Object} portal - Portal document
 * @returns {string} - JWT token
 */
function generateToken(portal) {
  const payload = {
    portalId: portal.portalId,
    hubId: portal.hubId
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
}

/**
 * Verify JWT token and attach portal to request
 * Middleware for API routes
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const portal = await Portal.findOne({ portalId: decoded.portalId, isActive: true });

      if (!portal) {
        return res.status(401).json({ error: 'Portal not found or inactive' });
      }

      // Throttle lastActivityAt updates (only save if >5 min since last update)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!portal.lastActivityAt || portal.lastActivityAt < fiveMinAgo) {
        portal.lastActivityAt = new Date();
        portal.save().catch(err => logger.error('Failed to update lastActivityAt', { error: err.message }));
      }

      req.portal = portal;
      req.portalId = portal.portalId;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optional auth - attach portal if token present, but don't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const portal = await Portal.findOne({ portalId: decoded.portalId, isActive: true });

      if (portal) {
        req.portal = portal;
        req.portalId = portal.portalId;
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Extract portal ID from HubSpot iframe query params
 * Used when embedded in HubSpot settings
 */
function extractPortalFromQuery(req, res, next) {
  const raw = req.query.portalId || req.query.hub_id;

  if (raw) {
    // Only allow numeric portal IDs (HubSpot portal IDs are always integers)
    const portalId = String(raw).replace(/\D/g, '');
    if (portalId) {
      req.queryPortalId = portalId;
    }
  }

  next();
}

module.exports = {
  generateToken,
  requireAuth,
  optionalAuth,
  extractPortalFromQuery
};
