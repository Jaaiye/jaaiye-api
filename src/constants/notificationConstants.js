/**
 * Notification-related constants
 * These strings MUST remain unchanged to preserve API contracts with mobile clients
 */

const SUCCESS_MESSAGES = {
  TOKEN_REGISTERED: 'Device token registered successfully',
  TOKEN_REMOVED: 'Device token removed successfully',
  MARKED_AS_READ: 'Notification marked as read',
  MARKED_ALL_AS_READ: 'All notifications marked as read',
  DELETED: 'Notification deleted'
};

const ERROR_MESSAGES = {
  TOKEN_REGISTER_FAILED: 'Error registering device token',
  TOKEN_REMOVE_FAILED: 'Error removing device token',
  FETCH_FAILED: 'Error fetching notifications',
  MARK_READ_FAILED: 'Error marking notification as read',
  NOT_FOUND: 'Notification not found',
  DELETE_FAILED: 'Error deleting notification'
};

const NOTIFICATION_TYPES = {
  EVENT_INVITATION: 'event_invitation',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  GROUP_MEMBER_ADDED: 'group_member_added',
  CALENDAR_SHARE: 'calendar_share',
  CALENDAR_SHARE_ACCEPTED: 'calendar_share_accepted',
  CALENDAR_SHARE_DECLINED: 'calendar_share_declined',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed'
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10
};

module.exports = {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
  DEFAULT_PAGINATION
};

