/**
 * Ticket Validators
 * Presentation layer - request validation
 */

const { body, param, query } = require('express-validator');

const createTicketValidator = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID'),
  body('ticketTypeId')
    .optional()
    .isMongoId()
    .withMessage('Invalid ticket type ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('username')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Username must be a non-empty string'),
  body('bypassCapacity')
    .optional()
    .isBoolean()
    .withMessage('Bypass capacity must be a boolean')
];

const getTicketByIdValidator = [
  param('ticketId')
    .isMongoId()
    .withMessage('Invalid ticket ID')
];

const getEventTicketsValidator = [
  param('eventId')
    .isMongoId()
    .withMessage('Invalid event ID')
];

const cancelTicketValidator = [
  body('ticketId')
    .notEmpty()
    .withMessage('Ticket ID is required')
    .isMongoId()
    .withMessage('Invalid ticket ID format')
];

const getTicketByPublicIdValidator = [
  param('publicId')
    .notEmpty()
    .withMessage('Public ID is required')
    .isString()
    .trim()
    .withMessage('Public ID must be a string'),
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID')
];

const scanAndVerifyTicketValidator = [
  body('identifier')
    .notEmpty()
    .withMessage('Identifier (token or publicId) is required')
    .isString()
    .trim()
    .withMessage('Identifier must be a string'),
  body('eventId')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID')
];

module.exports = {
  createTicketValidator,
  getTicketByIdValidator,
  getEventTicketsValidator,
  getTicketByPublicIdValidator,
  scanAndVerifyTicketValidator,
  cancelTicketValidator
};

