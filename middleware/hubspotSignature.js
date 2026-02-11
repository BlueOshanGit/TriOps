const crypto = require('crypto');
const { URL } = require('url');
const logger = require('../utils/logger');

/**
 * Verify HubSpot webhook signature (v1)
 * Used for older integrations
 */
function verifySignatureV1(signature, clientSecret, requestBody) {
  const sourceString = clientSecret + requestBody;
  const hash = crypto.createHash('sha256').update(sourceString).digest('hex');
  return hash === signature;
}

/**
 * Verify HubSpot webhook signature (v2)
 * Includes method and URI
 */
function verifySignatureV2(signature, clientSecret, method, uri, requestBody) {
  const sourceString = clientSecret + method + uri + requestBody;
  const hash = crypto.createHash('sha256').update(sourceString).digest('hex');
  return hash === signature;
}

/**
 * Verify HubSpot webhook signature (v3)
 * Includes timestamp for replay protection
 */
function verifySignatureV3(signature, clientSecret, method, uri, requestBody, timestamp) {
  // Check timestamp is within 5 minutes
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);

  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return { valid: false, reason: 'Timestamp too old' };
  }

  const sourceString = method + uri + requestBody + timestamp;
  const hash = crypto
    .createHmac('sha256', clientSecret)
    .update(sourceString)
    .digest('base64');

  return { valid: hash === signature, reason: hash === signature ? null : 'Signature mismatch' };
}

/**
 * Middleware to verify HubSpot request signatures
 * Supports all signature versions
 */
function verifyHubSpotSignature(req, res, next) {
  // Skip verification in development if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_SIGNATURE_VERIFICATION === 'true') {
    logger.info('Skipping HubSpot signature verification (development mode)');
    return next();
  }

  const signatureVersion = req.headers['x-hubspot-signature-version'];
  const signature = req.headers['x-hubspot-signature'];
  const timestamp = req.headers['x-hubspot-request-timestamp'];

  if (!signature) {
    return res.status(401).json({ error: 'Missing HubSpot signature' });
  }

  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const requestBody = JSON.stringify(req.body);
  const method = req.method;
  const uri = `${process.env.BASE_URL}${req.originalUrl}`;

  let isValid = false;
  let reason = null;

  switch (signatureVersion) {
    case 'v3':
      if (!timestamp) {
        return res.status(401).json({ error: 'Missing timestamp for v3 signature' });
      }
      const v3Result = verifySignatureV3(signature, clientSecret, method, uri, requestBody, timestamp);
      isValid = v3Result.valid;
      reason = v3Result.reason;
      break;

    case 'v2':
      isValid = verifySignatureV2(signature, clientSecret, method, uri, requestBody);
      break;

    case 'v1':
    default:
      isValid = verifySignatureV1(signature, clientSecret, requestBody);
      break;
  }

  if (!isValid) {
    logger.error('HubSpot signature verification failed', { error: reason || 'Invalid signature' });
    return res.status(401).json({ error: 'Invalid HubSpot signature' });
  }

  next();
}

/**
 * Middleware specifically for workflow action requests
 * Uses cryptographic signature verification when available,
 * falls back to strict origin validation in development only
 */
function verifyWorkflowActionSignature(req, res, next) {
  // HubSpot sends portalId inside origin object
  const portalId = req.body.origin?.portalId || req.body.portalId;
  const callbackId = req.body.callbackId;

  if (!portalId) {
    return res.status(400).json({ error: 'Missing portalId in request' });
  }

  // Try cryptographic signature verification first
  const signature = req.headers['x-hubspot-signature'];
  const signatureVersion = req.headers['x-hubspot-signature-version'];
  const timestamp = req.headers['x-hubspot-request-timestamp'];
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (signature && clientSecret) {
    const requestBody = JSON.stringify(req.body);
    const method = req.method;
    const uri = `${process.env.BASE_URL}${req.originalUrl}`;

    let isValid = false;

    switch (signatureVersion) {
      case 'v3':
        if (timestamp) {
          const v3Result = verifySignatureV3(signature, clientSecret, method, uri, requestBody, timestamp);
          isValid = v3Result.valid;
        }
        break;
      case 'v2':
        isValid = verifySignatureV2(signature, clientSecret, method, uri, requestBody);
        break;
      case 'v1':
      default:
        isValid = verifySignatureV1(signature, clientSecret, requestBody);
        break;
    }

    if (!isValid) {
      logger.error('Workflow action signature verification failed');
      return res.status(401).json({ error: 'Invalid HubSpot signature' });
    }

    req.portalId = portalId;
    req.callbackId = callbackId;
    return next();
  }

  // No signature headers — require them in production
  if (process.env.NODE_ENV === 'production') {
    logger.error('Missing HubSpot signature headers in production');
    return res.status(401).json({ error: 'Missing authentication signature' });
  }

  // Development only: strict origin validation as fallback
  const origin = req.headers.origin || req.headers.referer;
  if (origin && !isValidHubSpotOrigin(origin)) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  req.portalId = portalId;
  req.callbackId = callbackId;
  next();
}

/**
 * Validate that an origin URL belongs to HubSpot
 * Uses exact domain matching to prevent spoofing
 */
function isValidHubSpotOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === 'app.hubspot.com' ||
           (url.hostname.endsWith('.hubspot.com') && url.protocol === 'https:');
  } catch {
    return false;
  }
}

module.exports = {
  verifyHubSpotSignature,
  verifyWorkflowActionSignature,
  verifySignatureV1,
  verifySignatureV2,
  verifySignatureV3
};
