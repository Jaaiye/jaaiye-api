/**
 * Authorization Middleware
 * Presentation layer - middleware
 * Checks user roles and permissions
 */

const { ForbiddenError } = require('./errors');

/**
 * Create authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
function createAuthorizeMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      throw new ForbiddenError('Access denied');
    }

    // Check if user has any of the allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}

/**
 * Check if user is admin
 * Works with plain objects (after UserEntity conversion)
 */
function requireAdmin(req, res, next) {
  const user = req.user;

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    throw new ForbiddenError('Admin access required');
  }

  next();
}

/**
 * Check if user is scanner
 * Works with plain objects (after UserEntity conversion)
 */
function requireScanner(req, res, next) {
  const user = req.user;

  if (!user || !['scanner', 'admin', 'superadmin'].includes(user.role)) {
    throw new ForbiddenError('Scanner access required');
  }

  next();
}

/**
 * Check if user is superadmin
 * Works with plain objects (after UserEntity conversion)
 */
function requireSuperAdmin(req, res, next) {
  const user = req.user;

  if (!user || user.role !== 'superadmin') {
    throw new ForbiddenError('Super admin access required');
  }

  next();
}

module.exports = {
  createAuthorizeMiddleware,
  requireAdmin,
  requireScanner,
  requireSuperAdmin
};

