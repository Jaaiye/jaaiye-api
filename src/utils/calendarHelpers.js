const { ForbiddenError, NotFoundError, BadRequestError } = require('./errors');
const { ERROR_MESSAGES } = require('../constants/calendarConstants');

/**
 * Verifies that a user owns a calendar
 * @param {Object} calendar - Calendar document
 * @param {string} userId - User ID to verify
 * @throws {ForbiddenError} If user is not the owner
 */
const verifyCalendarOwnership = (calendar, userId) => {
  if (calendar.owner.toString() !== userId) {
    throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
  }
};

/**
 * Verifies that a user has access to a calendar (owner, shared, or public)
 * @param {Object} calendar - Calendar document
 * @param {string} userId - User ID to verify
 * @throws {ForbiddenError} If user doesn't have access
 */
const verifyCalendarAccess = (calendar, userId) => {
  const isPublic = calendar.isPublic;
  const isOwner = calendar.owner.toString() === userId;
  const isShared = calendar.sharedWith && calendar.sharedWith.some(
    share => share.user.toString() === userId
  );

  if (!isPublic && !isOwner && !isShared) {
    throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
  }
};

/**
 * Builds event query filters from request parameters
 * @param {string} calendarId - Calendar ID
 * @param {Object} filters - Query filter parameters
 * @param {string} [filters.startDate] - Start date filter (ISO string)
 * @param {string} [filters.endDate] - End date filter (ISO string)
 * @param {string} [filters.category] - Category filter
 * @param {string} [filters.status] - Status filter
 * @returns {Object} MongoDB query object
 */
const buildEventQueryFilters = (calendarId, filters = {}) => {
  const { startDate, endDate, category, status } = filters;
  const query = { calendar: calendarId };

  if (startDate && endDate) {
    query.startTime = { $gte: new Date(startDate) };
    query.endTime = { $lte: new Date(endDate) };
  }

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  return query;
};

/**
 * Formats a calendar document for API response
 * Preserves exact field structure for mobile API contract
 * @param {Object} calendar - Calendar document
 * @returns {Object} Formatted calendar object
 */
const formatCalendarResponse = (calendar) => {
  if (!calendar) {
    return null;
  }

  return {
    id: calendar._id,
    name: calendar.name,
    description: calendar.description,
    color: calendar.color,
    isPublic: calendar.isPublic,
    owner: calendar.owner,
    sharedWith: calendar.sharedWith,
    createdAt: calendar.createdAt
  };
};

/**
 * Validates that linkedIds is an array of valid strings
 * @param {any} linkedIds - Value to validate
 * @throws {BadRequestError} If validation fails
 */
const validateLinkedIds = (linkedIds) => {
  if (!Array.isArray(linkedIds)) {
    throw new BadRequestError(ERROR_MESSAGES.LINKED_IDS_ARRAY);
  }
};

/**
 * Validates that primaryId is a non-empty string
 * @param {any} primaryId - Value to validate
 * @throws {BadRequestError} If validation fails
 */
const validatePrimaryId = (primaryId) => {
  if (!primaryId || typeof primaryId !== 'string') {
    throw new BadRequestError(ERROR_MESSAGES.PRIMARY_ID_REQUIRED);
  }
};

/**
 * Validates that primaryId exists in linkedIds array
 * @param {string} primaryId - Primary calendar ID
 * @param {string[]} linkedIds - Array of linked calendar IDs
 * @throws {BadRequestError} If primaryId not in linkedIds
 */
const validatePrimaryInLinked = (primaryId, linkedIds) => {
  const linkedSet = new Set(linkedIds || []);
  if (!linkedSet.has(primaryId)) {
    throw new BadRequestError(ERROR_MESSAGES.PRIMARY_ID_INVALID);
  }
};

/**
 * Sanitizes linkedIds array by filtering empty strings
 * @param {string[]} linkedIds - Array of calendar IDs
 * @returns {string[]} Sanitized array of valid IDs
 */
const sanitizeLinkedIds = (linkedIds) => {
  return linkedIds.filter(id => typeof id === 'string' && id.trim().length > 0);
};

module.exports = {
  verifyCalendarOwnership,
  verifyCalendarAccess,
  buildEventQueryFilters,
  formatCalendarResponse,
  validateLinkedIds,
  validatePrimaryId,
  validatePrimaryInLinked,
  sanitizeLinkedIds
};

