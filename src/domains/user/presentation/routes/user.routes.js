/**
 * User Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const { protect } = require('../../../../middleware/authMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
const {
  validatePassword,
  validateDeactivateAccount,
  validateUpdateEmail
} = require('../validators/userValidators');

/**
 * Create user routes
 * @param {Object} dependencies - { userController }
 * @returns {express.Router}
 */
function createUserRoutes({ userController }) {
  const router = express.Router();

  // All routes require authentication
  router.use(protect);

  // User profile routes
  router.get('/firebase-token', userController.getFirebaseToken);
  router.get('/profile', userController.getProfile);
  router.put('/profile', userController.updateProfile);
  router.put('/password', validatePassword, validate, userController.changePassword);
  router.put('/email', validateUpdateEmail, validate, userController.updateEmail);
  router.delete('/', validateDeactivateAccount, validate, userController.deleteUser);
  router.post('/logout', userController.logout);

  // Friendship routes (integrated under /users)
  const friendshipRoutes = require('../../../friendship/config/container').getFriendshipRoutes();
  router.use('/', friendshipRoutes);

  return router;
}

module.exports = createUserRoutes;

