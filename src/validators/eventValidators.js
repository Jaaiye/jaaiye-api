const { body } = require('express-validator');

const CATEGORIES = ['hangout', 'event'];

function normalizeCategory(req) {
  const category = req.body.category;
  if (!category) {
    return 'hangout';
  }
  return String(category).toLowerCase();
}

exports.createEventValidator = [
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

      if (category === 'event') {
        if (value === undefined || value === null || value === '') {
          return true; // handled later; allow events to omit fee if ticket types provided
        }
        if (value === 'free') {
          return true;
        }
        const numericValue = Number(value);
        if (Number.isNaN(numericValue) || numericValue < 0) {
          throw new Error('ticketFee must be a non-negative number or the string "free"');
        }
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

      if (ticketTypes === undefined || ticketTypes === null || ticketTypes === '') {
        return true;
      }

      if (!Array.isArray(ticketTypes)) {
        throw new Error('ticketTypes must be an array');
      }

      ticketTypes.forEach((type, index) => {
        if (!type || typeof type !== 'object') {
          throw new Error(`ticketTypes[${index}] must be an object`);
        }
        if (!type.name || typeof type.name !== 'string') {
          throw new Error(`ticketTypes[${index}].name is required`);
        }
        if (type.price === undefined || type.price === null || type.price === '') {
          throw new Error(`ticketTypes[${index}].price is required`);
        }
        const price = Number(type.price);
        if (Number.isNaN(price) || price < 0) {
          throw new Error(`ticketTypes[${index}].price must be a non-negative number`);
        }
        if (type.capacity !== undefined && type.capacity !== null && type.capacity !== '') {
          const capacity = Number(type.capacity);
          if (!Number.isInteger(capacity) || capacity < 0) {
            throw new Error(`ticketTypes[${index}].capacity must be a non-negative integer`);
          }
        }
      });

      return true;
    })
];

