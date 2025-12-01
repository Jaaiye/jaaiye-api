/**
 * Calendar Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const { protect } = require('../../../../middleware/authMiddleware');
const { apiLimiter, securityHeaders, sanitizeRequest } = require('../../../../middleware/securityMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
const {
  validateCreateCalendar,
  validateUpdateCalendar,
  validateLinkGoogleCalendars,
  validateSetPrimaryGoogleCalendar,
  validateLinkGoogleAccount,
  validateSelectGoogleCalendars,
  validateCreateCalendarMapping,
  validateListGoogleEvents,
  validateGetFreeBusy,
  validateGetUnifiedCalendar,
  validateGetMonthlyCalendar,
  validateBackfillSync,
  validateStartWatch,
  validateStopWatch,
  validateGetSharedCalendarView,
  validateDeleteCalendar
} = require('../validators/calendarValidators');

function createCalendarRoutes({ calendarController }) {
  const router = express.Router();

  // Apply security middleware
  router.use(securityHeaders);
  router.use(sanitizeRequest);
  router.use(protect);

  // ============================================================================
  // JAAIYE CALENDAR ROUTES
  // ============================================================================

  // Calendar CRUD
  router.post('/', validateCreateCalendar, validate, calendarController.createCalendar);
  router.get('/', calendarController.getCalendars);
  router.get('/:id', calendarController.getCalendar);
  router.put('/:id', validateUpdateCalendar, validate, calendarController.updateCalendar);
  router.delete('/', ...validateDeleteCalendar, validate, calendarController.deleteCalendar);

  // Calendar events (read-only for calendar context)
  router.get('/:calendarId/events', calendarController.getCalendarEvents);

  // Google mappings for calendar
  router.post('/:id/google/link', validateLinkGoogleCalendars, validate, calendarController.linkGoogleCalendars);
  router.put('/:id/google/primary', validateSetPrimaryGoogleCalendar, validate, calendarController.setPrimaryGoogleCalendar);

  // ============================================================================
  // GOOGLE OAUTH ROUTES
  // ============================================================================

  router.post('/google/link', apiLimiter, validateLinkGoogleAccount, validate, calendarController.linkGoogleAccount);
  router.post('/google/sync', apiLimiter, calendarController.syncCalendar);
  router.post('/google/refresh', apiLimiter, calendarController.refreshGoogleToken);
  router.delete('/google/link', apiLimiter, calendarController.unlinkGoogleAccount);

  // ============================================================================
  // GOOGLE CALENDAR ROUTES
  // ============================================================================

  router.get('/google/calendars', apiLimiter, calendarController.listGoogleCalendars);
  router.post('/google/calendars/select', apiLimiter, validateSelectGoogleCalendars, validate, calendarController.selectGoogleCalendars);
  router.post('/google/calendar-mapping', apiLimiter, validateCreateCalendarMapping, validate, calendarController.createCalendarMapping);
  router.get('/google/calendar-mapping', apiLimiter, calendarController.getCalendarMapping);

  // ============================================================================
  // GOOGLE EVENT ROUTES
  // ============================================================================

  router.post('/google/events', apiLimiter, validateListGoogleEvents, validate, calendarController.listGoogleEvents);
  router.post('/google/freebusy', apiLimiter, validateGetFreeBusy, validate, calendarController.getFreeBusy);

  // ============================================================================
  // UNIFIED CALENDAR ROUTES
  // ============================================================================

  router.get('/google/unified-calendar', apiLimiter, validateGetUnifiedCalendar, validate, calendarController.getUnifiedCalendar);
  router.get('/google/calendar/monthly/:year/:month', apiLimiter, validateGetMonthlyCalendar, validate, calendarController.getMonthlyCalendar);

  // ============================================================================
  // SYNC ROUTES
  // ============================================================================

  router.post('/google/sync/backfill', apiLimiter, validateBackfillSync, validate, calendarController.backfillSync);

  // ============================================================================
  // WATCH ROUTES
  // ============================================================================

  router.post('/google/watch/start', apiLimiter, validateStartWatch, validate, calendarController.startWatch);
  router.post('/google/watch/stop', apiLimiter, validateStopWatch, validate, calendarController.stopWatch);

  // ============================================================================
  // UTILITY ROUTES
  // ============================================================================

  router.get('/google/diagnostics', apiLimiter, calendarController.getDiagnostics);

  // ============================================================================
  // SHARED CALENDAR VIEW
  // ============================================================================

  router.post('/shared-view', apiLimiter, validateGetSharedCalendarView, validate, calendarController.getSharedCalendarView);

  return router;
}

module.exports = createCalendarRoutes;

