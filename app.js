require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// --- Fix #2: Validate required environment variables at startup ---
const requiredEnvVars = [
  'MONGODB_URI',
  'HUBSPOT_CLIENT_ID',
  'HUBSPOT_CLIENT_SECRET',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'BASE_URL'
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Import routes
const oauthRoutes = require('./routes/oauth');
const actionsRoutes = require('./routes/actions');
const snippetsRoutes = require('./routes/snippets');
const secretsRoutes = require('./routes/secrets');
const logsRoutes = require('./routes/logs');
const usageRoutes = require('./routes/usage');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Fix #3: Security headers via helmet ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.BASE_URL].filter(Boolean),
      frameSrc: ["'none'"],
      frameAncestors: [
        "'self'",
        "https://app.hubspot.com",
        "https://app-eu1.hubspot.com",
        "https://app-na1.hubspot.com",
        "https://*.hubspot.com"
      ]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// --- Fix #5: Environment-aware CORS configuration ---
const corsOrigins = [
  'https://app.hubspot.com',
  'https://app-eu1.hubspot.com',
  'https://app-na1.hubspot.com',
  /^https:\/\/app[.-][a-z0-9]+\.hubspot\.com$/,
  process.env.BASE_URL
];

if (process.env.NODE_ENV === 'development') {
  corsOrigins.push(
    /\.ngrok-free\.dev$/,
    /\.ngrok\.io$/,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  );
}

const corsOptions = {
  origin: corsOrigins.filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-HubSpot-Signature', 'X-HubSpot-Signature-Version', 'ngrok-skip-browser-warning']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/oauth', oauthRoutes);
app.use('/v1/actions', actionsRoutes);
app.use('/v1/snippets', snippetsRoutes);
app.use('/v1/secrets', secretsRoutes);
app.use('/v1/logs', logsRoutes);
app.use('/v1/usage', usageRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Await DB connection before starting server + graceful shutdown ---
let server;

async function startServer() {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      logger.info(`HubHacks server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  try {
    if (server) {
      await new Promise((resolve) => {
        const forceTimer = setTimeout(() => {
          logger.warn('Forced shutdown after 10s timeout');
          resolve();
        }, 10000);
        server.close(() => {
          clearTimeout(forceTimer);
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error('Error during graceful shutdown', { error: err.message });
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = app;
