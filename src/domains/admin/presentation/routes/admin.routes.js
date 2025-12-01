/**
 * Admin Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect, admin, superadmin } = require('../../../../middleware/authMiddleware');
const { apiLimiter, securityHeaders, sanitizeRequest } = require('../../../../middleware/securityMiddleware');

class AdminRoutes {
  constructor({ adminController }) {
    this.adminController = adminController;
  }

  getRoutes() {
    // Security
    router.use(securityHeaders);
    router.use(sanitizeRequest);

    // All admin routes require auth + admin role
    router.use(apiLimiter, protect);

    router.get('/health', admin, this.adminController.health);
    router.get('/users', admin, this.adminController.listUsers);
    router.post('/users', protect, superadmin, this.adminController.createUser);
    router.patch('/users/:id/role', superadmin, this.adminController.updateUserRole);

    return router;
  }
}

module.exports = AdminRoutes;


