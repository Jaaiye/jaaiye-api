const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');
const redisClient = require('../utils/redis');

const KEY_PREFIX = 'idempotency:';
const TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Middleware to handle idempotency keys for payment requests.
 * Ensures duplicate requests (client retries, double-submits) return the
 * same response instead of re-executing the operation.
 *
 * Backed by Redis rather than in-process memory so it works correctly
 * across multiple server instances/processes and survives restarts.
 */
const idempotencyMiddleware = asyncHandler(async (req, res, next) => {
  // Only apply to POST requests for payment endpoints.
  // NOTE: this middleware is mounted inside the payment router
  // (app.use('/api/v1/payments', router)), so req.path there is already
  // relative to that mount point (e.g. '/paystack/init') and never
  // contains '/payments/' - req.originalUrl is the only reliable place to
  // check for the full path. Using req.path here previously made this
  // condition always true, i.e. idempotency protection silently never ran.
  if (req.method !== 'POST' || !req.originalUrl.includes('/payments/')) {
    return next();
  }

  // Get idempotency key from header
  const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['X-Idempotency-Key'];

  if (!idempotencyKey) {
    // Generate a new idempotency key if none provided
    req.idempotencyKey = uuidv4();
    logger.info('Generated new idempotency key', {
      key: req.idempotencyKey,
      path: req.path
    });
    return next();
  }

  const redisKey = `${KEY_PREFIX}${idempotencyKey}`;

  let claimed;
  try {
    // Atomically claim the key: only the first request with this key
    // succeeds here. Concurrent duplicate requests fall through to the
    // "already in flight / already completed" branch below.
    claimed = await redisClient.set(redisKey, JSON.stringify({ state: 'processing' }), {
      NX: true,
      EX: TTL_SECONDS
    });
  } catch (error) {
    // Fail closed: payment-mutating endpoints must not silently lose their
    // duplicate-request protection just because Redis is unreachable.
    logger.error('Idempotency store unavailable', { error: error.message, path: req.path });
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable, please retry shortly'
    });
  }

  if (!claimed) {
    const existingRaw = await redisClient.get(redisKey).catch(() => null);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;

    if (existing && existing.state === 'completed') {
      logger.info('Returning cached response for idempotency key', {
        key: idempotencyKey,
        path: req.path
      });
      res.set('X-Idempotency-Cache-Hit', 'true');
      return res.status(existing.status).json(existing.data);
    }

    // Another request with the same key is still being processed.
    logger.info('Rejecting concurrent duplicate request for idempotency key', {
      key: idempotencyKey,
      path: req.path
    });
    return res.status(409).json({
      success: false,
      error: 'A request with this idempotency key is already being processed'
    });
  }

  req.idempotencyKey = idempotencyKey;

  // Override res.json to cache successful responses
  const originalJson = res.json;
  res.json = function (data) {
    // Only cache successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redisClient
        .set(redisKey, JSON.stringify({ state: 'completed', status: res.statusCode, data }), {
          EX: TTL_SECONDS
        })
        .then(() => {
          logger.info('Cached response for idempotency key', {
            key: idempotencyKey,
            status: res.statusCode,
            path: req.path
          });
        })
        .catch((error) => {
          logger.error('Failed to cache idempotency response', { error: error.message, key: idempotencyKey });
        });
    } else {
      // Release the claim on non-2xx responses so a genuine retry isn't
      // stuck behind a stale "processing" entry until it expires.
      redisClient.del(redisKey).catch(() => {});
    }

    return originalJson.call(this, data);
  };

  next();
});

/**
 * Generate a unique idempotency key for a payment request
 * Combines user ID, event ID, and timestamp for uniqueness
 */
function generatePaymentIdempotencyKey(userId, eventId, ticketTypeId, amount) {
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const data = `${userId}-${eventId}-${ticketTypeId}-${amount}-${timestamp}`;

  // Create a deterministic UUID-like key
  const hash = require('crypto')
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32);

  // Format as UUID
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Validate idempotency key format
 */
function isValidIdempotencyKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

module.exports = {
  idempotencyMiddleware,
  generatePaymentIdempotencyKey,
  isValidIdempotencyKey
};
