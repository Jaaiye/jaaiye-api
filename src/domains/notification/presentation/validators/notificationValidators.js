const { body } = require('express-validator');

const validateRegisterDeviceToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string'),
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web')
];

const validateRemoveDeviceToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string')
];

module.exports = {
  validateRegisterDeviceToken,
  validateRemoveDeviceToken
};

