/**
 * Group Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();

const { apiLimiter } = require('../../../../middleware/securityMiddleware');
const { protect } = require('../../../../middleware/authMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
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
  validateRemoveMember
} = require('../validators/groupValidators');

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
    '/search',
    apiLimiter,
    protect,
    validateSearchGroups,
    validate,
    groupController.searchGroups
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

