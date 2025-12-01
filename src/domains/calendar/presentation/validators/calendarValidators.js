/**
 * Calendar Validators
 * Presentation layer - request validation
 */

const { body, query, param } = require('express-validator');

const validateCreateCalendar = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const validateUpdateCalendar = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('color')
    .optional()
    .isString()
    .withMessage('Color must be a string'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const validateLinkGoogleCalendars = [
  body('linkedIds')
    .isArray()
    .withMessage('linkedIds must be an array'),
  body('linkedIds.*')
    .isString()
    .withMessage('All linkedIds must be strings')
];

const validateSetPrimaryGoogleCalendar = [
  body('primaryId')
    .notEmpty()
    .isString()
    .withMessage('primaryId is required and must be a string')
];

const validateLinkGoogleAccount = [
  body('serverAuthCode')
    .notEmpty()
    .isString()
    .withMessage('serverAuthCode is required')
];

const validateSelectGoogleCalendars = [
  body('action')
    .isIn(['add', 'remove'])
    .withMessage('action must be "add" or "remove"'),
  body('calendarId')
    .notEmpty()
    .isString()
    .withMessage('calendarId is required')
];

const validateCreateCalendarMapping = [
  body('googleCalendarId')
    .notEmpty()
    .isString()
    .withMessage('googleCalendarId is required'),
  body('jaaiyeCalendarId')
    .notEmpty()
    .isString()
    .withMessage('jaaiyeCalendarId is required')
];

const validateListGoogleEvents = [
  body('timeMin')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMin is required and must be ISO 8601 format'),
  body('timeMax')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMax is required and must be ISO 8601 format'),
  body('includeAllDay')
    .optional()
    .isBoolean()
    .withMessage('includeAllDay must be a boolean'),
  body('maxResults')
    .optional()
    .isInt({ min: 1, max: 250 })
    .withMessage('maxResults must be between 1 and 250'),
  body('viewType')
    .optional()
    .isIn(['monthly', 'weekly', 'daily', 'list'])
    .withMessage('viewType must be one of: monthly, weekly, daily, list')
];

const validateGetFreeBusy = [
  body('timeMin')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMin is required and must be ISO 8601 format'),
  body('timeMax')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMax is required and must be ISO 8601 format'),
  body('calendarIds')
    .optional()
    .isArray()
    .withMessage('calendarIds must be an array'),
  body('calendarIds.*')
    .optional()
    .isString()
    .withMessage('All calendarIds must be strings')
];

const validateGetUnifiedCalendar = [
  query('timeMin')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMin is required and must be ISO 8601 format'),
  query('timeMax')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMax is required and must be ISO 8601 format'),
  query('includeJaaiye')
    .optional()
    .isBoolean()
    .withMessage('includeJaaiye must be a boolean'),
  query('includeGoogle')
    .optional()
    .isBoolean()
    .withMessage('includeGoogle must be a boolean'),
  query('viewType')
    .optional()
    .isIn(['monthly', 'weekly', 'daily', 'list'])
    .withMessage('viewType must be one of: monthly, weekly, daily, list')
];

const validateGetMonthlyCalendar = [
  param('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('year must be between 2000 and 2100'),
  param('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('month must be between 1 and 12'),
  query('includeJaaiye')
    .optional()
    .isBoolean()
    .withMessage('includeJaaiye must be a boolean'),
  query('includeGoogle')
    .optional()
    .isBoolean()
    .withMessage('includeGoogle must be a boolean')
];

const validateBackfillSync = [
  body('calendarId')
    .notEmpty()
    .isString()
    .withMessage('calendarId is required'),
  body('daysBack')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('daysBack must be between 1 and 365')
];

const validateStartWatch = [
  body('calendarId')
    .notEmpty()
    .isString()
    .withMessage('calendarId is required')
];

const validateStopWatch = [
  body('calendarId')
    .notEmpty()
    .isString()
    .withMessage('calendarId is required')
];

const validateGetSharedCalendarView = [
  body('userIds')
    .isArray()
    .withMessage('userIds is required and must be an array')
    .notEmpty()
    .withMessage('userIds array must not be empty'),
  body('userIds.*')
    .isString()
    .withMessage('All userIds must be strings')
    .notEmpty()
    .withMessage('All userIds must be non-empty strings'),
  body('timeMin')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMin is required and must be ISO 8601 format'),
  body('timeMax')
    .notEmpty()
    .isISO8601()
    .withMessage('timeMax is required and must be ISO 8601 format')
];

const validateDeleteCalendar = [
  body('id')
    .notEmpty()
    .withMessage('Calendar ID is required')
    .isMongoId()
    .withMessage('Invalid calendar ID format')
];

module.exports = {
  validateCreateCalendar,
  validateUpdateCalendar,
  validateLinkGoogleCalendars,
  validateSetPrimaryGoogleCalendar,
  validateLinkGoogleAccount,
  validateSelectGoogleCalendars,
  validateCreateCalendarMapping,
  validateListGoogleEvents,
  validateGetFreeBusy,
  validateGetUnifiedCalendar,
  validateGetMonthlyCalendar,
  validateBackfillSync,
  validateStartWatch,
  validateStopWatch,
  validateGetSharedCalendarView,
  validateDeleteCalendar
};

