/**
 * Notification Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();

const { apiLimiter } = require('../../middleware/securityMiddleware');
const { protect } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');
const {
  validateRegisterDeviceToken,
  validateRemoveDeviceToken
} = require('./validators/notificationValidators');

function createNotificationRoutes(notificationController) {
  // Device token management
  router.post(
    '/device-token',
    apiLimiter,
    protect,
    validateRegisterDeviceToken,
    validate,
    notificationController.registerDeviceToken
  );

  router.delete(
    '/device-token',
    apiLimiter,
    protect,
    validateRemoveDeviceToken,
    validate,
    notificationController.removeDeviceToken
  );

  // Notification management
  router.get(
    '/',
    apiLimiter,
    protect,
    notificationController.getNotifications
  );

  router.put(
    '/read',
    apiLimiter,
    protect,
    notificationController.markAsRead
  );

  router.delete(
    '/',
    apiLimiter,
    protect,
    notificationController.deleteNotifications
  );

  return router;
}

module.exports = createNotificationRoutes;

