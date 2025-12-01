/**
 * Auth Domain Entry Point
 * Export all public interfaces
 */

const { authContainer } = require('./config');
const {
  createAuthMiddleware,
  requireAdmin,
  requireScanner,
  requireSuperAdmin
} = require('./presentation/middleware');

// Export routes (ready to mount)
const authRoutes = authContainer.getAuthRoutes();

// Export middleware (for use in other domains)
const authMiddleware = authContainer.getAuthMiddleware();

// Export authorization helpers
const authorizationMiddleware = {
  requireAdmin,
  requireScanner,
  requireSuperAdmin
};

// Export repositories (for use in other domains)
const repositories = {
  userRepository: authContainer.getUserRepository(),
  tokenBlacklistRepository: authContainer.getTokenBlacklistRepository()
};

// Export services (for use in other domains)
const { OAuthService } = require('./domain/services');
const { TokenService, PasswordService } = require('../shared/domain/services');

module.exports = {
  // Routes (mount with app.use('/auth', authRoutes))
  authRoutes,

  // Middleware
  authMiddleware,
  authorizationMiddleware,

  // Repositories (for cross-domain use)
  repositories,

  // Services (for cross-domain use)
  services: {
    TokenService,
    PasswordService,
    OAuthService
  },

  // Container (for advanced use)
  authContainer
};

