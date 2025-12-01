/**
 * Auth Routes
 * Presentation layer - route definitions
 */

const express = require('express');

/**
 * Create auth routes
 * @param {Object} dependencies - { authController, authMiddleware }
 * @returns {express.Router}
 */
function createAuthRoutes({ authController, authMiddleware }) {
  const router = express.Router();

  // POST /auth/register - Register new user
  router.post('/register', authController.register);

  // POST /auth/login - Login user
  router.post('/login', authController.login);

  // POST /auth/google/signin - Google OAuth login/register
  router.post('/google/signin', authController.googleOAuth);

  // POST /auth/verify-email - Verify email with code
  router.post('/verify-email', authController.verifyEmail);

  // POST /auth/forgot-password - Request password reset
  router.post('/forgot-password', authController.forgotPassword);

  // POST /auth/reset-password - Reset password with code
  router.post('/reset-password', authController.resetPassword);

  // POST /auth/refresh-token - Refresh access token
  router.post('/refresh-token', authController.refreshToken);

  // POST /auth/resend - Resend verification or reset code
  router.post('/resend', authController.resend);

  // POST /auth/create-user - Quick user creation
  router.post('/create-user', authController.createUser);

  return router;
}

module.exports = createAuthRoutes;

