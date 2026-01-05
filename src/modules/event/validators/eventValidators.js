const { body, param } = require('express-validator');

const CATEGORIES = ['hangout', 'event'];

function normalizeCategory(req) {
  const category = req.body.category;
  if (!category) {
    return 'hangout';
  }
  return String(category).toLowerCase();
}

const validateCreateEvent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),

  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .bail()
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),

  body('category')
    .optional({ checkFalsy: true })
    .custom(value => {
      const normalized = String(value).toLowerCase();
      if (!CATEGORIES.includes(normalized)) {
        throw new Error('Category must be either "hangout" or "event"');
      }
      return true;
    }),

  body('ticketFee')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      const category = normalizeCategory(req);
      if (category === 'hangout' && value !== undefined && value !== null && value !== '') {
        throw new Error('Hangouts cannot include ticket fees');
      }
      return true;
    }),

  body('ticketTypes')
    .optional({ nullable: true })
    .custom((ticketTypes, { req }) => {
      const category = normalizeCategory(req);
      if (category === 'hangout') {
        if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
          throw new Error('Hangouts cannot include ticket types');
        }
        return true;
      }
      return true;
    })
];

const validateUpdateEvent = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),

  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['scheduled', 'cancelled', 'completed'])
    .withMessage('Status must be one of: scheduled, cancelled, completed')
];

const validateAddParticipants = [
  body('userId')
    .optional()
    .notEmpty()
    .withMessage('userId is required if provided'),
  body('user')
    .optional()
    .notEmpty()
    .withMessage('user is required if provided'),
  body('participants')
    .optional()
    .isArray()
    .withMessage('participants must be an array'),
  body('participants.*.userId')
    .optional()
    .notEmpty()
    .withMessage('Each participant must have userId'),
  body('participants.*.user')
    .optional()
    .notEmpty()
    .withMessage('Each participant must have user'),
  body('participants.*.role')
    .optional()
    .isIn(['organizer', 'attendee'])
    .withMessage('Role must be either "organizer" or "attendee"')
];

const validateUpdateParticipantStatus = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'accepted', 'declined', 'tentative'])
    .withMessage('Status must be one of: pending, accepted, declined, tentative')
];

const validateEventId = [
  param('id')
    .notEmpty()
    .withMessage('Event ID is required')
];

const validateDeleteEvent = [
  body('id')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID format')
];

const validateRemoveParticipant = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID format'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

const validateAddTeamMember = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['co_organizer', 'ticket_scanner'])
    .withMessage('Role must be either co_organizer or ticket_scanner'),
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty if provided'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body()
    .custom((value) => {
      // At least one of username or email must be provided
      if (!value.username && !value.email) {
        throw new Error('Either username or email is required');
      }
      return true;
    })
];

const validateIssueTicket = [
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
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty if provided'),
  body('bypassCapacity')
    .optional()
    .isBoolean()
    .withMessage('Bypass capacity must be a boolean'),
  body()
    .custom((value) => {
      // At least one of userId or username must be provided
      if (!value.userId && !value.username) {
        throw new Error('Either userId or username is required');
      }
      return true;
    })
];

module.exports = {
  validateCreateEvent,
  validateUpdateEvent,
  validateAddParticipants,
  validateUpdateParticipantStatus,
  validateEventId,
  validateDeleteEvent,
  validateRemoveParticipant,
  validateAddTeamMember,
  validateIssueTicket
};

