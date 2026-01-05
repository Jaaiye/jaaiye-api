/**
 * Authentication Middleware
 * Exports DDD middleware for use across the application
 */

const authModule = require('../modules/auth/auth.module');
const { requireAdmin, requireScanner, requireSuperAdmin } = require('../modules/auth/authorize');

// Export protect middleware from Auth module
exports.protect = authModule.getAuthMiddleware();

// Export optional auth middleware (doesn't fail if no token)
exports.optionalAuth = authModule.getOptionalAuthMiddleware();

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