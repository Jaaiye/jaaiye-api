/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request.
 * Also maintains online presence heartbeat via Redis.
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { TokenService } = require('../common/services');
const { UnauthorizedError, TooManyRequestsError } = require('../common/errors');
const { UserEntity } = require('../common/entities');

/**
 * Create authentication middleware
 * @param {Object} dependencies
 * @returns {Function} Express middleware
 */
function createAuthMiddleware({ userRepository, tokenBlacklistRepository, redisAuthService }) {
  return asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify signature + expiry
    const decoded = TokenService.verifyAccessToken(token);

    // Check blacklist (Redis — O(1), no DB)
    const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token is invalid');
    }

    // Find user
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const userEntity = new UserEntity(user);
    userEntity.canLogin();

    const userObj = userEntity.toObject();
    userObj._id = userEntity.id;
    req.user = userObj;
    req.token = token;

    // Online presence heartbeat — fire-and-forget (never block the request)
    if (redisAuthService) {
      redisAuthService.markOnline(userEntity.id).catch(err => {
        console.error('[Auth] Online presence heartbeat failed:', err);
      });
    }

    next();
  });
}

/**
 * Create optional authentication middleware
 * Tries to authenticate but doesn't fail if no token is provided.
 * @param {Object} dependencies
 * @returns {Function} Express middleware
 */
function createOptionalAuthMiddleware({ userRepository, tokenBlacklistRepository, redisAuthService }) {
  return asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = TokenService.verifyAccessToken(token);

      const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(token);
      if (isBlacklisted) {
        req.user = null;
        return next();
      }

      const user = await userRepository.findById(decoded.id);
      if (!user) {
        req.user = null;
        return next();
      }

      const userEntity = new UserEntity(user);

      try {
        userEntity.canLogin();
      } catch {
        req.user = null;
        return next();
      }

      const userObj = userEntity.toObject();
      userObj._id = userEntity.id;
      req.user = userObj;
      req.token = token;

      if (redisAuthService) {
        redisAuthService.markOnline(userEntity.id).catch(() => { });
      }
    } catch {
      req.user = null;
    }

    next();
  });
}

/**
 * Login rate limiting middleware.
 * Applied to the login route; blocks IPs with too many failed attempts.
 * @param {Object} redisAuthService
 * @returns {Function} Express middleware
 */
function createLoginRateLimiter(redisAuthService) {
  return asyncHandler(async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const { allowed, retryAfterSeconds } = await redisAuthService.checkLoginRateLimit(ip);

    if (!allowed) {
      res.set('Retry-After', String(retryAfterSeconds));
      throw new TooManyRequestsError(
        `Too many login attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
      );
    }

    // Clear rate limit on successful login
    res.on('finish', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        redisAuthService.clearLoginRateLimit(ip).catch(() => { });
      }
    });

    next();
  });
}

module.exports.createAuthMiddleware = createAuthMiddleware;
module.exports.createOptionalAuthMiddleware = createOptionalAuthMiddleware;
module.exports.createLoginRateLimiter = createLoginRateLimiter;
