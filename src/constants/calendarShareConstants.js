/**
 * Calendar sharing-related constants
 * These strings MUST remain unchanged to preserve API contracts with mobile clients
 */

const ERROR_MESSAGES = {
  CALENDAR_NOT_FOUND: 'Calendar not found',
  USER_NOT_FOUND: 'User not found',
  ALREADY_SHARED: 'Calendar already shared with this user',
  SHARE_NOT_FOUND: 'Share request not found',
  SHARE_REMOVED: 'Share removed successfully'
};

const NOTIFICATION_TITLES = {
  SHARE_REQUEST: 'Calendar Share Request',
  SHARE_ACCEPTED: 'Calendar Share Accepted',
  SHARE_DECLINED: 'Calendar Share Declined'
};

const NOTIFICATION_TYPES = {
  SHARE: 'calendar_share',
  SHARE_ACCEPTED: 'calendar_share_accepted',
  SHARE_DECLINED: 'calendar_share_declined'
};

const SHARE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
};

const PERMISSION_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
};

module.exports = {
  ERROR_MESSAGES,
  NOTIFICATION_TITLES,
  NOTIFICATION_TYPES,
  SHARE_STATUS,
  PERMISSION_LEVELS
};

