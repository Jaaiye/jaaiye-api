/**
 * Payment Validators
 * Presentation layer - request validation
 */

const { body, param } = require('express-validator');

const initializePaymentValidator = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .withMessage('Event ID is required'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
];

const verifyPaymentValidator = [
  body('reference')
    .notEmpty()
    .withMessage('Reference is required')
];

const registerTransactionValidator = [
  body('provider')
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(['paystack', 'flutterwave', 'payaza', 'monnify'])
    .withMessage('Invalid provider'),
  body('reference')
    .notEmpty()
    .withMessage('Reference is required'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .withMessage('Event ID is required'),
  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('status')
    .optional()
    .isIn(['pending', 'successful', 'failed', 'cancelled', 'completed', 'created'])
    .withMessage('Invalid status')
];

const updateTransactionValidator = [
  body('reference')
    .notEmpty()
    .withMessage('Reference is required'),
  body('transId')
    .optional()
    .isNumeric()
    .withMessage('Transaction ID must be numeric'),
  body('transReference')
    .optional()
    .isString()
    .withMessage('Transaction reference must be a string'),
  body('status')
    .optional()
    .isIn(['pending', 'successful', 'failed', 'cancelled', 'completed', 'created'])
    .withMessage('Invalid status')
];

module.exports = {
  initializePaymentValidator,
  verifyPaymentValidator,
  registerTransactionValidator,
  updateTransactionValidator
};

