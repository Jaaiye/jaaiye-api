/**
 * Middleware Export
 */

const { createAuthMiddleware, createOptionalAuthMiddleware } = require('./authenticate');
const {
  createAuthorizeMiddleware,
  requireAdmin,
  requireScanner,
  requireSuperAdmin
} = require('./authorize');

module.exports = {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  createAuthorizeMiddleware,
  requireAdmin,
  requireScanner,
  requireSuperAdmin
};

