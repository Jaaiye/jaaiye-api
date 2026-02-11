const logger = require('./logger');
const { sanitizeLogData } = require('./logSanitizer');

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Minimal request logging middleware (one line per request), gated by env
const requestLogger = (req, res, next) => {
  if (process.env.LOG_REQUESTS !== 'true') return next();

  // Skip health checks and common static assets to save quota
  const path = req.path || '';
  if (path === '/health' || path.includes('health') || path.endsWith('.ico')) {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    // Only log if it's an error (4xx/5xx) or if it's a non-GET mutation request
    // This dramatically reduces volume while keeping important audit trails
    const isError = res.statusCode >= 400;
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (isError || isMutation) {
      const duration = Date.now() - start;
      const metadata = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        userId: req.user?.id,
        traceId: req.traceId
      };

      // Extract audit IDs from body or query for mutations
      if (isMutation) {
        const auditId = req.body?.transactionId || req.body?.requestId || req.body?.reference || req.query?.reference;
        if (auditId) metadata.auditId = auditId;
      }

      const info = sanitizeLogData(metadata);
      logger.info('Request', info);
    }
  });

  next();
};

module.exports = {
  asyncHandler,
  requestLogger
};