/**
 * Analytics Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const { apiLimiter, securityHeaders, sanitizeRequest } = require('../../middleware/securityMiddleware');

class AnalyticsRoutes {
  constructor({ analyticsController }) {
    this.analyticsController = analyticsController;
  }

  getRoutes() {
    router.use(securityHeaders);
    router.use(sanitizeRequest);
    // Note: apiLimiter is applied per-route to avoid double counting with global limiter
    // The global limiter in index.js already applies to all routes
    router.use(protect);

    // Apply apiLimiter per route to avoid double counting with global limiter
    router.get('/revenue', apiLimiter, admin, this.analyticsController.revenue);
    router.get('/tickets', apiLimiter, admin, this.analyticsController.tickets);
    router.get('/events', apiLimiter, admin, this.analyticsController.events);
    router.get('/users', apiLimiter, admin, this.analyticsController.users);
    router.get('/engagement', apiLimiter, admin, this.analyticsController.engagement);

    return router;
  }
}

module.exports = AnalyticsRoutes;


