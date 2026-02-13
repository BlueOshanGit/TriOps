const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const hubspotService = require('../services/hubspot');
const Portal = require('../models/Portal');
const OAuthState = require('../models/OAuthState');
const { generateToken, requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Validate returnUrl to prevent open redirect attacks
 * Only allows relative paths or same-origin URLs
 */
function isValidReturnUrl(returnUrl) {
  if (!returnUrl) return true;
  // Allow relative paths
  if (returnUrl.startsWith('/')) return true;
  // Allow same-origin base URL
  try {
    const baseUrl = process.env.BASE_URL;
    if (baseUrl && returnUrl.startsWith(baseUrl)) return true;
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      const parsed = new URL(returnUrl);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Escape string for safe embedding in JavaScript
 * Prevents XSS by escaping characters that could break out of JS strings
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for JS embedding
 */
function escapeForJs(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')   // Escape backslashes first
    .replace(/'/g, "\\'")     // Escape single quotes
    .replace(/"/g, '\\"')     // Escape double quotes
    .replace(/</g, '\\x3c')   // Escape < to prevent </script> injection
    .replace(/>/g, '\\x3e')   // Escape >
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r');   // Escape carriage returns
}

/**
 * Escape string for safe embedding in HTML content
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Initiate OAuth flow
 * GET /oauth/authorize
 */
router.get('/authorize', async (req, res) => {
  try {
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Validate returnUrl to prevent open redirect
    const returnUrl = req.query.returnUrl;
    if (returnUrl && !isValidReturnUrl(returnUrl)) {
      return res.status(400).json({ error: 'Invalid return URL' });
    }

    // Store state in MongoDB (automatically expires after 10 minutes via TTL index)
    await OAuthState.create({
      state,
      returnUrl
    });

    const authUrl = hubspotService.getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    logger.error('OAuth authorize error', { error: error.message });
    res.status(500).send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>Failed to initiate OAuth flow. Please try again.</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * OAuth callback handler
 * GET /oauth/callback
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  logger.info('OAuth callback received:', { code: code ? 'present' : 'missing', state, error });

  // Handle OAuth errors
  if (error) {
    logger.error('OAuth error', { error: error, error_description });
    const safeErrorMessage = escapeHtml(error_description || error || 'Unknown error');
    return res.status(400).send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>${safeErrorMessage}</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  // Check if code is provided
  if (!code) {
    logger.error('OAuth callback missing code parameter');
    return res.status(400).send(`
      <html>
        <body>
          <h1>Invalid Request</h1>
          <p>Missing authorization code.</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  try {
    // Verify state from MongoDB
    let stateData = null;
    if (state) {
      stateData = await OAuthState.findOneAndDelete({ state });
      logger.info('State lookup result:', stateData ? 'found' : 'not found');
    }

    // Enforce state validation for CSRF protection
    if (!state || !stateData) {
      logger.error('OAuth state validation failed - rejecting request');
      return res.status(400).send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Invalid or expired authorization state. This may happen if the authorization took too long or the link was already used.</p>
            <p><a href="/oauth/authorize">Try again</a></p>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const tokenData = await hubspotService.exchangeCodeForTokens(code);

    // Get token info to retrieve portal ID
    const tokenInfo = await hubspotService.getTokenInfo(tokenData.access_token);

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Encrypt tokens before storing
    const { encrypt } = require('../services/encryption');
    const encAccess = encrypt(tokenData.access_token);
    const encRefresh = encrypt(tokenData.refresh_token);

    // Upsert portal record with encrypted tokens
    const portal = await Portal.findOneAndUpdate(
      { portalId: String(tokenInfo.hub_id) },
      {
        $set: {
          portalId: String(tokenInfo.hub_id),
          hubId: String(tokenInfo.hub_id),
          accessToken: encAccess.encryptedValue,
          accessTokenIv: encAccess.iv,
          accessTokenAuthTag: encAccess.authTag,
          refreshToken: encRefresh.encryptedValue,
          refreshTokenIv: encRefresh.iv,
          refreshTokenAuthTag: encRefresh.authTag,
          tokenExpiresAt,
          scopes: tokenInfo.scopes || [],
          hubDomain: tokenInfo.hub_domain,
          appId: String(tokenInfo.app_id),
          userId: String(tokenInfo.user_id),
          userEmail: tokenInfo.user,
          isActive: true
        },
        $setOnInsert: {
          installedAt: Date.now(),
          settings: {
            webhookTimeout: 30000,
            codeTimeout: 10000,
            maxSnippets: 100,
            maxSecrets: 50
          }
        }
      },
      { upsert: true, new: true }
    );

    // Generate JWT for the frontend
    const jwt = generateToken(portal);

    logger.info(`Portal ${portal.portalId} connected successfully`);

    // Redirect to HubSpot or return success page
    if (stateData.returnUrl) {
      // Encode token for URL safety
      res.redirect(`${stateData.returnUrl}?token=${encodeURIComponent(jwt)}`);
    } else {
      // Redirect to frontend with token
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? process.env.BASE_URL
        : 'http://localhost:5173';

      // Escape values to prevent XSS
      const safeJwt = escapeForJs(jwt);
      const safePortalId = escapeHtml(String(portal.portalId));
      const encodedToken = encodeURIComponent(jwt);
      const redirectUrl = `${frontendUrl}?token=${encodedToken}`;

      res.send(`
        <html>
          <head>
            <title>HubHacks - Connected!</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 400px; }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin: 10px 0; }
              .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #ff7a59; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="success-icon">✓</div>
              <h1>Successfully Connected!</h1>
              <p>HubHacks has been installed in your HubSpot portal.</p>
              <p><strong>Portal ID:</strong> ${safePortalId}</p>
              <div class="spinner"></div>
              <p>Redirecting to dashboard...</p>
            </div>
            <script>
              // Store token in localStorage
              localStorage.setItem('hubhacks_token', '${safeJwt}');

              // If in popup, close and notify parent
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${safeJwt}' }, '${escapeForJs(frontendUrl)}');
                try { window.opener.localStorage.setItem('hubhacks_token', '${safeJwt}'); } catch(e) {}
                window.close();
              } else {
                // Redirect to frontend dashboard after a short delay
                setTimeout(function() {
                  window.location.href = '${escapeForJs(redirectUrl)}';
                }, 1500);
              }
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    logger.error('OAuth callback error', { error: error.message });
    const safeErrorMessage = escapeHtml(error.message || 'Unknown error');
    res.status(500).send(`
      <html>
        <body>
          <h1>Connection Failed</h1>
          <p>Failed to connect to HubSpot: ${safeErrorMessage}</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * Refresh token endpoint
 * POST /oauth/refresh
 * Requires authentication — caller must present a valid JWT
 */
router.post('/refresh', requireAuth, async (req, res) => {
  const portalId = req.portalId;

  try {
    const portal = await Portal.findOne({ portalId });

    if (!portal) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    const tokenData = await hubspotService.refreshAccessToken(portal.getRefreshToken());

    portal.setTokens(tokenData.access_token, tokenData.refresh_token);
    portal.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    await portal.save();

    const jwt = generateToken(portal);

    res.json({
      success: true,
      token: jwt,
      expiresAt: portal.tokenExpiresAt
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Get current portal info
 * GET /oauth/me
 * Uses requireAuth middleware which checks isActive on the portal
 */
router.get('/me', requireAuth, async (req, res) => {
  const portal = req.portal;

  res.json({
    portalId: portal.portalId,
    hubDomain: portal.hubDomain,
    userEmail: portal.userEmail,
    installedAt: portal.installedAt,
    lastActivityAt: portal.lastActivityAt,
    settings: portal.settings
  });
});

/**
 * Disconnect/uninstall
 * POST /oauth/disconnect
 * Requires authentication — caller must present a valid JWT
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  const portalId = req.portalId;

  try {
    const portal = await Portal.findOne({ portalId });

    if (!portal) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    portal.isActive = false;
    await portal.save();

    res.json({ success: true, message: 'Portal disconnected' });
  } catch (error) {
    logger.error('Disconnect error', { error: error.message });
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

module.exports = router;
