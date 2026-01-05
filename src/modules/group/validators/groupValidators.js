const { body, param, query } = require('express-validator');

const validateCreateGroup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array'),
  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid member ID format')
];

const validateCreateGroupFromEvent = [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('groupName')
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters')
];

const validateUpdateGroup = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('settings.allowMemberInvites')
    .optional()
    .isBoolean()
    .withMessage('allowMemberInvites must be boolean'),
  body('settings.allowMemberEventCreation')
    .optional()
    .isBoolean()
    .withMessage('allowMemberEventCreation must be boolean'),
  body('settings.defaultEventParticipation')
    .optional()
    .isIn(['auto_add', 'invite_only'])
    .withMessage('defaultEventParticipation must be either "auto_add" or "invite_only"')
];

const validateAddMember = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be either "admin" or "member"')
];

const validateUpdateMemberRole = [
  body('role')
    .isIn(['admin', 'member'])
    .withMessage('Role must be either "admin" or "member"')
];

const validateCreateGroupEvent = [
  body('title')
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Event title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('isAllDay')
    .optional()
    .isBoolean()
    .withMessage('isAllDay must be boolean'),
  body('participationMode')
    .optional()
    .isIn(['auto_add', 'invite_only'])
    .withMessage('participationMode must be either "auto_add" or "invite_only"')
];

const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid group ID format')
];

const validateMemberId = [
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID format')
];

const validateSearchGroups = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateDeleteGroup = [
  body('id')
    .notEmpty()
    .withMessage('Group ID is required')
    .isMongoId()
    .withMessage('Invalid group ID format')
];

const validateRemoveMember = [
  body('groupId')
    .notEmpty()
    .withMessage('Group ID is required')
    .isMongoId()
    .withMessage('Invalid group ID format'),
  body('memberId')
    .notEmpty()
    .withMessage('Member ID is required')
    .isMongoId()
    .withMessage('Invalid member ID format')
];

module.exports = {
  validateCreateGroup,
  validateCreateGroupFromEvent,
  validateUpdateGroup,
  validateAddMember,
  validateUpdateMemberRole,
  validateCreateGroupEvent,
  validateMongoId,
  validateMemberId,
  validateSearchGroups,
  validateDeleteGroup,
  validateRemoveMember
};

