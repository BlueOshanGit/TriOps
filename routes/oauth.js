const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const hubspotService = require('../services/hubspot');
const Portal = require('../models/Portal');
const { generateToken } = require('../middleware/auth');

// Store OAuth states temporarily (in production, use Redis)
const oauthStates = new Map();

/**
 * Initiate OAuth flow
 * GET /oauth/authorize
 */
router.get('/authorize', (req, res) => {
  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Store state with timestamp (expires in 10 minutes)
  oauthStates.set(state, {
    createdAt: Date.now(),
    returnUrl: req.query.returnUrl
  });

  // Clean up old states
  for (const [key, value] of oauthStates.entries()) {
    if (Date.now() - value.createdAt > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  const authUrl = hubspotService.getAuthorizationUrl(state);
  res.redirect(authUrl);
});

/**
 * OAuth callback handler
 * GET /oauth/callback
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.status(400).send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>${error_description || error}</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  // Verify state
  if (!state || !oauthStates.has(state)) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Invalid Request</h1>
          <p>Invalid or expired state parameter.</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  const stateData = oauthStates.get(state);
  oauthStates.delete(state);

  try {
    // Exchange code for tokens
    const tokenData = await hubspotService.exchangeCodeForTokens(code);

    // Get token info to retrieve portal ID
    const tokenInfo = await hubspotService.getTokenInfo(tokenData.access_token);

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert portal record
    const portal = await Portal.findOneAndUpdate(
      { portalId: String(tokenInfo.hub_id) },
      {
        $set: {
          portalId: String(tokenInfo.hub_id),
          hubId: String(tokenInfo.hub_id),
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt,
          scopes: tokenInfo.scopes || [],
          hubDomain: tokenInfo.hub_domain,
          appId: String(tokenInfo.app_id),
          userId: String(tokenInfo.user_id),
          userEmail: tokenInfo.user,
          isActive: true,
          installedAt: Date.now()
        },
        $setOnInsert: {
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

    console.log(`Portal ${portal.portalId} connected successfully`);

    // Redirect to HubSpot or return success page
    if (stateData.returnUrl) {
      res.redirect(`${stateData.returnUrl}?token=${jwt}`);
    } else {
      // Redirect to frontend with token
      const frontendUrl = process.env.NODE_ENV === 'production'
        ? process.env.BASE_URL
        : 'http://localhost:5173';

      res.send(`
        <html>
          <body>
            <h1>Successfully Connected!</h1>
            <p>CodeFlow has been installed in your HubSpot portal.</p>
            <p>Portal ID: ${portal.portalId}</p>
            <p>Redirecting to dashboard...</p>
            <script>
              // Store token in localStorage
              localStorage.setItem('codeflow_token', '${jwt}');

              // If in popup, close and notify parent
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${jwt}' }, '*');
                window.opener.localStorage.setItem('codeflow_token', '${jwt}');
                window.close();
              } else {
                // Redirect to frontend dashboard
                window.location.href = '${frontendUrl}?token=${jwt}';
              }
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Connection Failed</h1>
          <p>Failed to connect to HubSpot: ${error.message}</p>
          <p><a href="/oauth/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * Refresh token endpoint
 * POST /oauth/refresh
 */
router.post('/refresh', async (req, res) => {
  const { portalId } = req.body;

  if (!portalId) {
    return res.status(400).json({ error: 'Portal ID required' });
  }

  try {
    const portal = await Portal.findOne({ portalId });

    if (!portal) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    const tokenData = await hubspotService.refreshAccessToken(portal.refreshToken);

    portal.accessToken = tokenData.access_token;
    portal.refreshToken = tokenData.refresh_token;
    portal.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    await portal.save();

    const jwt = generateToken(portal);

    res.json({
      success: true,
      token: jwt,
      expiresAt: portal.tokenExpiresAt
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Get current portal info
 * GET /oauth/me
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const portal = await Portal.findOne({ portalId: decoded.portalId });

    if (!portal) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    res.json({
      portalId: portal.portalId,
      hubDomain: portal.hubDomain,
      userEmail: portal.userEmail,
      installedAt: portal.installedAt,
      lastActivityAt: portal.lastActivityAt,
      settings: portal.settings
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * Disconnect/uninstall
 * POST /oauth/disconnect
 */
router.post('/disconnect', async (req, res) => {
  const { portalId } = req.body;

  if (!portalId) {
    return res.status(400).json({ error: 'Portal ID required' });
  }

  try {
    const portal = await Portal.findOne({ portalId });

    if (!portal) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    portal.isActive = false;
    await portal.save();

    res.json({ success: true, message: 'Portal disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

module.exports = router;
