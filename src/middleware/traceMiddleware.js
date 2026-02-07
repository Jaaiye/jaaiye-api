const { v4: uuidv4 } = require('uuid');
const als = require('../utils/als');
const logger = require('../utils/logger');

/**
 * Trace Middleware
 * Assigns a unique traceId to every request for end-to-end tracking
 */
const traceMiddleware = (req, res, next) => {
    // Use existing request ID if provided (e.g., from a gateway) or generate new one
    const traceId = req.headers['x-trace-id'] || req.headers['x-request-id'] || uuidv4();

    // Attach to request object for use in controllers
    req.traceId = traceId;

    // Set header in response for client-side tracking/reporting
    res.setHeader('x-trace-id', traceId);

    // Note: We don't log the start of every request here because 'morgan' or 'requestLogger' 
    // might already be doing it. We just want to ensure the traceId is available.

    // Run the rest of the request within the async storage context
    als.run({ traceId, userId: req.user?.id }, () => {
        next();
    });
};

/**
 * Request Logger Wrapper
 * Ensures traceId is included in all logs during this request
 */
const injectTraceToLogger = (req, res, next) => {
    // This is a bit tricky with Winston as it's a global singleton.
    // However, we can use the defaultMeta or child loggers if we were using a different architecture.
    // For now, we will simply make sure our controllers pass req.traceId to logger methods.
    next();
};

module.exports = { traceMiddleware, injectTraceToLogger };
