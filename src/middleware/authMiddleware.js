/**
 * Authentication Middleware
 * Exports DDD middleware for use across the application
 */

const authContainer = require('../domains/auth/config/container');
const { requireAdmin, requireScanner, requireSuperAdmin } = require('../domains/auth/presentation/middleware');

// Export protect middleware from Auth domain
exports.protect = authContainer.getAuthMiddleware();

// Export optional auth middleware (doesn't fail if no token)
exports.optionalAuth = authContainer.getOptionalAuthMiddleware();

// Export authorization middleware
exports.admin = requireAdmin;
exports.superadmin = requireSuperAdmin;
exports.scanner = requireScanner;

// Check if email is verified
exports.verified = (req, res, next) => {
  const user = req.user;

  if (!user || !user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Please verify your email first'
    });
  }
  next();
};