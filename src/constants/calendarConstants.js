/**
 * Calendar-related constants
 * These strings MUST remain unchanged to preserve API contracts with mobile clients
 */

const ERROR_MESSAGES = {
  CALENDAR_NOT_FOUND: 'Calendar not found',
  ACCESS_DENIED: 'Access denied',
  USER_HAS_CALENDAR: 'User already has a calendar',
  LINKED_IDS_ARRAY: 'linkedIds must be an array',
  PRIMARY_ID_REQUIRED: 'primaryId is required',
  PRIMARY_ID_INVALID: 'primaryId must be one of linkedIds'
};

const SUCCESS_MESSAGES = {
  CALENDAR_DELETED: 'Calendar deleted successfully'
};

const ACCESS_LEVELS = {
  OWNER: 'owner',
  SHARED: 'shared',
  PUBLIC: 'public'
};

const DEFAULT_QUERY_PARAMS = {
  PAGE: 1,
  PER_PAGE: 20,
  SORT_FIELD: 'startTime',
  SORT_ORDER: 1
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ACCESS_LEVELS,
  DEFAULT_QUERY_PARAMS
};

