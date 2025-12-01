/**
 * Analytics Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../../../middleware/authMiddleware');
const { apiLimiter, securityHeaders, sanitizeRequest } = require('../../../../middleware/securityMiddleware');

class AnalyticsRoutes {
  constructor({ analyticsController }) {
    this.analyticsController = analyticsController;
  }

  getRoutes() {
    router.use(securityHeaders);
    router.use(sanitizeRequest);
    router.use(apiLimiter, protect);

    router.get('/revenue', admin, this.analyticsController.revenue);
    router.get('/tickets', admin, this.analyticsController.tickets);
    router.get('/events', admin, this.analyticsController.events);
    router.get('/users', admin, this.analyticsController.users);
    router.get('/engagement', admin, this.analyticsController.engagement);

    return router;
  }
}

module.exports = AnalyticsRoutes;


