/**
 * Authentication Middleware
 * Presentation layer - middleware
 * Validates JWT tokens and attaches user to request
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { TokenService } = require('../common/services');
const { UnauthorizedError } = require('../common/errors');
const { UserEntity } = require('../common/entities');

/**
 * Create authentication middleware
 * @param {Object} dependencies - { userRepository, tokenBlacklistRepository }
 * @returns {Function} Express middleware
 */
function createAuthMiddleware({ userRepository, tokenBlacklistRepository }) {
  return asyncHandler(async (req, res, next) => {
    // Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = TokenService.verifyAccessToken(token);

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token is invalid');
    }

    // Find user
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      console.error('[Auth Middleware] User lookup failed:', {
        userId: decoded.id,
        userIdType: typeof decoded.id,
        path: req.path,
        method: req.method
      });
      throw new UnauthorizedError('User not found');
    }

    // Create user entity
    const userEntity = new UserEntity(user);

    // Check if user can login (will throw if blocked)
    userEntity.canLogin();

    // Attach user to request
    // Add _id for compatibility with controllers that use req.user._id
    const userObj = userEntity.toObject();
    userObj._id = userEntity.id;
    req.user = userObj;
    req.token = token;

    next();
  });
}

/**
 * Create optional authentication middleware
 * Tries to authenticate but doesn't fail if no token is provided
 * @param {Object} dependencies - { userRepository, tokenBlacklistRepository }
 * @returns {Function} Express middleware
 */
function createOptionalAuthMiddleware({ userRepository, tokenBlacklistRepository }) {
  return asyncHandler(async (req, res, next) => {
    // Extract token from header
    const authHeader = req.headers.authorization;

    // If no token, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    try {
      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = TokenService.verifyAccessToken(token);

      // Check if token is blacklisted
      const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(token);
      if (isBlacklisted) {
        req.user = null;
        return next();
      }

      // Find user
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        req.user = null;
        return next();
      }

      // Create user entity
      const userEntity = new UserEntity(user);

      // Check if user can login (will throw if blocked)
      try {
        userEntity.canLogin();
      } catch (error) {
        // User is blocked or can't login, continue without auth
        req.user = null;
        return next();
      }

      // Attach user to request
      // Add _id for compatibility with controllers that use req.user._id
      const userObj = userEntity.toObject();
      userObj._id = userEntity.id;
      req.user = userObj;
      req.token = token;
    } catch (error) {
      // Token invalid or any other error, continue without auth
      req.user = null;
    }

    next();
  });
}

module.exports.createAuthMiddleware = createAuthMiddleware;
module.exports.createOptionalAuthMiddleware = createOptionalAuthMiddleware;

