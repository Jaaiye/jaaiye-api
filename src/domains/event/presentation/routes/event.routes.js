/**
 * Event Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();

const { apiLimiter } = require('../../../../middleware/securityMiddleware');
const { protect, optionalAuth } = require('../../../../middleware/authMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
const {
  validateCreateEvent,
  validateUpdateEvent,
  validateAddParticipants,
  validateUpdateParticipantStatus,
  validateEventId,
  validateDeleteEvent,
  validateRemoveParticipant
} = require('../validators/eventValidators');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

function createEventRoutes(eventController) {
  // Event CRUD
  router.post(
    '/',
    apiLimiter,
    protect,
    upload.single('image'),
    validateCreateEvent,
    validate,
    eventController.createEvent
  );

  router.get(
    '/:id',
    validateEventId,
    validate,
    eventController.getEvent
  );

  router.put(
    '/:id',
    apiLimiter,
    protect,
    validateEventId,
    validateUpdateEvent,
    validate,
    eventController.updateEvent
  );

  router.delete(
    '/',
    apiLimiter,
    protect,
    ...validateDeleteEvent,
    validate,
    eventController.deleteEvent
  );

  router.get(
    '/',
    apiLimiter,
    optionalAuth,
    eventController.listEvents
  );

  // Participant management
  router.post(
    '/:id/participants',
    apiLimiter,
    protect,
    validateEventId,
    validateAddParticipants,
    validate,
    eventController.addParticipants
  );

  router.put(
    '/:id/participants/status',
    apiLimiter,
    protect,
    validateEventId,
    validateUpdateParticipantStatus,
    validate,
    eventController.updateParticipantStatus
  );

  router.delete(
    '/participants',
    apiLimiter,
    protect,
    ...validateRemoveParticipant,
    validate,
    eventController.removeParticipant
  );

  // Ticket type management
  router.post(
    '/:id/ticket-types',
    apiLimiter,
    protect,
    validateEventId,
    validate,
    eventController.addTicketType
  );

  router.get(
    '/:id/ticket-types/available',
    apiLimiter,
    validateEventId,
    validate,
    eventController.getAvailableTicketTypes
  );

  // Image management
  router.put(
    '/:id/image',
    apiLimiter,
    protect,
    upload.single('image'),
    validateEventId,
    validate,
    eventController.updateEventImage
  );

  return router;
}

module.exports = createEventRoutes;

