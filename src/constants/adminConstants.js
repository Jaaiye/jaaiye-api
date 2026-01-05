/**
 * Admin-related constants
 * These strings MUST remain unchanged to preserve API contracts
 */

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Email, fullName and password are required',
  INVALID_ROLE: 'Invalid role',
  EMAIL_IN_USE: 'Email already in use',
  USER_NOT_FOUND: 'User not found'
};

const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully'
};

const VALID_ROLES = ['superadmin', 'admin', 'user', 'scanner'];

const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALID_ROLES,
  DEFAULT_PAGINATION
};

