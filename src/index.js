require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const swaggerUi = require('swagger-ui-express');
const specs = require('./config/swagger');
const { initSocket } = require('./utils/socket');

const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/asyncHandler');
const logger = require('./utils/logger');
const { notifyServerError } = require('./utils/errorAlert');


// Initialize Express app
const app = express();

/**
 * Swagger UI with automatic token population logic
 */
const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customJs: `
    (function() {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0];
        
        // If this is a login request and successful
        if (url.includes('/auth/login') && response.status === 200) {
          const clone = response.clone();
          const result = await clone.json();
          if (result && result.success && result.data && result.data.accessToken) {
            const token = result.data.accessToken;
            // Set the token in Swagger UI's internal state
            setTimeout(() => {
              const ui = window.ui;
              if (ui) {
                ui.authActions.authorize({
                  bearerAuth: {
                    name: "bearerAuth",
                    schema: {
                      type: "http",
                      scheme: "bearer",
                      bearerFormat: "JWT"
                    },
                    value: token
                  }
                });
                console.log('Successfully authorized with token from login');
              }
            }, 500);
          }
        }
        return response;
      };
    })();
  `
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Trust proxy - needed for express-rate-limit when behind a reverse proxy (e.g. Vercel, Nginx, Heroku)
app.set('trust proxy', 1);

// Trace ID Middleware (Generate unique ID for every request)
const { traceMiddleware } = require('./middleware/traceMiddleware');
app.use(traceMiddleware);

// Create HTTP server
const server = require('http').createServer(app);

// Initialize WebSocket
initSocket(server);


// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
// CORS configuration to support credentials from specific origins
const allowedOrigins = [
  process.env.ADMIN_ORIGIN,
  process.env.FRONTEND_ORIGIN,
  'https://jaaiye-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:3031',
  'https://jaaiye-checkout.vercel.app',
  'https://tickets.jaaiye.com',
  'https://events.jaaiye.com',
  'https://demoevent.jaaiye.com',
  'https://admin.jaaiye.com',
  'https://logs.jaaiye.com',
  'http://localhost:3005',
  'https://immodest-courthouse.outray.app',
  'https://api.jaaiye.com',
  'https://dev.jaaiye.com',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser/SSR requests without an origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o =>
      (o || '').toLowerCase().replace(/\/$/, '') === normalizedOrigin
    );

    if (isAllowed) {
      return callback(null, true);
    }

    // Log the rejected origin to help debugging
    console.warn(`[CORS Blocked] Origin: "${origin}" not allowed by policy.`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
  exposedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Parse JSON bodies, but skip multipart/form-data (handled by multer)
app.use((req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  // Skip JSON parsing for multipart/form-data requests - multer will handle it
  // Check for both 'multipart/form-data' and boundary parameter
  const isMultipart = contentType.includes('multipart/form-data') || contentType.includes('boundary=');

  if (isMultipart) {
    return next();
  }
  // Only parse JSON for non-multipart requests
  // Capture the exact raw bytes as they were received - payment provider
  // webhook signatures (Paystack/Flutterwave) are computed over these exact
  // bytes, and re-serializing the parsed body with JSON.stringify() later is
  // not guaranteed to reproduce them byte-for-byte.
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })(req, res, (err) => {
    // If JSON parsing fails, check if it might be multipart (fallback)
    if (err && err instanceof SyntaxError && err.message.includes('JSON') && err.message.includes('------')) {
      // This looks like multipart data that was incorrectly parsed as JSON
      // Clear the error and let multer handle it
      return next();
    }
    next(err);
  });
});
// Parse URL-encoded bodies, but skip multipart/form-data
app.use((req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const isMultipart = contentType.includes('multipart/form-data') || contentType.includes('boundary=');
  if (isMultipart) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Request logging middleware (comprehensive logging)
app.use(requestLogger);

// Rate limiting - exclude authenticated/admin routes as they have their own rate limiters
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000, // limit each IP to 1000 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for authenticated routes that have their own limiters
    // This prevents double counting
    const path = req.path || '';
    return path === '/health' ||
      path.startsWith('/api/v1/health') ||
      path.startsWith('/api/v1/analytics') ||
      path.startsWith('/api/v1/admin') ||
      path.startsWith('/api/v1/auth') && req.headers.authorization;
  }
});
app.use(limiter);

// Health check endpoints
app.get('/health', (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected';

    const memoryUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        connectionState: dbState,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      },
      memory: {
        usage: memoryMB,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// Webhook test endpoint (for testing webhook connectivity)
app.use('/webhooks/test', require('./routes/webhookTestRoutes'));

app.use('/webhooks', require('./routes/webhookRoutes'));

// Public OAuth redirect endpoints
// Google redirects here without auth token
const handleOAuthRedirect = (req, res, next) => {
  const controller = require('./modules/calendar/calendar.module').getCalendarController();
  return controller.handleOAuthRedirect(req, res, next);
};

// New endpoint
app.get('/oauth/redirect', handleOAuthRedirect);

// Legacy endpoint (for backward compatibility - redirects to same handler)
app.get('/api/v1/calendars/google/oauth/callback', handleOAuthRedirect);

// Populate req.user (if a valid Bearer token is present) before any middleware
// that needs to inspect it. restrictGuest below relies on req.user being set here -
// without this, req.user is always undefined at this point in the chain and
// restrictGuest silently never restricts anything.
app.use(require('./modules/auth/auth.module').getOptionalAuthMiddleware());

// Guest Restriction Middleware
const { restrictGuest } = require('./middleware/guestRestrictionMiddleware');
app.use(restrictGuest);

app.use('/api/v1/auth', require('./modules/auth/auth.module').getAuthRoutes());
app.use('/api/v1/users', require('./modules/user/user.module').getUserRoutes());
app.use('/api/v1/admin', require('./modules/admin/admin.module').getAdminRoutes());
app.use('/api/v1/analytics', require('./modules/analytics/analytics.module').getAnalyticsRoutes());
app.use('/api/v1/calendars', require('./modules/calendar/calendar.module').getCalendarRoutes());
try {
  const eventRoutes = require('./modules/event/event.module').getEventRoutes();
  if (!eventRoutes) {
    logger.error('Event routes are null or undefined');
  }
  app.use('/api/v1/events', eventRoutes);
} catch (error) {
  logger.error('Failed to register event routes:', error);
  throw error;
}
app.use('/api/v1/notifications', require('./modules/notification/notification.module').getNotificationRoutes());
app.use('/api/v1/ics', require('./routes/icsRoutes'));
app.use('/api/v1/groups', require('./modules/group/group.module').getGroupRoutes());
app.use('/api/v1/tickets', require('./modules/ticket/ticket.module').getTicketRoutes());
app.use('/api/v1/transactions', require('./modules/payment/payment.module').getTransactionRoutes());
app.use('/api/v1/payments', require('./modules/payment/payment.module').getPaymentRoutes());
app.use('/api/v1/wallets', require('./modules/wallet/wallet.module').getWalletRoutes());
app.use('/api/v1/referrals', require('./modules/referral/referral.module').getReferralRoutes());
app.use('/api/v1/app-config', require('./modules/common/app-config.module').getAppConfigRoutes());
app.use('/api/v1/webhook', require('./routes/webhookRoutes'));


// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  await notifyServerError(err, { path: 'process:unhandledRejection' }).catch(() => {});
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  await notifyServerError(err, { path: 'process:uncaughtException' }).catch(() => {});
  process.exit(1);
});

// Connect to MongoDB using existing configuration
connectDB();

// Start background services
const queueModule = require('./modules/queue/queue.module');
const ticketModule = require('./modules/ticket/ticket.module');

queueModule.getPaymentPollingQueue().start();
queueModule.getWithdrawalPollingQueue().start();
queueModule.getPayoutSchedulerQueue().start();

// Initialize and start uptime monitor
const uptimeMonitor = queueModule.getUptimeMonitor();
uptimeMonitor.init({ emailAdapter: ticketModule.getEmailAdapter() });
uptimeMonitor.start();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});