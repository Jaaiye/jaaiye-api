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
  body('complimentary')
    .optional()
    .isBoolean()
    .withMessage('Complimentary must be a boolean'),
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

const scanTicketValidator = [
  query('t')
    .notEmpty()
    .withMessage('Token is required')
];

const verifyAndUseTicketValidator = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
];

const cancelTicketValidator = [
  body('ticketId')
    .notEmpty()
    .withMessage('Ticket ID is required')
    .isMongoId()
    .withMessage('Invalid ticket ID format')
];

module.exports = {
  createTicketValidator,
  getTicketByIdValidator,
  getEventTicketsValidator,
  scanTicketValidator,
  verifyAndUseTicketValidator,
  cancelTicketValidator
};

