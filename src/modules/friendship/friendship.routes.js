/**
 * Friendship Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');
const {
  validateFriendRequest,
  validateFriendRequestResponse,
  validateFriendSettings,
  validateRemoveFriend
} = require('./validators/friendshipValidators');

/**
 * Create friendship routes
 * @param {Object} dependencies - { friendshipController }
 * @returns {express.Router}
 */
function createFriendshipRoutes({ friendshipController }) {
  const router = express.Router();

  // All routes require authentication
  router.use(protect);

  // Friendship routes (under /users as per legacy)
  router.get('/search', friendshipController.searchUsers);
  router.post('/friend-request', validateFriendRequest, validate, friendshipController.sendFriendRequest);
  router.get('/friend-requests', friendshipController.getFriendRequests);
  router.put('/friend-requests/:requestId', validateFriendRequestResponse, validate, friendshipController.respondToFriendRequest);
  router.get('/friends', friendshipController.getFriends);
  router.delete('/friends', validateRemoveFriend, validate, friendshipController.removeFriend);
  router.post('/block/:userId', friendshipController.blockUser);
  router.post('/unblock/:userId', friendshipController.unblockUser);
  router.put('/friend-settings', validateFriendSettings, validate, friendshipController.updateFriendSettings);

  return router;
}

module.exports = createFriendshipRoutes;


