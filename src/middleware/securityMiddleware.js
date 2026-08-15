const rateLimit = require('express-rate-limit');
const { generateDeviceFingerprint, rateLimitKey } = require('../utils/securityUtils');

// Rate limiting for API routes
// Using IP-only key generator for authenticated routes to avoid double counting
// The global limiter already handles device fingerprinting
exports.apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 2000, // Increased to 2000 for admin dashboard (makes 5+ parallel requests)
  keyGenerator: (req) => {
    // 1. User ID (if already authenticated by middleware)
    if (req.user && req.user.id) return req.user.id;

    // 2. Authorization Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Return the token part
    }

    // 3. Fallback to IP
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: 'Too many requests, please try again later',
  skip: (req) => {
    // Skip rate limiting for health checks and other public endpoints
    return req.path === '/health' || req.path.startsWith('/api/v1/health');
  }
});

// Device fingerprint validation
exports.validateDevice = (req, res, next) => {
  const deviceFingerprint = generateDeviceFingerprint(req);
  req.deviceFingerprint = deviceFingerprint;
  next();
};

// Security headers
exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};

// Request sanitization
exports.sanitizeRequest = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};