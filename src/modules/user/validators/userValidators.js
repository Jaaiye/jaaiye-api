/**
 * User Validators
 * Presentation layer - request validators
 */

const { body } = require('express-validator');

const validatePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

const validateProfilePicture = [
  body('emoji').notEmpty().withMessage('Emoji is required'),
  body('color').notEmpty().withMessage('Color is required'),
];

const validateDeactivateAccount = [
  body('password').notEmpty().withMessage('Password is required to deactivate account')
];

const validateUpdateEmail = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('currentPassword').notEmpty().withMessage('Current password is required')
];

module.exports = {
  validatePassword,
  validateProfilePicture,
  validateDeactivateAccount,
  validateUpdateEmail
};

