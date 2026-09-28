/**
 * Group Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();

const { apiLimiter } = require('../../middleware/securityMiddleware');
const { protect, optionalAuth } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');
const {
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
  validateRemoveMember,
  validateInviteCode
} = require('./validators/groupValidators');

function createGroupRoutes(groupController) {
  // Group CRUD routes
  router.post(
    '/',
    apiLimiter,
    protect,
    validateCreateGroup,
    validate,
    groupController.createGroup
  );

  router.post(
    '/from-event',
    apiLimiter,
    protect,
    validateCreateGroupFromEvent,
    validate,
    groupController.createGroupFromEvent
  );

  router.get(
    '/',
    apiLimiter,
    protect,
    groupController.getUserGroups
  );

  router.get(
    '/my',
    apiLimiter,
    protect,
    groupController.getUserGroups
  );

  router.get(
    '/search',
    apiLimiter,
    protect,
    validateSearchGroups,
    validate,
    groupController.searchGroups
  );

  // Invite-link routes - static paths, registered before /:id below so
  // they're never shadowed by it (same ordering requirement as /search
  // and /my above).
  router.get(
    '/invite/:code',
    apiLimiter,
    optionalAuth,
    validateInviteCode,
    validate,
    groupController.getGroupPreviewByInviteCode
  );

  router.post(
    '/join/:code',
    apiLimiter,
    protect,
    validateInviteCode,
    validate,
    groupController.joinGroupByInviteCode
  );

  router.get(
    '/:id',
    apiLimiter,
    protect,
    validateMongoId,
    validate,
    groupController.getGroup
  );

  router.put(
    '/:id',
    apiLimiter,
    protect,
    validateMongoId,
    validateUpdateGroup,
    validate,
    groupController.updateGroup
  );

  router.delete(
    '/',
    apiLimiter,
    protect,
    ...validateDeleteGroup,
    validate,
    groupController.deleteGroup
  );

  router.post(
    '/:id/invite-code',
    apiLimiter,
    protect,
    validateMongoId,
    validate,
    groupController.generateInviteCode
  );

  // Member management routes
  router.post(
    '/:id/members',
    apiLimiter,
    protect,
    validateMongoId,
    validateAddMember,
    validate,
    groupController.addMember
  );

  router.delete(
    '/members',
    apiLimiter,
    protect,
    ...validateRemoveMember,
    validate,
    groupController.removeMember
  );

  router.put(
    '/:id/members/:memberId/role',
    apiLimiter,
    protect,
    validateMongoId,
    validateMemberId,
    validateUpdateMemberRole,
    validate,
    groupController.updateMemberRole
  );

  // Group event routes
  router.post(
    '/:id/events',
    apiLimiter,
    protect,
    validateMongoId,
    validateCreateGroupEvent,
    validate,
    groupController.createGroupEvent
  );

  return router;
}

module.exports = createGroupRoutes;

