/**
 * Friendship Validators
 * Presentation layer - request validation
 */

const { body } = require('express-validator');

const validateFriendRequest = [
  body('recipientId')
    .isMongoId()
    .withMessage('Valid recipient ID is required'),
  body('message')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters')
];

const validateFriendRequestResponse = [
  body('action')
    .isIn(['accept', 'decline'])
    .withMessage('Action must be either "accept" or "decline"')
];

const validateFriendSettings = [
  body('allowFriendRequests')
    .optional()
    .isBoolean()
    .withMessage('allowFriendRequests must be boolean'),
  body('allowRequestsFrom')
    .optional()
    .isIn(['everyone', 'friends_of_friends', 'nobody'])
    .withMessage('Invalid allowRequestsFrom value'),
  body('showInSearch')
    .optional()
    .isBoolean()
    .withMessage('showInSearch must be boolean')
];

const validateRemoveFriend = [
  body('friendId')
    .notEmpty()
    .withMessage('Friend ID is required')
    .isMongoId()
    .withMessage('Invalid friend ID format')
];

module.exports = {
  validateFriendRequest,
  validateFriendRequestResponse,
  validateFriendSettings,
  validateRemoveFriend
};


